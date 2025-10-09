import React from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";

interface NoteDetailProps {
  note: {
    id: number;
    name: string;
    createdAt: Date;
    transcript: string;
  };
  onBack: () => void;
}

const NoteDetail: React.FC<NoteDetailProps> = ({ note, onBack }) => {
  const downloadTranscript = () => {
    const blob = new Blob([note.transcript], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.name}_${format(
      note.createdAt,
      "yyyyMMdd_HHmmss"
    )}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        {/* Left side: logo + back */}
        <div className="flex items-center gap-4">
          <img
            src="/logo.png" // 替换成你的 logo
            alt="Logo"
            className="w-10 h-10 rounded-full"
          />
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm"
          >
            ← Back
          </button>
        </div>

        {/* Right side: user icon */}
        <div className="w-8 h-8 bg-blue-500 text-white flex items-center justify-center rounded-full font-semibold">
          J
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex justify-center items-start px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl w-full">
          {/* Title and download */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-1">
              {note.name}
              <button
                onClick={downloadTranscript}
                title="Download transcript"
                className="hover:scale-110 transition"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </h2>
          </div>

          {/* Date */}
          <p className="text-gray-500 text-sm mb-6">
            {format(note.createdAt, "h:mma, MMM d, yyyy").toLowerCase()}
          </p>

          {/* Transcript content */}
          <div className="text-gray-700 leading-relaxed space-y-4">
            {note.transcript.split("\n").map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NoteDetail;
