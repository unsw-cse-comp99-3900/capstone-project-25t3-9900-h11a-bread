import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase/firebase";
import { isUserLoggedIn } from "../utils/auth";
import loginPicture from "../assets/login-picture.png";

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isUserLoggedIn()) {
      navigate("/");
    }
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("User signed in:", user.displayName, user.email);

      // Store user info in localStorage (optional)
      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        })
      );

      // Redirect to home page or dashboard
      navigate("/");
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      alert("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseWithoutSignIn = () => {
    // Redirect to home
    navigate("/");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex flex-1 items-center justify-center p-4 md:p-8 bg-gray-50">
        <div className="w-full max-w-md p-6 md:p-12 bg-[#F7F7F7] rounded-3xl shadow-2xl my-4 md:my-0">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-6 md:mb-10 text-left">
            Login
          </h1>

          <button
            className="w-full p-4 mb-5 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <FcGoogle className="w-6 h-6" />
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>

          {/* <button
            className="w-full p-4 mb-4 border border-blue-600 rounded-xl bg-blue-600 text-white font-medium flex items-center gap-4"
            onClick={handleFacebookSignIn}
          >
            <div className="flex items-center justify-center w-6 h-6 bg-blue-700 rounded-sm">
              <span className="font-bold text-white text-sm">f</span>
            </div>
            Sign in with Facebook
          </button> */}

          <div
            className="text-right
              w-full"
          >
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
      </div>

      {/* Right side - Illustration */}
      <div className="flex flex-1 items-center justify-center bg-[#77A4F7] relative overflow-hidden min-h-[300px] md:min-h-screen">
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
