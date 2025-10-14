import React, { useState, useEffect, useCallback, useRef } from "react";
import { isUserLoggedIn, getCurrentUser, type User } from "../utils/auth";
import Header from "./Header";
import { RealtimeClient } from "@speechmatics/real-time-client";
import { createSpeechmaticsJWT } from "@speechmatics/auth";
import AccentDropdown from "./AccentDropdown";
import Button from "./Button";

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const clientRef = useRef<RealtimeClient | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY;

  const startRecording = async () => {
    try {
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
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    // Check authentication status on component mount
    const loggedIn = isUserLoggedIn();
    setIsLoggedIn(loggedIn);

    if (loggedIn) {
      const user = getCurrentUser();
      setCurrentUser(user);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  }, []);

  const mode = isLoggedIn ? "afterLogin" : "beforeLogin";
  const userName = currentUser?.displayName || undefined;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <Header mode={mode} userName={userName} onLogout={handleLogout} />
      <main className="flex justify-center items-center">
        <div className="container">
          <Button
            title={isRecording ? "Stop Recording" : "Start Recording"}
            className={`${isRecording ? "recording" : ""}`}
            onClick={handleButtonClick}
          />
          {error && <div className="error">{error}</div>}

          {transcript && (
            <div className="mt-5">
              <div className="transcript">{transcript}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
