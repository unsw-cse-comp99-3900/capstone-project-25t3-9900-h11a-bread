import React from "react";
import { Link } from "react-router-dom";
import loginPicture from "../assets/login-picture.png";

const Login: React.FC = () => {
  const handleGoogleSignIn = () => {
    // TODO: Implement Google Sign-In
    console.log("Google Sign-In clicked");
  };

  const handleFacebookSignIn = () => {
    // TODO: Implement Facebook Sign-In
    console.log("Facebook Sign-In clicked");
  };

  const handleUseWithoutSignIn = () => {
    // TODO: Implement use without signing in
    console.log("Use without signing in clicked");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex flex-1 items-center justify-center p-4 md:p-8 bg-gray-50">
        <div className="w-full max-w-md p-6 md:p-12 bg-[#F7F7F7] rounded-3xl shadow-2xl my-4 md:my-0">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-6 md:mb-10 text-left">
            Login
          </h1>

          <button
            className="w-full p-4 mb-4 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium flex items-center gap-4"
            onClick={handleGoogleSignIn}
          >
            <div className="flex items-center justify-center w-6 h-6 bg-white rounded-full">
              <span className="font-bold text-blue-500 text-lg">G</span>
            </div>
            Sign in with Google
          </button>

          <button
            className="w-full p-4 mb-4 border border-blue-600 rounded-xl bg-blue-600 text-white font-medium flex items-center gap-4"
            onClick={handleFacebookSignIn}
          >
            <div className="flex items-center justify-center w-6 h-6 bg-blue-700 rounded-sm">
              <span className="font-bold text-white text-sm">f</span>
            </div>
            Sign in with Facebook
          </button>

          <button
            className="
              bg-transparent! 
              text-blue-400 
              underline 
            "
            onClick={handleUseWithoutSignIn}
          >
            Use Without Signing In
          </button>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden min-h-[300px] md:min-h-screen">
        <div className="flex items-center justify-center w-full h-full relative">
          <img
            src={loginPicture}
            alt="Login illustration"
            className="max-w-[60%] md:max-w-[80%] max-h-[60%] md:max-h-[80%] w-auto h-auto object-contain filter drop-shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
