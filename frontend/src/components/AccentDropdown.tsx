import React from "react";

export type AccentOption = {
  label: string;
  value: "American" | "British" | "Australian" | "Indian";
};

export const accentOptions: AccentOption[] = [
  { label: "🇺🇸 American English", value: "American" },
  { label: "🇬🇧 British English", value: "British" },
  { label: "🇦🇺 Australian English", value: "Australian" },
  { label: "🇮🇳 Indian English", value: "Indian" },
];

interface AccentDropdownProps {
  selectedAccent: string;
  selectedGender: "male" | "female";
  onAccentChange: (accent: AccentOption["value"]) => void;
  onGenderChange: (gender: "male" | "female") => void;
}

const AccentDropdown: React.FC<AccentDropdownProps> = ({
  selectedAccent,
  selectedGender,
  onAccentChange,
  onGenderChange,
}) => {
  return (
    <div className="flex flex-col items-center space-y-3 w-full max-w-xs">
      <label htmlFor="accent" className="text-gray-700 font-medium text-sm">
        Select Preferred Accent
      </label>
      <select
        id="accent"
        value={selectedAccent}
        onChange={(e) =>
          onAccentChange(e.target.value as AccentOption["value"])
        }
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-800 text-sm shadow-sm 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      >
        <option value="" disabled>
          Choose an accent...
        </option>
        {accentOptions.map((accent) => (
          <option key={accent.value} value={accent.value}>
            {accent.label}
          </option>
        ))}
      </select>

      {/* Gender toggle */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-gray-700 text-xs">Voice Gender:</span>
        <button
          type="button"
          onClick={() => onGenderChange("male")}
          className={`px-3 py-1.5 rounded-full text-xs border font-medium ${
            selectedGender === "male"
              ? " text-white border-[#77A4F7] bg-[#77A4F7]"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          Male
        </button>
        <button
          type="button"
          onClick={() => onGenderChange("female")}
          className={`px-3 py-1.5 rounded-full text-xs border font-medium ${
            selectedGender === "female"
              ? "text-white border-[#77A4F7] bg-[#77A4F7]"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          Female
        </button>
      </div>
    </div>
  );
};

export default AccentDropdown;
