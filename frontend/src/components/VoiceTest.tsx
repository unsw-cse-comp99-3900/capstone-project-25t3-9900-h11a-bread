import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const VoiceTest: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [transcriptionResult, setTranscriptionResult] = useState<string>("");
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // WebSocket connection
  const connectWebSocket = () => {
    try {
      // Use the integrated VAD + Speechmatics WebSocket endpoint
      const wsUrl = "ws://localhost:8000/ws/integrated";
      const ws = new WebSocket(wsUrl);

      ws.onopen = async () => {
        console.log("WebSocket connected");

        // Send configuration as per backend protocol
        const config = {
          sr: 16000,
          frame_samples: 480, // 30ms frames at 16kHz
          subtract_scale: 1.0,
          enable_transcription: true,
          language: "en",
        };

        ws.send(JSON.stringify(config));
        console.log("Sent config:", config);
      };

      ws.onmessage = (event) => {
        try {
          const message = event.data;

          if (message === "OK: ready") {
            setIsConnected(true);
            setConnectionStatus("Connected & Ready");
            setError("");
            console.log("Backend ready for audio streaming");
            return;
          }

          if (message.startsWith("ERR:")) {
            setError(message);
            console.error("Backend error:", message);
            return;
          }

          if (message.startsWith("DATA:")) {
            const jsonData = message.substring(5); // Remove "DATA: " prefix
            const data = JSON.parse(jsonData);
            console.log("Received data:", data);

            if (data.type === "audio_and_transcript") {
              // Update transcription results - append instead of replacing
              if (data.transcript) {
                setTranscriptionResult((prev) => {
                  const newText = data.transcript.trim();
                  if (newText && !prev.includes(newText)) {
                    return prev ? `${prev} ${newText}` : newText;
                  }
                  return prev;
                });
                // Clear partial transcript when we get final result
                setPartialTranscript("");
              }
              // Handle partial transcripts for real-time feedback
              if (data.partial_transcript) {
                setPartialTranscript(data.partial_transcript.trim());
                console.log("Partial:", data.partial_transcript);
              }
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err, event.data);
          setError("Failed to parse response from backend");
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setConnectionStatus("Disconnected");
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError(
          "WebSocket connection error. Check if backend is running on localhost:8000"
        );
        setIsConnected(false);
        setConnectionStatus("Error");
      };

      websocketRef.current = ws;
    } catch (err) {
      setError("Failed to connect to WebSocket");
      console.error("WebSocket connection error:", err);
    }
  };

  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setError("");
      setTranscriptionResult("");
      setPartialTranscript("");

      if (!isConnected) {
        setError("Please connect to WebSocket first");
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Your browser doesn't support microphone access. Please use Chrome, Firefox, or Safari."
        );
        return;
      }

      console.log("Requesting microphone access...");

      // Try different constraint configurations
      let stream: MediaStream | null = null;

      // First attempt with specific constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (specificError) {
        console.warn(
          "Specific constraints failed, trying basic constraints:",
          specificError
        );

        // Fallback to basic constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
        } catch (basicError) {
          console.error("Basic constraints also failed:", basicError);
          throw basicError;
        }
      }

      if (!stream) {
        throw new Error("Failed to get media stream");
      }

      console.log(
        "Microphone access granted. Stream tracks:",
        stream.getTracks().length
      );

      // Create audio context for real-time processing
      let audioContext: AudioContext;
      try {
        audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
      } catch (contextError) {
        console.warn(
          "Failed to create context with 16kHz, using default:",
          contextError
        );
        audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      // Resume audio context if suspended (required in some browsers)
      if (audioContext.state === "suspended") {
        console.log("Resuming suspended audio context...");
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;
      console.log(
        "Audio context created. Sample rate:",
        audioContext.sampleRate
      );

      const source = audioContext.createMediaStreamSource(stream);

      // Use a valid buffer size (must be power of 2 between 256-16384)
      // We'll use 4096 and split into 480-sample frames for the backend
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      // Buffer to accumulate audio data for 480-sample frames
      let audioBuffer: Float32Array = new Float32Array(0);
      const targetFrameSize = 480;

      processor.onaudioprocess = (event) => {
        if (
          websocketRef.current &&
          websocketRef.current.readyState === WebSocket.OPEN
        ) {
          const inputBuffer = event.inputBuffer.getChannelData(0);

          // Accumulate audio data
          const newBuffer = new Float32Array(
            audioBuffer.length + inputBuffer.length
          );
          newBuffer.set(audioBuffer);
          newBuffer.set(inputBuffer, audioBuffer.length);
          audioBuffer = newBuffer;

          // Send 480-sample frames to backend
          while (audioBuffer.length >= targetFrameSize) {
            // Extract 480 samples
            const frame = audioBuffer.slice(0, targetFrameSize);

            // Remove processed samples from buffer
            audioBuffer = audioBuffer.slice(targetFrameSize);

            // Ensure values are in [-1, 1] range and send to backend
            const float32Buffer = new Float32Array(targetFrameSize);
            for (let i = 0; i < targetFrameSize; i++) {
              float32Buffer[i] = Math.max(-1.0, Math.min(1.0, frame[i]));
            }

            // Send 480-sample frame to backend
            websocketRef.current.send(float32Buffer.buffer);
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setConnectionStatus("Recording & Processing...");

      // Store stream reference to stop tracks later
      (processor as any).stream = stream;
      console.log("Recording started successfully");
    } catch (err: any) {
      let errorMessage = "Failed to access microphone. ";

      if (err.name === "NotAllowedError") {
        errorMessage +=
          "Permission denied. Please allow microphone access and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No microphone found. Please check your audio devices.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Microphone is already in use by another application.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage +=
          "Your microphone doesn't support the required audio format.";
      } else if (err.name === "SecurityError") {
        errorMessage +=
          "HTTPS is required for microphone access. Please use https:// or localhost.";
      } else {
        errorMessage += `Error: ${err.message || err.name || "Unknown error"}`;
      }

      setError(errorMessage);
      console.error("Microphone access error:", {
        name: err.name,
        message: err.message,
        constraint: err.constraint,
        stack: err.stack,
      });
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      // Stop audio processing
      processorRef.current.disconnect();

      // Stop microphone stream
      const stream = (processorRef.current as any).stream;
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setConnectionStatus(isConnected ? "Connected" : "Disconnected");

    // Send end signal to backend
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      websocketRef.current.send(JSON.stringify({ type: "end_recording" }));
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopRecording();
      disconnectWebSocket();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            🎤 Voice Testing Lab
          </h1>
          <Link
            to="/"
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="font-semibold">
                WebSocket Status: {connectionStatus}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={connectWebSocket}
                disabled={isConnected}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
              <button
                onClick={disconnectWebSocket}
                disabled={!isConnected}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Real-time Speech-to-Text Testing
          </h2>

          <div className="flex justify-center gap-4 mb-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!isConnected}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
                Start Voice Input
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-red-600 hover:to-pink-700 shadow-lg flex items-center gap-3 text-lg animate-pulse"
              >
                <div className="w-4 h-4 bg-white rounded"></div>
                Stop Recording
              </button>
            )}
          </div>

          {/* Status Messages */}
          {isRecording && (
            <div className="text-center">
              <p className="text-green-600 font-medium text-lg mb-2">
                🔴 Live Recording...
              </p>
              <p className="text-gray-600">
                Speak clearly - audio is being processed in real-time
              </p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcription Results */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                📝 Transcription Results
              </h3>
              {(transcriptionResult || partialTranscript) && (
                <button
                  onClick={() => {
                    setTranscriptionResult("");
                    setPartialTranscript("");
                  }}
                  className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-sm"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-3">
              {/* Final Transcription */}
              {transcriptionResult ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="font-semibold text-green-800 mb-2">
                    Final Transcript:
                  </h4>
                  <p className="text-gray-800 text-lg leading-relaxed">
                    "{transcriptionResult}"
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-500">
                    Final transcription will appear here and accumulate as you
                    speak...
                  </p>
                </div>
              )}

              {/* Partial Transcription */}
              {partialTranscript && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Live Preview:
                  </h4>
                  <p className="text-blue-700 text-lg leading-relaxed italic">
                    "{partialTranscript}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              ⚠️ Status & Errors
            </h3>
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700">System ready for voice input</p>
              </div>
            )}
          </div>
        </div>

        {/* Technical Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            🔧 Technical Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Audio Configuration:</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Sample Rate: 16kHz</li>
                <li>• Channels: Mono</li>
                <li>• Format: Float32 PCM [-1,1]</li>
                <li>• Frame Size: 480 samples (30ms)</li>
                <li>• Browser Processing: Disabled</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Backend Pipeline:</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• WebSocket: /ws/integrated</li>
                <li>• VAD: Spectral Subtraction</li>
                <li>• Speechmatics: Real-time API</li>
                <li>• Results: Final + Partial</li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg mt-4">
            <h4 className="font-semibold mb-2">Current Configuration:</h4>
            <code className="text-xs text-gray-700 block">
              {`{
  "sr": 16000,
  "frame_samples": 480,
  "subtract_scale": 1.0,
  "enable_transcription": true,
  "language": "en"
}`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTest;
