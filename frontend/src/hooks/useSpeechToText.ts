import { useRef, type RefObject } from "react";
import { RealtimeClient } from "@speechmatics/real-time-client";
import { createSpeechmaticsJWT } from "@speechmatics/auth";

export function useSpeechToText(preGainRef: RefObject<GainNode | null>  // Accept preGainRef as parameter
) {
  /** STT runtime */
  const clientRef = useRef<RealtimeClient | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const processedFinalIds = useRef<Set<string>>(new Set());

  /** Start Recording */
  const startRecording = async (
    API_KEY: string | undefined,
    onTranscriptReceived: (piece: string, speaker: string, resultId: string) => void | Promise<void>,
    onError: (error: string) => void,
    onEndOfTranscript: () => void,
    setIsLoading: (loading: boolean) => void,
    setIsRecording: (recording: boolean) => void,
    setError: (error: string) => void
  ) => {
    try {
      setIsLoading(true);
      setError("");
      processedFinalIds.current.clear();

      if (!API_KEY) throw new Error("Missing Speechmatics API key");

      const client = new RealtimeClient();
      clientRef.current = client;

      client.addEventListener("receiveMessage", async ({ data }: { data: any }) => {
        if (data.message === "AddTranscript") {
          for (const r of data.results) {
            if ((r as any).is_partial === true) {
              continue;
            }

            const alternative = r.alternatives?.[0];
            if (!alternative) continue;

            const CONFIDENCE_THRESHOLD = 0.7;
            
            // Speechmatics returns word-level results (type: "word")
            // Check confidence for each word
            const confidence = alternative.confidence;
            const content = alternative.content || "";
            
            // If confidence is below threshold, replace with [ __ ]
            let processedText = content;
            if (confidence !== undefined && confidence < CONFIDENCE_THRESHOLD) {
              processedText = "[ __ ]";
              console.log(`Low confidence word replaced: "${content}" (${(confidence * 100).toFixed(0)}%) -> [ __ ]`);
            }

            const piece = processedText.trim();
            if (!piece) continue;

            const speaker = alternative.speaker || "S1";
            const resultId = `${r.start_time || 0}-${r.end_time || 0}-${speaker}-${piece}`;

            if (processedFinalIds.current.has(resultId)) {
              continue;
            }
            processedFinalIds.current.add(resultId);
            
            if (processedFinalIds.current.size > 100) {
              const arr = Array.from(processedFinalIds.current);
              processedFinalIds.current = new Set(arr.slice(-100));
            }

            await onTranscriptReceived(piece, speaker, resultId);
          }
        } else if (data.message === "Error") {
          console.error("Speechmatics error:", data);
          const errorMsg = `Speechmatics error: ${data.type} ${data.reason || ""}`;
          setError(errorMsg);
          onError(errorMsg);
          stopRecording(setIsRecording, setError);
        } else if (data.message === "EndOfTranscript") {
          onEndOfTranscript();
        }
      });

      const jwt = await createSpeechmaticsJWT({
        type: "rt" as "rt",
        apiKey: API_KEY!,
        ttl: 3600,
      });

      await client.start(jwt, {
        audio_format: {
          type: "raw",
          encoding: "pcm_s16le",
          sample_rate: 16000,
        },
        transcription_config: {
          language: "en",
          operating_point: "enhanced",
          max_delay: 3.0,
          enable_partials: false,
          diarization: "speaker",
          speaker_diarization_config: {
            max_speakers: 5,
          },
          transcript_filtering_config: { remove_disfluencies: true },
        },
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const ac = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = ac;
      await ac.audioWorklet.addModule("/audio-processor.js");

      const source = ac.createMediaStreamSource(stream);

      const preGain = ac.createGain();
      preGain.gain.value = 1.2;
      preGainRef.current = preGain;

      const node = new AudioWorkletNode(ac, "audio-processor");
      workletNodeRef.current = node;
      node.port.onmessage = (e) => {
        if (clientRef.current) {
          try {
            clientRef.current.sendAudio(e.data);
          } catch (err) {
            console.error("Error sending audio:", err);
          }
        }
      };

      source.connect(preGain);
      preGain.connect(node);

      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(
        `Failed to start recording: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  /** Stop Recording */
  const stopRecording = (setIsRecording: (recording: boolean) => void, setError: (error: string) => void) => {
    try {
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current = null;
      }
      if (preGainRef.current) {
        preGainRef.current.disconnect();
        preGainRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.stopRecognition({ noTimeout: true });
        clientRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsRecording(false);
    } catch (err) {
      console.error("Error stopping recording:", err);
      setError(
        `Failed to stop recording: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  return {
    startRecording,
    stopRecording,
  };
}

