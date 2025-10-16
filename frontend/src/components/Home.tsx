import { useState, useRef } from "react";
import Header from "./Header";
import { RealtimeClient } from "@speechmatics/real-time-client";
import { createSpeechmaticsJWT } from "@speechmatics/auth";
import AccentDropdown from "./AccentDropdown";
import { Download } from "lucide-react";

const Home: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const clientRef = useRef<RealtimeClient | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
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

      // Append text for every received message
      client.addEventListener("receiveMessage", ({ data }) => {
        if (data.message === "AddTranscript") {
          for (const result of data.results) {
            setTranscript((prev) => {
              // From previous text
              let newText = prev;
              // If new word and its not the first word, add a space
              if (result.type === "word" && prev !== "") newText += " ";

              // Gets the word "guess" with highest probability
              newText += result.alternatives?.[0]?.content || "";
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

      // Generate JWT using Speechmatics
      const jwt = await createSpeechmaticsJWT({
        type: "rt",
        apiKey: API_KEY,
        ttl: 3600,
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

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // Set up audio processing
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      // Load the AudioWorklet module and setup worklet node
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;

      // Handle processed audio data
      workletNode.port.onmessage = (event) => {
        const int16Buffer = event.data;
        client.sendAudio(int16Buffer);
      };

      source.connect(workletNode);

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
      // Disconnect and clean up worklet node
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current = null;
      }

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
      <main className="flex justify-center items-center">
        <div
          className={`bg-white rounded-2xl shadow-md p-10 w-[320px] h-[580px] flex flex-col items-center justify-center transition-all duration-700 ease-in-out mt-[52px]
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