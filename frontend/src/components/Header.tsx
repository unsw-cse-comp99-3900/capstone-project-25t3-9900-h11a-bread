import Button from "../components/Button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Header(): JSX.Element {
  const { user, logout, loading } = useAuth();

  const userName = user?.displayName;
  const userEmail = user?.email;
  const isLoggedIn = !!user;
  const [isToggled, setIsToggled] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  const navigate = useNavigate();

  const login = (route: string): void => {
    navigate(route);
  };

  const toggle = (): void => {
    setIsToggled(!isToggled);
    // console.log(isToggled)
  };
  const initial = userName?.[0]?.toUpperCase() ?? "";

  return (
    <>
      <nav className="fixed top-0 flex items-center justify-between h-32 w-full bg-gray-100 px-10 pr-16">
        <img
          src={"/logo.png"}
          alt="Brand logo"
          width={66}
          height={66}
          loading="eager"
          decoding="async"
          className="w-auto h-14 object-cover"
          referrerPolicy="no-referrer"
        />

        {!loading && isLoggedIn ? (
          <button onClick={toggle}>
            <div className="w-14 h-14 rounded-full bg-[#77A4F7] flex justify-center items-center text-white font-bold">
              {initial}
            </div>
          </button>
        ) : (
          !loading && (
            <Button
              title="Log in"
              onClick={() => {
                login("/login");
              }}
            />
          )
        )}
        {isToggled && (
          <div
            className="fixed inset-0 z-10 bg-black/10 flex justify-end"
            onClick={toggle}
          >
            {/* Popup container */}
            <div
              className="relative bg-white rounded-2xl shadow-lg w-70 h-70 mr-6 mt-28 p-6 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the box
            >
              {/* Close button (top-right) */}
              <button
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
                onClick={toggle}
              >
                ✕
              </button>

              {/* Profile avatar circle */}
              <div className="w-13 h-13 rounded-full bg-[#77A4F7] flex items-center justify-center text-white  font-bold ">
                {initial}
              </div>

              {/* Greeting and email */}
              <p className="text-lg font-semibold text-gray-800 mt-3">
                Hi, {userName?.split(" ")[0] || "User"}
              </p>
              <p className="text-sm text-gray-500 mb-6">{userEmail}</p>

              {/* "My Transcripts" button */}
              <button
                onClick={() => {
                  navigate("/notes");
                  toggle();
                }}
                className="w-4/5 py-2 mb-3 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                My Transcripts
              </button>

              {/* "Log Out" button */}
              <button
                onClick={handleLogout}
                className="w-4/5 py-2 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default Header;
