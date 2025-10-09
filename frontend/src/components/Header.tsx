import Button from "../components/Button"

type HeaderProps = {
  mode: "beforeLogin" | "afterLogin" |"logging in";
};

function Header({ mode }: HeaderProps): JSX.Element {
    const isLoggedIn = mode === "afterLogin";
    return (
      <>
        <nav className="fixed top-0 flex items-center justify-between h-32 w-full bg-gray-100 px-10">
          <img
            src={
              "https://i.pinimg.com/1200x/08/0b/f4/080bf4b0cea87ad34ff96caac0e87959.jpg"
            }
            alt="Brand logo"
            width={48}
            height={48}
            loading="eager"
            decoding="async"
            className="h-10 w-10 object-cover"
            referrerPolicy="no-referrer"
          />
          {isLoggedIn ? (
            <Button title="Logged in" route="/login" />
          ) : (
            <Button title="Log in" route="/login" />
          )}
        </nav>
      </>
    );
}

export default Header;