import { useState, useRef, useEffect} from "react";
import Header from "./Header";
import AccentDropdown from "./AccentDropdown";
import AudioModeToggle from "./AudioModeToggle";
import { Download } from "lucide-react";
import { useTranscripts } from "../hooks/useTranscripts";
import { useAuth } from "../hooks/useAuth";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import type { AccentKey, GenderKey } from "../utils/voiceMap";
import { formatPunctuationSpacing } from "../utils/textFormatter";

type AudioMode = "headphones" | "speakers";

const Home: React.FC = () => {
  /** Auth and Transcripts */
  const { user } = useAuth();
  const { addTranscript } = useTranscripts(user);

  /** UI / state */
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState("");

  //Audio mode for controlling mic behavior during TTS playback 
  const [audioMode, setAudioMode] = useState<AudioMode>("speakers");

  //handle transcript
  const [lines, setLines] = useState<Array<{ speaker: string; text: string }>>(
    []
  );
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  //handle selection
  const [selectedAccent, setSelectedAccent] = useState<AccentKey | "">(
    "American"
  );
  const [selectedGender, setSelectedGender] = useState<GenderKey>("male");

  //handle microphone gain control reference - used by TTS to mute/unmute mic
  const preGainRef = useRef<GainNode | null>(null);

  // effect hook to make sure the newest line always show at the bottom
  useEffect(() => {
    if (!transcriptRef.current) return;
    const el = transcriptRef.current;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  // read environment fpr stt and tts
  const API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY as
    | string
    | undefined;
  const AZURE_REGION = import.meta.env.VITE_AZURE_REGION as string | undefined;
  const AZURE_KEY = import.meta.env.VITE_AZURE_SPEECH_API_KEY as
    | string
    | undefined;

  /** STT Hook */
  const { startRecording: startSTT, stopRecording: stopSTT } =
    useSpeechToText(preGainRef);

  /** TTS Hook */
  const { handleFinalChunk, flushBuffer, resetTTS } = useTextToSpeech(
    selectedAccent,
    selectedGender,
    AZURE_KEY,
    AZURE_REGION,
    audioMode, // Pass current audio mode
    preGainRef // Pass mic gain control reference
  );

  /** Handle transcript received from STT */
  const handleTranscriptReceived = async (piece: string, speaker: string) => {
    // Detect speaker change and flush previous speaker's buffer
    const prevSpeaker = lines.length > 0 ? lines[lines.length - 1].speaker : null;
    if (prevSpeaker && prevSpeaker !== speaker) {
      // Speaker transition detected, flush previous speaker's incomplete buffer
      await flushBuffer(prevSpeaker);
    }

    // Append to transcript with speaker diarization
    setLines((prev) => {
      if (prev.length) {
        const last = prev[prev.length - 1];
        // If same speaker, merge the text
        if (last.speaker === speaker) {
          const merged = {
            speaker,
            text: formatPunctuationSpacing(`${last.text} ${piece}`),
          };
          const clone = [...prev];
          clone[clone.length - 1] = merged;
          return clone;
        }
        // Different speaker, add new line
        return [...prev, { speaker, text: formatPunctuationSpacing(piece) }];
      }
      return [{ speaker, text: formatPunctuationSpacing(piece) }];
    });

    // Handle TTS
    await handleFinalChunk(piece, speaker);
  };

  /** Start Recording */
  const startRecording = async () => {
    setHasStarted(true);
    setLines([]);
    resetTTS();

    await startSTT(
      API_KEY,
      handleTranscriptReceived,
      (error) => console.error(error),
      () => {
        const lastSpeaker = lines[lines.length - 1]?.speaker || "S1";
        flushBuffer(lastSpeaker);
      },
      setIsLoading,
      setIsRecording,
      setError
    );
  };

  /** Stop Recording */
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
      <main className="pt-20 flex flex-col items-center justify-center gap-4">
        <div className="flex justify-center items-center">
          <div className="bg-white rounded-2xl shadow-md p-10 w-[320px] h-[520px] md:h-[580px] flex flex-col items-center justify-center">
            <AccentDropdown
              selectedAccent={selectedAccent}
              selectedGender={selectedGender}
              onAccentChange={(accent) => {
                setSelectedAccent(accent as AccentKey);
                resetTTS();
              }}
              onGenderChange={(g) => {
                setSelectedGender(g as GenderKey);
                resetTTS();
              }}
            />

            <div className="h-full flex flex-col gap-8 md:gap-20 justify-end items-center">
              <button
                onClick={handleButtonClick}
                disabled={isLoading || !selectedAccent}
                className={`relative w-40 h-40 rounded-full text-white text-2xl font-semibold shadow-lg transition-all
                  ${
                    isLoading || !selectedAccent
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#77A4F7] hover:bg-blue-500"
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
              {/* Audio Mode Toggle - controls whether mic is muted during TTS */}
              <AudioModeToggle
                selectedMode={audioMode}
                onModeChange={setAudioMode}
                disabled={isRecording} // Disable switching during recording
              />
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
                <div
                  ref={transcriptRef}
                  className="h-[420px] overflow-y-auto px-10 leading-relaxed"
                >
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

                      return (
                        <div key={idx} className="mb-3">
                          <span className={`font-semibold ${speakerColor}`}>
                            {line.speaker}:
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
        </div>
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