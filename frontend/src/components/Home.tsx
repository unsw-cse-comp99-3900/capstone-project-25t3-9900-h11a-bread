import { useState, useRef } from "react";
import Header from "./Header";
import { RealtimeClient } from "@speechmatics/real-time-client";
import { createSpeechmaticsJWT } from "@speechmatics/auth";
import AccentDropdown from "./AccentDropdown";
import Button from "./Button";
import { Download } from "lucide-react";

const Home: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const clientRef = useRef<RealtimeClient | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState(false);

  const API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY;

  const handleDownload = ({ transcript }: { transcript: string }) => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transcript.txt";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const startRecording = async () => {
    try {
      setIsLoading(true);
      setError("");
      setTranscript("");

      if (!API_KEY) {
        throw new Error(
          "Speechmatics API key not configured. Please check your .env file."
        );
      }

      // Create a new client
      const client = new RealtimeClient();
      clientRef.current = client;

      // Set up event listener for transcription
      client.addEventListener("receiveMessage", ({ data }) => {
        if (data.message === "AddTranscript") {
          for (const result of data.results) {
            setTranscript((prev) => {
              let newText = prev;
              if (result.type === "word" && prev !== "") {
                newText += " ";
              }
              newText += result.alternatives?.[0]?.content || "";
              if (result.is_eos) {
                newText += "\n";
              }
              return newText;
            });
          }
        } else if (data.message === "EndOfTranscript") {
          console.log("Transcription ended");
        } else if (data.message === "Error") {
          setError(`Error: ${JSON.stringify(data)}`);
          stopRecording();
        }
      });

      // Generate JWT
      const jwt = await createSpeechmaticsJWT({
        type: "rt",
        apiKey: API_KEY,
        ttl: 3600, // 1 hour
      });

      // Start the client with audio format configuration
      await client.start(jwt, {
        audio_format: {
          type: "raw",
          encoding: "pcm_s16le",
          sample_rate: 16000,
        },
        transcription_config: {
          language: "en",
          operating_point: "enhanced",
          max_delay: 1.0,
          transcript_filtering_config: {
            remove_disfluencies: true,
          },
        },
      });

      // Get microphone access with specific constraints for 16kHz
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // Set up audio processing with 16kHz sample rate
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 to int16 PCM
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        // Send raw PCM data
        client.sendAudio(int16Array.buffer);
      };

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

  const stopRecording = () => {
    try {
      // Stop the client
      if (clientRef.current) {
        clientRef.current.stopRecognition({ noTimeout: true });
        clientRef.current = null;
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track: MediaStreamTrack) => track.stop());
        mediaStreamRef.current = null;
      }

      // Close audio context
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

  const handleButtonClick = () => {
    setIsStarted((prev) => !prev);
    setHasStarted(true);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <Header />
      <main className="p-30 flex justify-center items-center">
        <div
          className={`bg-white rounded-2xl shadow-md p-10 w-[320px] h-[580px] flex flex-col items-center justify-center transition-all duration-700 ease-in-out
         `}
        >
          <AccentDropdown />
          <div className="h-full">
            <button
              onClick={() => {
                handleButtonClick();
              }}
              disabled={isLoading}
              className={`relative w-40 h-40 rounded-full text-white text-2xl font-semibold shadow-lg transition-all mt-30 
    ${isLoading ? "bg-gray-400 cursor-wait" : "bg-blue-400 hover:bg-blue-500"}
  `}
            >
              {isLoading ? "Loading" : isStarted ? "Stop" : "Start"}
            </button>
          </div>
        </div>
        {hasStarted && (
          <div className="w-[500px] h-[580px] mt-[52px] flex flex-col overflow-hidden justify-between">
            {/* Header */}
            <div>
              <div className=" pb-2 px-10">
                <p className="text-gray-700 text-lg font-semibold">
                  Transcript
                </p>
              </div>

              {/* Scrollable content */}
              <div className="h-[420px] overflow-y-auto px-10 text-gray-700 leading-relaxed whitespace-pre-line">
                {transcript}
              </div>
            </div>
            {!isStarted && (
              <div>
                <button
                  className=" w-[250px] bg-blue-500 text-white text-sm px-4 py-2 rounded-full hover:bg-blue-600 transition flex items-center gap-2 justify-center ml-[200px]"
                  onClick={() => {
                    handleDownload({ transcript });
                  }}
                >
                  <Download className="w-4 h-4" />
                  Save Transcript
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
