// import React, { createContext, useEffect, useState, ReactNode } from "react";
// import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import React, { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";

import { app, facebookprovider } from "../firebase/firebase";

//  Define context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithFacebook: async () => {},
  logout: async () => {},
});

// Define props for provider
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const currentUser = result.user;
      setUser(currentUser);
      console.log("User signed in:", currentUser.displayName);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  const loginWithFacebook = async () => {
    try {
      const result = await signInWithPopup(auth, facebookprovider);
      const currentUser = result.user;
      setUser(currentUser);
      console.log("User signed in:", currentUser.displayName);
    } catch (error) {
      console.error("Facebook Sign-In Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log("User logged out.");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  // Show loading screen until auth state is resolved
  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithGoogle, loginWithFacebook, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
