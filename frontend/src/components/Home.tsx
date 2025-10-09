import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

function Home(): JSX.Element {
  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <Header mode="beforeLogin" />
        <main className="flex justify-center items-center">
          <Link
            to="/login"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-8 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Go to Login
          </Link>
        </main>
      </div>
    </>
  );
};

export default Home;
