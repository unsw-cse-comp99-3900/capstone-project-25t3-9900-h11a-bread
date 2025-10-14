import React, { useState, useEffect, useCallback } from "react";
import { isUserLoggedIn, getCurrentUser, type User } from "../utils/auth";
import Header from "./Header";
import AccentDropdown from "./AccentDropdown";

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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <Header mode={mode} userName={userName} onLogout={handleLogout} />
      <main className="flex justify-center items-center">
        <div
          className={`bg-white rounded-2xl shadow-md p-10 w-[320px] h-[580px] flex flex-col items-center justify-center transition-all duration-700 ease-in-out 
          ${isStarted ? "-translate-x-[200px]" : "translate-x-0"}`}
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
          <div className="absolute right-[200px] transition-opacity duration-700 ease-in-out opacity-100">
            <p className="text-gray-700 text-lg font-medium mb-2">Transcript</p>
            <p className="text-gray-600">SpeakerA: F</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
