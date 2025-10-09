
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type AppButtonProps = {
  title: string;
  icon?: ReactNode;
  route?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
  title,
  icon,
  route,
  onClick,
}: AppButtonProps): JSX.Element {
    const navigate = useNavigate();
    const handleClick = () => {
      if (route) navigate(route);
    };

    return (
      <button
        type="button"
        className="w-auto px-6 py-2 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleClick}
      >
        {title}
      </button>
    );
  
}
export default Button;