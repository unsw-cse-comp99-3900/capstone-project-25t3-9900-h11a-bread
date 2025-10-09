import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  isUserLoggedIn,
  getCurrentUser,
  logoutUser,
  type User,
} from "../utils/auth";
import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status on component mount
    const loggedIn = isUserLoggedIn();
    setIsLoggedIn(loggedIn);

    if (loggedIn) {
      const user = getCurrentUser();
      setCurrentUser(user);
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      setIsLoggedIn(false);
      setCurrentUser(null);
      // Redirect to login page
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
            <img
              src={viteLogo}
              className="h-24 p-6 hover:drop-shadow-lg transition-all duration-300"
              alt="Vite logo"
            />
          </a>
          <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
            <img
              src={reactLogo}
              className="h-24 p-6 hover:drop-shadow-lg transition-all duration-300 animate-spin-slow"
              alt="React logo"
            />
          </a>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
          SystemX
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          React + TypeScript + Docker + Tailwind
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
          {isLoggedIn && currentUser ? (
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-white font-semibold text-lg">
                    {(() => {
                      const name =
                        currentUser.displayName || currentUser.email || "User";
                      const nameParts = name.split(" ");
                      if (nameParts.length >= 2) {
                        return (
                          nameParts[0][0] + nameParts[1][0]
                        ).toUpperCase();
                      } else {
                        return name.slice(0, 2).toUpperCase();
                      }
                    })()}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">
                    Welcome back, {currentUser.displayName || "User"}!
                  </p>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                You're successfully logged in to SystemX.
              </p>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold py-3 px-8 rounded-xl hover:from-red-600 hover:to-pink-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-6">
                Welcome to SystemX! Get started by logging in or exploring the
                app.
              </p>
              <Link
                to="/login"
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-8 rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-lg"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>

        <p className="text-gray-500 mt-8 text-sm">
          🐳 SystemX running in Docker container with TypeScript support
        </p>
      </div>
    </div>
  );
};

export default Home;
