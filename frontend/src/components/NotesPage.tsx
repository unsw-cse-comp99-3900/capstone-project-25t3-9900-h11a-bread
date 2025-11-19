import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Download,
  ArrowLeft,
  Edit3,
  X,
  Save,
  Trash2,
  Sparkles,
} from "lucide-react";
import Header from "./Header";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranscripts } from "../hooks/useTranscripts";
import { summarizeText } from "../utils/deepseek";

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
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string>("");

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

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummaryError("");
    try {
      const result = await summarizeText(note.notesContent);
      setSummary(result);
      setShowSummary(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate summary";
      setSummaryError(errorMessage);
      console.error("Summarization error:", error);
    } finally {
      setIsSummarizing(false);
    }
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
                      onClick={handleSummarize}
                      disabled={isSummarizing}
                      className="hover:scale-110 transition text-purple-600 disabled:opacity-50"
                      title="AI Summary"
                    >
                      <Sparkles
                        className={`w-5 h-5 ${
                          isSummarizing ? "animate-pulse" : ""
                        }`}
                      />
                    </button>

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

            {/* Summary Section */}
            {showSummary && summary && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Summary
                  </h3>
                  <button
                    onClick={() => setShowSummary(false)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {summary}
                </div>
              </div>
            )}

            {/* Summary Error */}
            {summaryError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-700">{summaryError}</p>
                  <button
                    onClick={() => setSummaryError("")}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Content area */}
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[415px] border border-gray-300 rounded-lg p-3 text-gray-800 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            ) : (
              <div
                className={`text-gray-800 text-[15px] leading-relaxed whitespace-pre-line 
                max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 my-5 ${
                  showSummary ? "h-[280px]" : "h-[415px]"
                }`}
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

  const itemsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const [reverseOrder, setReverseOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Filter by search
  const filteredTranscripts = transcripts.filter((t) =>
    t.notesName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Sort by date, then apply direction
  const sortedFilteredTranscripts = [...filteredTranscripts].sort((a, b) => {
    const aTime = new Date(a.recordedAt).getTime();
    const bTime = new Date(b.recordedAt).getTime();
    return reverseOrder ? aTime - bTime : bTime - aTime; // false = Newest → Oldest
  });

  // 3. Pagination based on filtered+sorted list
  const totalPages =
    Math.ceil(sortedFilteredTranscripts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = sortedFilteredTranscripts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // 4. Group notes by date
  const groupedNotes = groupNotesByDate(paginatedNotes);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleDetail = async (id: string) => {
    const fullNote = await fetchTranscriptById(id);
    if (fullNote) {
      setSelectedNote(fullNote);
    }
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
          <h2 className="text-lg font-medium text-gray-700 mb-5 h-8 flex items-center justify-between">
            <span className="hidden sm:block">Welcome, {userName}</span>

            <div className="flex items-center gap-3">
              {/* Sort Toggle */}
              <button
                onClick={() => {
                  setReverseOrder((prev) => !prev);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 text-xs rounded-lg border border-gray-300 bg-white hover:bg-gray-100 shadow-sm transition"
              >
                {reverseOrder ? "Oldest → Newest" : "Newest → Oldest"}
              </button>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearchTerm(e.target.value);
                }}
                className="px-3 py-1 text-xs w-36 border border-gray-300 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              />
            </div>
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
              <div className="h-full flex flex-col gap-2">
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
                              {/* <span className="text-gray-500 text-xs ml-1">
                                {formatTime(new Date(note.recordedAt))}
                              </span> */}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {formatTime(new Date(note.recordedAt))}
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
            )}

            {/* Pagination */}
            {totalPages != 0 && (
              <div className="flex justify-center items-center gap-4">
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
