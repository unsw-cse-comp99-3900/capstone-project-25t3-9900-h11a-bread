import React, { useState, useEffect, useCallback } from "react";
import { isUserLoggedIn, getCurrentUser, type User } from "../utils/auth";
import Header from "./Header";
import AccentDropdown from "./AccentDropdown";
import { Download } from "lucide-react";

const handleDownload = () => {
  const transcript = `SpeakerA: Today we are going to talk about communication in our
daily lives, and not just the simple exchange of words, but the
deeper meaning behind how we connect with each
other...\n\nSpeakerB: Think about a time when you felt completely
understood—what made that moment work so well?\n\nSpeakerA: On the
other hand, remember a time when communication broke down—what was
missing?`;
  const blob = new Blob([transcript], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "transcript.txt";
  link.click();
  window.URL.revokeObjectURL(url);
};

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isStarted, setIsStarted] = useState<boolean>(false);

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

  const handleToggle = () => {
    setIsStarted((prev) => !prev);
  };

  const mode = isLoggedIn ? "afterLogin" : "beforeLogin";
  const userName = currentUser?.displayName;

  return (
    <div className="bg-gray-100 h-screen flex flex-col overflow-hidden">
      <Header mode={mode} userName={userName} onLogout={handleLogout} />
      <main className="px-8 py-6 pt-32 flex justify-around items-center">
        <div
          className={`bg-white rounded-2xl shadow-md p-10 w-[320px] h-[580px] flex flex-col items-center justify-center transition-all duration-700 ease-in-out mt-[52px]
         `}
        >
          <AccentDropdown />
          <div className="h-full">
            <button
              onClick={handleToggle}
              className="relative w-40 h-40 rounded-full bg-blue-400 text-white text-2xl font-semibold shadow-lg hover:bg-blue-500 transition-all mt-30"
            >
              {isStarted ? "Stop" : "Start"}
            </button>
          </div>
        </div>

        {isStarted && (
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
                {`SpeakerA: Today we are going to talk about communication in our
daily lives, and not just the simple exchange of words, but the
deeper meaning behind how we connect with each
other...\n\nSpeakerB: Think about a time when you felt completely
understood—what made that moment work so well?\n\nSpeakerA: On the
other hand, remember a time when communication broke down—what was
missing?\n\nSpeakerA: Today we are going to talk about communication
in our daily lives, and not just the simple exchange of words, but
the deeper meaning behind how we connect with each
other...\n\nSpeakerB: Think about a time when you felt completely
understood—what made that moment work so well?\n\nSpeakerA: On the
other hand, remember a time when communication broke down—what was
missing?\n\nSpeakerA: Today we are going to talk about communication
in our daily lives, and not just the simple exchange of words, but
the deeper meaning behind how we connect with each
other...\n\nSpeakerB: Think about a time when you felt completely
understood—what made that moment work so well?\n\nSpeakerA: On the
other hand, remember a time when communication broke down—what was
missing?\n\nSpeakerA: Today we are going to talk about communication
in our daily lives, and not just the simple exchange of words, but
the deeper meaning behind how we connect with each
other...\n\nSpeakerB: Think about a time when you felt completely
understood—what made that moment work so well?\n\nSpeakerA: On the
other hand, remember a time when communication broke down—what was
missing?`}
              </div>
            </div>
            <div className="">
              <button
                className=" w-[250px] bg-blue-500 text-white text-sm px-4 py-2 rounded-full hover:bg-blue-600 transition flex items-center gap-2 justify-center ml-[200px]"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Save Transcript
              </button>{" "}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
