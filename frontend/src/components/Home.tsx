import React from "react";
import { Link } from "react-router-dom";
import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";

const Home: React.FC = () => {
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
          <p className="text-gray-700 mb-6">
            Welcome to SystemX! Get started by logging in or exploring the app.
          </p>

          <Link
            to="/login"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-8 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Go to Login
          </Link>
        </div>

        <p className="text-gray-500 mt-8 text-sm">
          🐳 SystemX running in Docker container with TypeScript support
        </p>
      </div>
    </div>
  );
};

export default Home;
