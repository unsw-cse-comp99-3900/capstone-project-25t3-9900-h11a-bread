import Button from "../components/Button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../utils/auth";

type HeaderProps = {
  mode: "beforeLogin" | "afterLogin" | "logging in";
  userName?: string;
  onLogout: () => void;
};

function Header({ mode, userName, onLogout }: HeaderProps): JSX.Element {
  const isLoggedIn = mode === "afterLogin";
  const [isToggled, setIsToggled] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      onLogout();
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
          onClick={() => {
            navigate("/");
          }}
        />
        {isLoggedIn ? (
          <button onClick={toggle}>
            <div className="w-14 h-14 rounded-full bg-[#77A4F7] flex justify-center items-center text-white font-bold">
              {initial}
            </div>
          </button>
        ) : (
          <Button
            title="Log in"
            onClick={() => {
              login("/login");
            }}
          />
        )}
        {isToggled && (
          <div
            className="fixed inset-0 z-5"
            role="dialog"
            aria-modal="true"
            onClick={toggle}
          >
            <div className="absolute right-6 top-24 rounded-xl bg-white p-4">
              <Button title="log out" onClick={handleLogout} />
              {/* replace with real toggle content */}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default Header;
