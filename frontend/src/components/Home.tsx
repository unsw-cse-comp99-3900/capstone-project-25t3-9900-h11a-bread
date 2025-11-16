import { useState, useRef, useEffect } from "react";
import Header from "./Header";
import AccentDropdown from "./AccentDropdown";
import { Download } from "lucide-react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { useTranscripts } from "../hooks/useTranscripts";
import { useAuth } from "../hooks/useAuth";
import { useSpeechToText } from "../hooks/useSpeechToText";

/* ---------- Azure voice map ---------- */
const VOICE_MAP = {
  American: {
    male: [
      "en-US-GuyNeural",
      "en-US-BrianNeural",
      "en-US-JasonNeural",
      "en-US-BrandonNeural",
      "en-US-ChristopherNeural",
    ],
    female: [
      "en-US-JennyNeural",
      "en-US-AriaNeural",
      "en-US-AnaNeural",
      "en-US-JaneNeural",
      "en-US-CoraNeural",
    ],
  },
  British: {
    male: [
      "en-GB-RyanNeural",
      "en-GB-AlfieNeural",
      "en-GB-ElliotNeural",
      "en-GB-EthanNeural",
      "en-GB-OliverNeural",
    ],
    female: [
      "en-GB-LibbyNeural",
      "en-GB-SoniaNeural",
      "en-GB-AbbiNeural",
      "en-GB-BellaNeural",
      "en-GB-HollieNeural",
    ],
  },
  Australian: {
    male: [
      "en-AU-WilliamNeural",
      "en-AU-KenNeural",
      "en-AU-DarrenNeural",
      "en-AU-TimNeural",
      "en-AU-DuncanNeural",
    ],
    female: [
      "en-AU-NatashaNeural",
      "en-AU-AnnetteNeural",
      "en-AU-TinaNeural",
      "en-AU-FreyaNeural",
      "en-AU-JoanneNeural",
    ],
  },
  Indian: {
    male: [
      "en-IN-PrabhatNeural",
      "en-IN-ArjunNeural",
      "en-IN-AaravNeural",
      "en-IN-KunalNeural",
      "en-IN-RehaanNeural",
    ],
    female: [
      "en-IN-NeerjaNeural",
      "en-IN-AnanyaNeural",
      "en-IN-AartiNeural",
      "en-IN-AashiNeural",
      "en-IN-KavyaNeural",
    ],
  },
} as const;

type AccentKey = keyof typeof VOICE_MAP;
type GenderKey = "male" | "female";

const Home: React.FC = () => {
  /** Auth and Transcripts */
  const { user } = useAuth();
  const { addTranscript } = useTranscripts(user);

  /** UI / state */
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState("");

  /** Transcript (single speaker run) */
  const [lines, setLines] = useState<Array<{ speaker: string; text: string }>>(
    []
  );

  /** STT Hook */
  const {
    startRecording: startSTT,
    stopRecording: stopSTT,
  } = useSpeechToText();

  /** Selection */
  const [selectedAccent, setSelectedAccent] = useState<AccentKey | "">("");
  const [selectedGender, setSelectedGender] = useState<GenderKey>("male");

  /** TTS playback via Web Audio (separate context for output) */
  const playCtxRef = useRef<AudioContext | null>(null);
  const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  /** TTS de-dup guards */
  const lastUtteranceRef = useRef<string>("");
  const recentSetRef = useRef<string[]>([]); // rolling window

  /** Speaker voice assignment */
  const speakerVoiceMap = useRef<Record<string, string>>({});
  const voiceIndexRef = useRef<number>(0);

  /** ENV */
  const API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY as
    | string
    | undefined;
  const AZURE_REGION = import.meta.env.VITE_AZURE_REGION as string | undefined;
  const AZURE_KEY = import.meta.env.VITE_AZURE_SPEECH_API_KEY as
    | string
    | undefined;

  /** Helpers */
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\S\r\n]/g, " ")
      .trim();

  /** Assign a unique voice to each speaker */
  function assignVoiceForSpeaker(speaker: string): string {
    if (!selectedAccent) return "";

    // Check if this speaker already has a voice assigned
    if (speakerVoiceMap.current[speaker]) {
      return speakerVoiceMap.current[speaker];
    }

    // Assign a new voice from the pool
    const voiceBank = VOICE_MAP[selectedAccent][selectedGender];
    if (!voiceBank) return "";

    const voiceIndex = voiceIndexRef.current % voiceBank.length;
    const assignedVoice = voiceBank[voiceIndex];

    speakerVoiceMap.current[speaker] = assignedVoice;
    voiceIndexRef.current += 1;

    console.log(`Assigned voice ${assignedVoice} to ${speaker}`);
    return assignedVoice;
  }

  /** Azure TTS -> ArrayBuffer (no auto-play) */
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

    // Route audio to a stream (prevents SDK auto-playing to speakers)
    const outStream = sdk.AudioOutputStream.createPullStream();
    const audioConfig = sdk.AudioConfig.fromStreamOutput(outStream);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    return await new Promise<ArrayBuffer>((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (r) => {
          try {
            synthesizer.close();
          } catch {}
          if (r.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            // r.audioData is an ArrayBuffer of WAV bytes
            resolve(r.audioData as ArrayBuffer);
          } else {
            reject(r.errorDetails || "Azure TTS failed");
          }
        },
        (err) => {
          try {
            synthesizer.close();
          } catch {}
          reject(err);
        }
      );
    });
  }

  const cleanPunctuation = (s: string) =>
    s
      // remove spaces before punctuation
      .replace(/\s+([.,!?;:])/g, "$1")
      // no space after opening bracket
      .replace(/\(\s+/g, "(")
      // no space before closing bracket
      .replace(/\s+\)/g, ")")
      // collapse multiple spaces
      .replace(/\s+/g, " ")
      .trim();

  /** Speak one sentence with de-dup + queue */
  const ttsBusyRef = useRef(false);
  async function speakSentence(sentence: string, speaker: string) {
    const norm = normalize(sentence);
    if (!norm) return;

    if (norm === lastUtteranceRef.current) {
      return;
    }
    if (recentSetRef.current.includes(norm)) {
      return;
    }

    // serialize synthesis to avoid overlaps / race
    while (ttsBusyRef.current) await new Promise((r) => setTimeout(r, 5));
    ttsBusyRef.current = true;
    try {
      const voice = assignVoiceForSpeaker(speaker); // Use speaker-specific voice
      if (!voice) return;
      const buf = await synthToBuffer(sentence, voice);
      setAudioQueue((q) => [...q, buf]);

      lastUtteranceRef.current = norm;
      recentSetRef.current = [...recentSetRef.current.slice(-4), norm];
    } finally {
      ttsBusyRef.current = false;
    }
  }

  /** Playback loop (Web Audio) */
  useEffect(() => {
    (async () => {
      if (isPlaying || audioQueue.length === 0) return;

      // Ensure playback context exists (separate from capture)
      if (!playCtxRef.current) {
        playCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = playCtxRef.current;
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {}
      }

      setIsPlaying(true);

      const wavBytes = audioQueue[0];
      try {
        const audioBuf = await ctx.decodeAudioData(
          wavBytes.slice(0) // pass a copy
        );

        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(ctx.destination);

        src.onended = () => {
          setAudioQueue((prev) => prev.slice(1));
          setIsPlaying(false);
        };

        // Start precisely at the next stable tick
        const startAt = ctx.currentTime + 0.03; // ~30ms preroll
        src.start(startAt);
      } catch (e) {
        console.error("Audio decode error:", e);
        // On decode error, drop this item to keep pipeline moving
        setAudioQueue((prev) => prev.slice(1));
        setIsPlaying(false);
      }
    })();
  }, [audioQueue, isPlaying]);

  /** Sentence buffering (finals only) */
  const bufferRef = useRef<string>("");

  async function handleFinalChunk(
    text: string,
    speaker: string,
    _resultId?: string
  ) {

    // Append to transcript with speaker diarization
    setLines((prev) => {
      if (prev.length) {
        const last = prev[prev.length - 1];
        // If same speaker, merge the text
        if (last.speaker === speaker) {
          const merged = {
            speaker,
            text: cleanPunctuation(`${last.text} ${text}`),
          };
          const clone = [...prev];
          clone[clone.length - 1] = merged;
          return clone;
        }
        // Different speaker, add new line
        return [...prev, { speaker, text: text.trim() }];
      }
      return [{ speaker, text: cleanPunctuation(text) }];
    });

    // Add to buffer
    bufferRef.current = (bufferRef.current + " " + text).trim();

    // If we just received sentence-ending punctuation, split and speak ALL complete sentences
    if (/[.!?]$/.test(text)) {
      const tmp = bufferRef.current;

      // IMMEDIATELY clear the buffer before processing to prevent next word contamination
      bufferRef.current = "";

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

      // Speak all complete sentences with speaker info (fire-and-forget, non-blocking)
      for (const sent of sentences) {
        speakSentence(sent, speaker);
      }

      // Restore any incomplete text to buffer (should be empty in most cases)
      const remaining = tmp.slice(lastEnd).trim();
      if (remaining) {
        bufferRef.current = remaining;
      }
    }
  }

  /** Start Recording - 使用STT Hook */
  const startRecording = async () => {
      setHasStarted(true);
      setLines([]);
      bufferRef.current = "";
      lastUtteranceRef.current = "";
      recentSetRef.current = [];
    speakerVoiceMap.current = {};
    voiceIndexRef.current = 0;
      setAudioQueue([]);

    const API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY as string | undefined;

    await startSTT(
      API_KEY,
      async (piece: string, speaker: string, resultId: string) => {
            await handleFinalChunk(piece, speaker, resultId);
      },
      (errorMsg: string) => {
        setError(errorMsg);
      },
      () => {
          const tail = bufferRef.current.trim();
          if (tail) {
            const lastSpeaker = lines[lines.length - 1]?.speaker || "S1";
            speakSentence(tail, lastSpeaker);
          }
          bufferRef.current = "";
      },
      setIsLoading,
      setIsRecording,
      setError
    );
  };

  /** Stop Recording - 使用STT Hook */
  const stopRecording = () => {
    stopSTT(setIsRecording, setError);
  };

  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording();
      // Save transcript to Firebase when stopping
      const combinedTranscript = lines
        .map((l) => `${l.speaker}: ${l.text}`)
        .join("\n");
      if (combinedTranscript.trim()) {
        addTranscript(combinedTranscript);
      }
    } else {
      startRecording();
    }
  };

  const handleDownload = () => {
    const combinedTranscript = lines
      .map((l) => `${l.speaker}: ${l.text}`)
      .join("\n");
    const blob = new Blob([combinedTranscript], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transcript.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <Header />

      <main className="p-32 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-md p-10 w-[320px] h-[580px] flex flex-col items-center justify-center">
          <AccentDropdown
            selectedAccent={selectedAccent}
            selectedGender={selectedGender}
            onAccentChange={(accent) => {
              setSelectedAccent(accent as AccentKey);
              lastUtteranceRef.current = "";
              recentSetRef.current = [];
              speakerVoiceMap.current = {}; // Reset when accent changes
              voiceIndexRef.current = 0;
            }}
            onGenderChange={(g) => {
              setSelectedGender(g as GenderKey);
              lastUtteranceRef.current = "";
              recentSetRef.current = [];
              speakerVoiceMap.current = {}; // Reset when gender changes
              voiceIndexRef.current = 0;
            }}
          />

          <div className="h-full">
            <button
              onClick={handleButtonClick}
              disabled={isLoading || !selectedAccent}
              className={`relative w-40 h-40 rounded-full text-white text-2xl font-semibold shadow-lg transition-all mt-30
                ${
                  isLoading || !selectedAccent
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#77A4F7] hover:bg-blue-400"
                }`}
              title={!selectedAccent ? "Select accent first" : ""}
            >
              {/* floating ring 1 */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border border-[#A4B8D3] ring-base ring-1"
              />
              {/* floating ring 2 */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-1.5 rounded-full border border-[#B6C3F1] ring-base ring-2"
              />

              <span className="relative z-10">
                {isLoading ? "Loading" : isRecording ? "Stop" : "Start"}
              </span>

              {/* local styles */}
              <style>
                {`
      .ring-base { transform-origin: center; }
      .ring-1 { animation: btn-float-1 3s ease-in-out infinite; }
      .ring-2 { animation: btn-float-2 2s ease-in-out infinite, btn-spin 28s linear infinite; }

      @keyframes btn-float-1 {
        0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
        50%  { transform: translate(6px, -8px) scale(1.03) rotate(6deg); }
        75%  { transform: translate(3px, -8px) scale(1.03) rotate(6deg); }
        100% { transform: translate(0, 0) scale(1) rotate(0deg); }
      }
      @keyframes btn-float-2 {
        0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
        50%  { transform: translate(-6px, 8px) scale(0.985) rotate(-6deg); }
        75%  { transform: translate(-3px, -8px) scale(1.03) rotate(6deg); }
        100% { transform: translate(0, 0) scale(1) rotate(0deg); }
      }
      @keyframes btn-spin {
        to { transform: rotate(360deg); }
      }

      /* Respect reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .ring-1, .ring-2 { animation: none !important; }
      }
    `}
              </style>
            </button>
          </div>
        </div>

        {hasStarted && (
          <div className="w-[500px] h-[580px] mt-[52px] flex flex-col overflow-hidden justify-between">
            <div>
              <div className="pb-2 px-10">
                <p className="text-gray-700 text-lg font-semibold">
                  Transcript
                </p>
              </div>
              <div className="h-[420px] overflow-y-auto px-10 leading-relaxed">
                {lines.length === 0 ? (
                  <p className="text-gray-500">…listening</p>
                ) : (
                  lines.map((line, idx) => {
                    // Assign colors based on speaker
                    const speakerColors: Record<string, string> = {
                      S1: "text-blue-700",
                      S2: "text-green-700",
                      S3: "text-purple-700",
                      S4: "text-orange-700",
                    };
                    const speakerColor =
                      speakerColors[line.speaker] || "text-gray-700";

                    // Get assigned voice for this speaker
                    const assignedVoice = speakerVoiceMap.current[line.speaker];
                    const voiceLabel = assignedVoice
                      ? assignedVoice.replace(/^.*-([A-Za-z]+)Neural$/, "$1")
                      : "";

                    return (
                      <div key={idx} className="mb-3">
                        <span className={`font-semibold ${speakerColor}`}>
                          {line.speaker}
                          {voiceLabel && (
                            <span className="text-xs ml-1 opacity-60">
                              ({voiceLabel})
                            </span>
                          )}
                          :
                        </span>{" "}
                        <span className="text-gray-700">{line.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {!isRecording && (
              <div className="px-10 pb-4">
                <button
                  className="w-[250px] bg-[#77A4F7] text-white text-sm px-4 py-2 rounded-full hover:bg-blue-400 transition flex items-center gap-2 justify-center ml-auto"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                  Save Transcript
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default Home;
