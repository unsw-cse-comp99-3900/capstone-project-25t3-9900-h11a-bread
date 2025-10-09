import React, { useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";

// Type definition for a single note
interface Note {
  id: number;
  name: string;
  createdAt: Date;
  durationSec: number;
  transcript: string;
}

// Generate 30 fake notes
function generateFakeNotes(): Note[] {
  const notes: Note[] = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - Math.floor(i / 3)); // every 3 notes on the same day
    date.setHours(12);
    date.setMinutes(55);
    date.setSeconds(0);

    notes.push({
      id: i + 1,
      name: "Note",
      createdAt: date,
      durationSec: 115,
      transcript: `This is the transcript content for note #${i + 1}.`,
    });
  }

  return notes;
}

// Group notes by date (e.g., "Tuesday, Sep 30")
function groupNotesByDate(notes: Note[]): Record<string, Note[]> {
  return notes.reduce((groups, note) => {
    const dateKey = format(note.createdAt, "EEEE, MMM d");
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(note);
    return groups;
  }, {} as Record<string, Note[]>);
}

// Format time (e.g., "12:55pm")
function formatTime(date: Date) {
  return format(date, "h:mma").toLowerCase();
}

// Format duration (e.g., "1m55s")
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

// Trigger a download for a note transcript
function downloadTranscript(note: Note) {
  const blob = new Blob([note.transcript], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${note.name}_${format(note.createdAt, "yyyyMMdd_HHmmss")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const NotesPage: React.FC = () => {
  const fakeNotes = generateFakeNotes();
  const groupedNotes = groupNotesByDate(fakeNotes);

  // Flatten grouped data for pagination
  const allNotes = Object.entries(groupedNotes).flatMap(([date, notes]) =>
    notes.map((n) => ({ ...n, dateLabel: date }))
  );

  // Pagination setup
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(allNotes.length / itemsPerPage);

  // Slice notes for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = allNotes.slice(startIndex, startIndex + itemsPerPage);

  // Re-group notes only for the current page
  const paginatedGrouped = paginatedNotes.reduce((acc, note) => {
    if (!acc[note.dateLabel]) acc[note.dateLabel] = [];
    acc[note.dateLabel].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* ✅ Navbar placeholder */}
      <nav className="w-full bg-white shadow-sm h-14 flex items-center justify-between px-6">
        <h1 className="text-lg font-semibold text-gray-800">Notes</h1>
        <div className="text-gray-500 text-sm">[ Navbar placeholder ]</div>
      </nav>

      {/* ✅ Main content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Display paginated groups */}
          {Object.entries(paginatedGrouped).map(([date, notes]) => (
            <div key={date}>
              <h2 className="text-gray-600 font-semibold mb-3">{date}</h2>
              <div className="flex flex-col gap-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm hover:bg-gray-100 transition"
                  >
                    <div className="flex flex-col">
                      <div className="text-gray-900 font-medium">
                        {note.name}{" "}
                        <span className="text-gray-500 text-sm ml-1">
                          {formatTime(note.createdAt)}
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {formatDuration(note.durationSec)}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadTranscript(note)}
                      className="hover:scale-110 transition"
                      title="Download transcript"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination controls */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotesPage;
