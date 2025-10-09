import React, { useState, useEffect, useCallback } from "react";
import { isUserLoggedIn, getCurrentUser, type User } from "../utils/auth";
import Header from "./Header";
import AccentDropdown from "./AccentDropdown";

const Home: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
  const userName = currentUser?.displayName;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <Header mode={mode} userName={userName} onLogout={handleLogout} />
      <main className="flex justify-center items-center">
        {/* Add your main content here */}
      </main>
    </div>
  );
};

export default Home;
