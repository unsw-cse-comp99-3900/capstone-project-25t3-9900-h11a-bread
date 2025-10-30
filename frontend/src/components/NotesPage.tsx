import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Download,
  ArrowLeft,
  Edit3,
  Check,
  X,
  Save,
  Trash2,
} from "lucide-react";
import Header from "./Header";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranscripts } from "../hooks/useTranscripts";

interface Note {
  id: string;
  notesContent: string;
  notesName: string;
  recordedAt: Date;
}

function groupNotesByDate(notes: Note[]): Record<string, Note[]> {
  return notes.reduce((groups, note) => {
    const dateKey = format(note.recordedAt, "EEEE, MMM d");
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
  const blob = new Blob([note.notesContent], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${note.notesName}_${format(
    note.recordedAt,
    "yyyyMMdd_HHmmss"
  )}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

//  Note Detail Page
interface NoteDetailProps {
  note: Note;
  onBack: () => void;
  updateTranscript: (
    transcriptId: string,
    updates: { notesName?: string; notesContent?: string }
  ) => Promise<void>;
  handleDetail: (id: string) => Promise<void>;
  deleteTranscript: (id: string) => Promise<void>;
}

const NoteDetail: React.FC<NoteDetailProps> = ({
  note,
  onBack,
  updateTranscript,
  handleDetail,
  deleteTranscript,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(note.notesName || "");
  const [editedContent, setEditedContent] = useState(note.notesContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateTranscript(note.id, {
      notesName: editedName,
      notesContent: editedContent,
    });
    await handleDetail(note.id);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this transcript?")) return;
    setIsDeleting(true);
    await deleteTranscript(note.id);
    setIsDeleting(false);
    onBack();
  };

  return (
    <div className="bg-gray-100 h-screen flex flex-col">
      <Header />
      <main className="px-8 py-6 pt-32 flex justify-center items-center">
        <div className="w-full max-w-3xl">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center text-gray-700 hover:text-gray-900 mb-5 transition"
          >
            <ArrowLeft className="w-4 h-8 mr-1" />
            Back
          </button>

          {/* Main card */}
          <div className="bg-white rounded-2xl shadow-sm p-8 h-[580px]">
            <div className="flex items-start justify-between mb-2">
              {/* Title */}
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 w-[70%]"
                />
              ) : (
                <h2 className="text-gray-900 font-semibold text-lg">
                  {note.notesName}
                </h2>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {!isEditing && (
                  <>
                    <button
                      onClick={() => downloadTranscript(note)}
                      className="hover:scale-110 transition"
                      title="Download transcript"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>

                    <button
                      onClick={() => setIsEditing(true)}
                      className="hover:scale-110 transition"
                      title="Edit transcript"
                    >
                      <Edit3 className="w-5 h-5 text-gray-600" />
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="hover:scale-110 transition text-red-500"
                      title="Delete transcript"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}

                {isEditing && (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="hover:scale-110 transition text-green-600"
                      title="Save changes"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedName(note.notesName);
                        setEditedContent(note.notesContent);
                      }}
                      className="hover:scale-110 transition text-gray-500"
                      title="Cancel edit"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Date */}
            <p className="text-sm text-gray-500 mb-4">
              {note.recordedAt
                ? format(
                    new Date(note.recordedAt),
                    "h:mma, MMM d, yyyy"
                  ).toLowerCase()
                : ""}
            </p>

            {/* Content area */}
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[415px] border border-gray-300 rounded-lg p-3 text-gray-800 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            ) : (
              <div
                className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-line 
                max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 h-[415px] my-5"
              >
                {note.notesContent}
              </div>
            )}
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
  const navigate = useNavigate();
  const {
    fetchTranscripts,
    transcripts,
    loading,
    fetchTranscriptById,
    updateTranscript,
    deleteTranscript,
  } = useTranscripts(user);

  useEffect(() => {
    if (user) fetchTranscripts();
  }, [user]);

  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(transcripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = transcripts.slice(
    startIndex,
    startIndex + itemsPerPage
  );
  const groupedNotes = groupNotesByDate(
    paginatedNotes.map((n) => ({
      ...n,
      createdAt: n.recordedAt,
    }))
  );

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleDetail = async (id: string) => {
    const fullNote = await fetchTranscriptById(id);
    setSelectedNote(fullNote);
  };

  if (!user) {
    navigate("/");
  }
  if (!user) return null;

  if (selectedNote) {
    return (
      <NoteDetail
        note={selectedNote}
        onBack={() => setSelectedNote(null)}
        updateTranscript={updateTranscript}
        handleDetail={handleDetail}
        deleteTranscript={deleteTranscript}
      />
    );
  }

  return (
    <div className="bg-gray-100 h-screen flex flex-col overflow-hidden">
      <Header />
      <main className="pt-32 flex justify-center px-8 py-6 items-center">
        <div className="w-full max-w-3xl">
          <h2 className="text-lg font-medium text-gray-700 mb-5 h-8">
            Welcome, {userName}
          </h2>

          <div className="bg-white rounded-2xl shadow-sm p-8 h-[580px] flex flex-col justify-between">
            {loading ? (
              <div className="flex justify-center items-center h-full text-gray-500">
                Loading transcripts...
              </div>
            ) : transcripts.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500">
                No transcripts found.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedNotes).map(([date, notes]) => (
                  <div key={date}>
                    <h3 className="text-gray-600 font-semibold mb-2">{date}</h3>
                    <div className="flex flex-col gap-2">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 hover:bg-gray-100 transition cursor-pointer"
                          onClick={() => handleDetail(note.id)}
                        >
                          <div className="flex flex-col">
                            <div className="text-gray-900 font-medium text-sm">
                              {note.notesName}{" "}
                              <span className="text-gray-500 text-xs ml-1">
                                {formatTime(new Date(note.recordedAt))}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">11:11</div>
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
            )}

            {/* Pagination */}
            {totalPages != 0 && (
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotesPage;
