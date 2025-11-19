import { useRef, useState, useEffect, type RefObject } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { VOICE_MAP } from "../utils/voiceMap";
import type { AccentKey, GenderKey } from "../utils/voiceMap";

type AudioMode = "headphones" | "speakers";

export function useTextToSpeech(
  selectedAccent: AccentKey | "",
  selectedGender: GenderKey,
  AZURE_KEY: string | undefined,
  AZURE_REGION: string | undefined,
  audioMode: AudioMode,
  preGainRef: RefObject<GainNode | null>
) {
  /** TTS playback via Web Audio */
  const playCtxRef = useRef<AudioContext | null>(null);
  const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  /** TTS de-dup guards */
  const lastUtteranceRef = useRef<string>("");
  const recentSetRef = useRef<string[]>([]);

  /** Speaker voice assignment */
  const speakerVoiceMap = useRef<Record<string, string>>({});
  const voiceIndexRef = useRef<number>(0);

  /** Sentence buffer per-speaker*/
  const bufferRef = useRef<Record<string, string>>({});

  const normalize = (s: string) =>
    s.toLowerCase().replace(/\s+/g, " ").replace(/[^\S\r\n]/g, " ").trim();

  /** Assign a unique voice to each speaker */
  function assignVoiceForSpeaker(speaker: string): string {
    if (!selectedAccent) return "";

    if (speakerVoiceMap.current[speaker]) {
      return speakerVoiceMap.current[speaker];
    }

    const voiceBank = VOICE_MAP[selectedAccent][selectedGender];
    if (!voiceBank) return "";

    const voiceIndex = voiceIndexRef.current % voiceBank.length;
    const assignedVoice = voiceBank[voiceIndex];

    speakerVoiceMap.current[speaker] = assignedVoice;
    voiceIndexRef.current += 1;

    console.log(`Assigned voice ${assignedVoice} to ${speaker}`);
    return assignedVoice;
  }

  /** Azure TTS -> ArrayBuffer */
  async function synthToBuffer(
    text: string,
    voiceName: string
  ): Promise<ArrayBuffer> {
    if (!AZURE_KEY || !AZURE_REGION) throw new Error("Missing Azure config");
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      AZURE_KEY,
      AZURE_REGION
    );
    speechConfig.speechSynthesisVoiceName = voiceName;

    const outStream = sdk.AudioOutputStream.createPullStream();
    const audioConfig = sdk.AudioConfig.fromStreamOutput(outStream);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    return await new Promise<ArrayBuffer>((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (r) => {
          try {
            synthesizer.close();
          } catch (closeErr) {
            console.warn("Failed to close synthesizer after success:", closeErr);
          }
          if (r.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(r.audioData as ArrayBuffer);
          } else {
            reject(r.errorDetails || "Azure TTS failed");
          }
        },
        (err) => {
          try {
            synthesizer.close();
          } catch (closeErr) {
            console.warn("Failed to close synthesizer after error:", closeErr);
          }
          reject(err);
        }
      );
    });
  }

  /** Speak one sentence with de-dup + queue */
  async function speakSentence(sentence: string, speaker: string) {
    // Strip low-confidence placeholders like [ __ ]
    const cleanedSentence = sentence
        .replace(/\[\s*__\s*\]/g, "") // remove [ __ ] with optional spaces
        .replace(/\s+/g, " ")         // collapse extra spaces
        .trim();

    // If nothing meaningful remains, skip TTS
    if (!cleanedSentence) return;

    // Use cleaned sentence for de-duplication
    const norm = normalize(cleanedSentence);
    if (!norm) return;

    if (norm === lastUtteranceRef.current) {
        return;
    }
    if (recentSetRef.current.includes(norm)) {
        return;
    }

    // Check for substring matches (catches fragmented duplicates)
    if (recentSetRef.current.some(prev =>
      norm.includes(prev) || prev.includes(norm)
    )) {
      console.log(`Filtered fragment duplicate: "${cleanedSentence}"`);
      return;
    }

    // Non-blocking TTS synthesis - audioQueue handles ordering
    const voice = assignVoiceForSpeaker(speaker);
    if (!voice) return;

    // Update dedup state immediately (before async TTS completes)
    lastUtteranceRef.current = norm;
    recentSetRef.current = [...recentSetRef.current.slice(-4), norm];

    // Send cleaned text to Azure TTS (no [ __ ] spoken)
    try {
      const buf = await synthToBuffer(cleanedSentence, voice);
      setAudioQueue((q) => [...q, buf]);
    } catch (err) {
      console.error("TTS synthesis failed:", err);
    }
  }

  /** Playback loop (Web Audio) with microphone control */
  useEffect(() => {
    (async () => {
      if (isPlaying || audioQueue.length === 0) return;

      if (!playCtxRef.current) {
        const AudioContextCtor = window.AudioContext ||
          (window as Window & {
            webkitAudioContext?: typeof AudioContext;
          }).webkitAudioContext;
        if (!AudioContextCtor) {
          console.error("Web Audio API not supported in this browser");
          return;
        }
        playCtxRef.current = new AudioContextCtor();
      }
      
      const ctx = playCtxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch (err) {
          console.warn("Failed to resume AudioContext:", err);
        }
      }

      setIsPlaying(true);

      // Speaker Mode: Mute microphone during playback to prevent echo
      if (audioMode === "speakers" && preGainRef.current) {
        preGainRef.current.gain.value = 0.0;
      }

      const wavBytes = audioQueue[0];
      try {
        const audioBuf = await ctx.decodeAudioData(wavBytes.slice(0));

        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(ctx.destination);

        src.onended = () => {
          // When playback ends, restore microphone (in speaker mode)
          if (audioMode === "speakers" && preGainRef.current) {
            preGainRef.current.gain.value = 1.2;
          }
          setAudioQueue((prev) => prev.slice(1));
          setIsPlaying(false);
        };

        const startAt = ctx.currentTime + 0.03;
        src.start(startAt);
      } catch (e) {
        console.error("Audio decode error:", e);
        // Restore microphone on error
        if (audioMode === "speakers" && preGainRef.current) {
          preGainRef.current.gain.value = 1.2;
        }
        setAudioQueue((prev) => prev.slice(1));
        setIsPlaying(false);
      }
    })();
  }, [audioQueue, isPlaying, audioMode, preGainRef]);

  /** Handle final chunk and extract sentences */
  async function handleFinalChunk(text: string, speaker: string) {
    // Initialize speaker buffer if doesn't exist
    if (!bufferRef.current[speaker]) {
      bufferRef.current[speaker] = "";
    }

    bufferRef.current[speaker] = (bufferRef.current[speaker] + " " + text).trim();

    if (/[.!?]$/.test(text)) {
      const tmp = bufferRef.current[speaker];
      bufferRef.current[speaker] = "";

      const re = /([^.!?]+[.!?])\s*/g;
      let lastEnd = 0;
      let m: RegExpExecArray | null;
      const sentences: string[] = [];

      while ((m = re.exec(tmp)) !== null) {
        const sent = m[1].trim();
        if (sent) {
          sentences.push(sent);
        }
        lastEnd = re.lastIndex;
      }

      for (const sent of sentences) {
        await speakSentence(sent, speaker);
      }

      const remaining = tmp.slice(lastEnd).trim();
      if (remaining) {
        bufferRef.current[speaker] = remaining;
      }
    }
  }

  /** Flush remaining buffer for a specific speaker */
  async function flushBuffer(speaker: string) {
    const tail = (bufferRef.current[speaker] || "").trim();
    if (tail) {
      await speakSentence(tail, speaker);
    }
    bufferRef.current[speaker] = "";
  }

  /** Reset TTS state */
  function resetTTS() {
    lastUtteranceRef.current = "";
    recentSetRef.current = [];
    speakerVoiceMap.current = {};
    voiceIndexRef.current = 0;
    bufferRef.current = {};
    setAudioQueue([]);
  }

  return {
    speakSentence,
    handleFinalChunk,
    flushBuffer,
    resetTTS,
    speakerVoiceMap,
  };
}