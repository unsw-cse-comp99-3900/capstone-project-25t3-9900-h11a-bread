import React, { useState } from "react";

type AccentOption = {
  label: string;
  value: string;
};

const accentOptions: AccentOption[] = [
  { label: "🇺🇸 American English", value: "american" },
  { label: "🇬🇧 British English (UK)", value: "british" },
  { label: "🇦🇺 Australian English", value: "australian" },
  { label: "🇮🇳 Indian English", value: "indian" },
  { label: "🇨🇳 Chinese English", value: "chinese" },
  { label: "🇨🇦 Canadian English", value: "canadian" },
  { label: "🇮🇪 Irish English", value: "irish" },
];

const AccentDropdown: React.FC = () => {
  const [selectedAccent, setSelectedAccent] = useState<string>("");

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccent(event.target.value);
  };

  return (
    <div className="flex flex-col items-start space-y-2 w-full max-w-xs">
      <label htmlFor="accent" className="text-gray-700 font-medium text-sm">
        Select Preferred Accent
      </label>
      <select
        id="accent"
        value={selectedAccent}
        onChange={handleChange}
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
    </div>
  );
};

export default AccentDropdown;
