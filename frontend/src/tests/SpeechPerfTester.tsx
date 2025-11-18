// frontend/src/tests/SpeechPerfTester.tsx
import React, { useRef, useState } from "react";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import type { AccentKey, GenderKey } from "../utils/voiceMap";

export const SpeechPerfTester: React.FC = () => {
  const preGainRef = useRef<GainNode | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // For simplicity in test: fixed accent/gender & audio mode
  const selectedAccent: AccentKey | "" = "American"; // adjust to your VOICE_MAP
  const selectedGender: GenderKey = "female"; // or "male"
  const audioMode: "headphones" | "speakers" = "headphones";

  const AZURE_KEY = import.meta.env.VITE_AZURE_TTS_KEY as string | undefined;
  const AZURE_REGION = import.meta.env.VITE_AZURE_TTS_REGION as
    | string
    | undefined;
  const STT_API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY as
    | string
    | undefined;

  // Map: chunkId (resultId from STT) -> when that chunk was received
  const chunkTimesRef = useRef<Map<string, number>>(new Map());

  // TTS hook with playback callback
  const { handleFinalChunk, flushBuffer, resetTTS } = useTextToSpeech(
    selectedAccent,
    selectedGender,
    AZURE_KEY,
    AZURE_REGION,
    audioMode,
    preGainRef,
    // onPlaybackStart
    ({ chunkId, text, playbackScheduledAtMs }) => {
      if (!chunkId) {
        console.log("[E2E] playback without chunkId, text:", text);
        return;
      }
      const tTranscript = chunkTimesRef.current.get(chunkId);
      if (tTranscript == null) {
        console.log(
          "[E2E] playback started but no transcript time for chunkId:",
          chunkId,
          "text:",
          text
        );
        return;
      }
      const latency = playbackScheduledAtMs - tTranscript;
      console.log(
        `[E2E] speech→speech latency for chunk ${chunkId} (ms):`,
        latency,
        "| text:",
        text
      );
    }
  );

  const { startRecording, stopRecording } = useSpeechToText(preGainRef);

  const onTranscriptReceived = async (
    piece: string,
    speaker: string,
    resultId: string
  ) => {
    const now = performance.now();
    // Record when this final chunk arrives
    chunkTimesRef.current.set(resultId, now);
    console.log("[STT] final piece:", { piece, speaker, resultId }, "at", now);

    // Feed into TTS. handleFinalChunk will buffer until it sees .!? then call speakSentence.
    await handleFinalChunk(piece, speaker, resultId);
  };

  const onError = (msg: string) => {
    console.error("[STT] error:", msg);
    setError(msg);
  };

  const onEndOfTranscript = async () => {
    console.log("[STT] EndOfTranscript, flushing TTS buffer...");
    // flush any tail without punctuation
    await flushBuffer("S1"); // or track last speaker
  };

  const handleStart = () => {
    resetTTS();
    chunkTimesRef.current.clear();
    startRecording(
      STT_API_KEY,
      onTranscriptReceived,
      onError,
      onEndOfTranscript,
      setIsLoading,
      setIsRecording,
      setError
    );
  };

  const handleStop = () => {
    stopRecording(setIsRecording, setError);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Speech-to-Speech Performance Tester</h2>
      <button onClick={handleStart} disabled={isRecording || isLoading}>
        {isLoading ? "Starting..." : "Start"}
      </button>
      <button onClick={handleStop} disabled={!isRecording}>
        Stop
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>Recording: {String(isRecording)}</p>
    </div>
  );
};
