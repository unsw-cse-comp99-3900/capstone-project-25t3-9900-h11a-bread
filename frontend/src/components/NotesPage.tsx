import React, { useState } from "react";
import { format } from "date-fns";
import { Download, ArrowLeft } from "lucide-react";
import Header from "./Header";
import { useAuth } from "../hooks/useAuth";

interface Note {
  id: number;
  name: string;
  createdAt: Date;
  durationSec: number;
  transcript: string;
}

const userName = "Johnny";
const mode = "afterLogin";
const handleLogout = () => {
  console.log("user logged out");
};

// Utility Functions
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
      transcript: `SpeakerA: Today we are going to talk about communication in our daily lives, and not just the simple exchange of words, but the deeper meaning behind how we connect with each other...\n\nSpeakerB: Think about a time when you felt completely understood—what made that moment work so well?\n\nSpeakerA: On the other hand, remember a time when communication broke down—what was missing?SpeakerA: Today we are going to talk about communication in our daily lives, and not just the simple exchange of words, but the deeper meaning behind how we connect with each other...\n\nSpeakerB: Think about a time when you felt completely understood—what made that moment work so well?\n\nSpeakerA: On the other hand, remember a time when communication broke down—what was missing?SpeakerA: Today we are going to talk about communication in our daily lives, and not just the simple exchange of words, but the deeper meaning behind how we connect with each other...\n\nSpeakerB: Think about a time when you felt completely understood—what made that moment work so well?\n\nSpeakerA: On the other hand, remember a time when communication broke down—what was missing?SpeakerA: Today we are going to talk about communication in our daily lives, and not just the simple exchange of words, but the deeper meaning behind how we connect with each other...\n\nSpeakerB: Think about a time when you felt completely understood—what made that moment work so well?\n\nSpeakerA: On the other hand, remember a time when communication broke down—what was missing?`,
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

//  Note Detail Page
const NoteDetail: React.FC<{ note: Note; onBack: () => void }> = ({
  note,
  onBack,
}) => {
  return (
    <div className="bg-gray-100 h-full flex flex-col overflow-hidden">
      <Header mode={mode} userName={userName} onLogout={handleLogout} />
      <main className="px-8 py-6 pt-32 flex justify-center items-center">
        <div className="w-full max-w-3xl">
          <button
            onClick={onBack}
            className="flex items-center text-gray-700 hover:text-gray-900 mb-5 transition"
          >
            <ArrowLeft className="w-4 h-8 mr-1" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-sm p-8 h-[580px]">
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

            <p className="text-sm text-gray-500 mb-4">
              {format(note.createdAt, "h:mma, MMM d, yyyy").toLowerCase()}
            </p>

            <div
              className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-line 
             
             max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-[415px] my-5"
            >
              {note.transcript}
            </div>
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
  const { user } = useAuth();
  const userName = user?.displayName;
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
    <div className="bg-gray-100 h-screen flex flex-col overflow-hidden">
      <Header mode={mode} onLogout={handleLogout} />
      <main className="pt-32 flex justify-center px-8 py-6 items-center">
        <div className="w-full max-w-3xl">
          <h2 className="text-lg font-medium text-gray-700 mb-5 h-8">
            Welcome, {userName}
          </h2>
          <div className="bg-white rounded-2xl shadow-sm p-8 h-[580px] flex flex-col justify-between">
            <div className="space-y-6">
              {Object.entries(paginatedGrouped).map(([date, notes]) => (
                <div key={date}>
                  <h3 className="text-gray-600 font-semibold mb-2">{date}</h3>
                  <div className="flex flex-col gap-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 hover:bg-gray-100 transition cursor-pointer"
                        onClick={() => setSelectedNote(note)}
                      >
                        <div className="flex flex-col">
                          <div className="text-gray-900 font-medium text-sm">
                            {note.name}{" "}
                            <span className="text-gray-500 text-xs ml-1">
                              {formatTime(note.createdAt)}
                            </span>
                          </div>
                          <div className="text-gray-400 text-xs">
                            {formatDuration(note.durationSec)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTranscript(note);
                          }}
                          className="ml-2 hover:scale-110 transition"
                          title="Download transcript"
                        >
                          <Download className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40 text-xs"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="text-xs text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40 text-xs"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotesPage;
