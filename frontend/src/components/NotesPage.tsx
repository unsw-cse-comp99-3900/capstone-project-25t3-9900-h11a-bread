import React, { useState } from "react";
import { format } from "date-fns";
import { Download, ArrowLeft } from "lucide-react";

// --------------------------------------
// 📘 Type Definitions
// --------------------------------------
interface Note {
  id: number;
  name: string;
  createdAt: Date;
  durationSec: number;
  transcript: string;
}

// --------------------------------------
// 🧩 Utility Functions
// --------------------------------------
function generateFakeNotes(): Note[] {
  const notes: Note[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - Math.floor(i / 3));
    date.setHours(12, 55, 0);
    notes.push({
      id: i + 1,
      name: "Note",
      createdAt: date,
      durationSec: 115,
      transcript: `SpeakerA: Today we are going to talk about the importance of communication in our daily lives, and not just the simple exchange of words, but the deeper meaning behind how we connect with each other, how we share ideas, and how we build relationships. Communication is more than sending a message from one person to another—it is about listening, interpreting, and responding in ways that create understanding.\n\nSpeakerB: Think about a time when you felt completely understood—what made that moment work so well?\n\nSpeakerA: On the other hand, remember a time when communication broke down—what was missing? By analyzing these examples, we can begin to see patterns that help us improve.`,
    });
  }
  return notes;
}

function groupNotesByDate(notes: Note[]): Record<string, Note[]> {
  return notes.reduce((groups, note) => {
    const dateKey = format(note.createdAt, "EEEE, MMM d");
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(note);
    return groups;
  }, {} as Record<string, Note[]>);
}

function formatTime(date: Date) {
  return format(date, "h:mma").toLowerCase();
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

// --------------------------------------
// 📥 Download Transcript
// --------------------------------------
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

// --------------------------------------
// 🗒️ Note Detail Page
// --------------------------------------
const NoteDetail: React.FC<{
  note: Note;
  onBack: () => void;
}> = ({ note, onBack }) => {
  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center">
      {/* Navbar */}
      <div className="w-full bg-white shadow-sm h-14 flex items-center justify-between px-6">
        <div className="text-gray-500 text-sm">[ Navbar placeholder ]</div>
        <div className="w-8 h-8 bg-blue-500 text-white flex items-center justify-center rounded-full font-medium">
          J
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 w-full max-w-3xl px-6 py-10">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center text-gray-700 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-900 font-semibold text-lg flex items-center">
              Note
              <button
                onClick={() => downloadTranscript(note)}
                className="ml-2 hover:scale-110 transition"
                title="Download transcript"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </h2>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            {format(note.createdAt, "h:mma, MMM d, yyyy").toLowerCase()}
          </p>

          <div className="text-gray-800 leading-relaxed whitespace-pre-line border-l-2 border-blue-100 pl-4">
            {note.transcript}
          </div>
        </div>
      </main>
    </div>
  );
};

// --------------------------------------
// 📄 Notes List Page
// --------------------------------------
const NotesPage: React.FC = () => {
  const fakeNotes = generateFakeNotes();
  const groupedNotes = groupNotesByDate(fakeNotes);
  const allNotes = Object.entries(groupedNotes).flatMap(([date, notes]) =>
    notes.map((n) => ({ ...n, dateLabel: date }))
  );

  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(allNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = allNotes.slice(startIndex, startIndex + itemsPerPage);
  const paginatedGrouped = paginatedNotes.reduce((acc, note) => {
    if (!acc[note.dateLabel]) acc[note.dateLabel] = [];
    acc[note.dateLabel].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  if (selectedNote) {
    return (
      <NoteDetail note={selectedNote} onBack={() => setSelectedNote(null)} />
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="w-full bg-white shadow-sm h-14 flex items-center justify-between px-6">
        <h1 className="text-lg font-semibold text-gray-800">Notes</h1>
        <div className="text-gray-500 text-sm">[ Navbar placeholder ]</div>
      </nav>

      {/* Main content */}
      <main className="flex-1 py-10 px-6 flex flex-col items-center">
        <h2 className="text-lg font-medium text-gray-700 mb-6 self-start max-w-3xl w-full">
          Welcome, Johnny
        </h2>

        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-sm p-10">
          {/* Notes list */}
          <div className="space-y-8">
            {Object.entries(paginatedGrouped).map(([date, notes]) => (
              <div key={date}>
                <h3 className="text-gray-600 font-semibold mb-3">{date}</h3>
                <div className="flex flex-col gap-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition cursor-pointer"
                      onClick={() => setSelectedNote(note)}
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
                      <Download className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-10">
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
