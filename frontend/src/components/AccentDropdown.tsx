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
    <div className="flex flex-col items-start space-y-3 w-full max-w-xs">
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
      <div className="flex items-center gap-3">
        <span className="text-gray-700 text-sm">Voice Gender:</span>
        <button
          type="button"
          onClick={() => onGenderChange("male")}
          className={`px-4 py-1 rounded-full text-sm border ${
            selectedGender === "male"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          Male
        </button>
        <button
          type="button"
          onClick={() => onGenderChange("female")}
          className={`px-4 py-1 rounded-full text-sm border ${
            selectedGender === "female"
              ? "bg-pink-500 text-white border-pink-500"
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
