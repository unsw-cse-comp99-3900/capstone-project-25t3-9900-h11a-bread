import { Headphones, Volume2 } from "lucide-react";

type AudioMode = "headphones" | "speakers";

interface AudioModeToggleProps {
  selectedMode: AudioMode;
  onModeChange: (mode: AudioMode) => void;
  disabled?: boolean;
}

const AudioModeToggle: React.FC<AudioModeToggleProps> = ({
  selectedMode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {/* Headphone Mode */}
        <button
          onClick={() => onModeChange("headphones")}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
            selectedMode === "headphones"
              ? "border-[#77A4F7] bg-[#77A4F7] text-white shadow-sm"
              : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          title="Headphones Mode: Use with headphones - microphone stays active during AI speech"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Headphones</span>
        </button>

        {/* Speakers Mode */}
        <button
          onClick={() => onModeChange("speakers")}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
            selectedMode === "speakers"
              ? "border-[#77A4F7] bg-[#77A4F7] text-white shadow-sm"
              : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          title="Speakers Mode: Use with speakers - microphone mutes during AI speech to prevent echo"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Speakers</span>
        </button>
      </div>

      {/* Description Text */}
      <p className="text-[11px] text-gray-500 text-center h-10">
        {selectedMode === "headphones"
          ? "Microphone stays active during playback"
          : "Microphone mutes during playback to prevent echo"}
      </p>
    </div>
  );
};

export default AudioModeToggle;
