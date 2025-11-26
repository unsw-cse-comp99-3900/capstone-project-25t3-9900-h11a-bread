
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTranscripts } from "../hooks/useTranscripts";
import { summarizeText } from "../utils/deepseek";
import NotesPage, { NoteDetail } from "../components/NotesPage";

// Define Note type
interface Note {
  id: string;
  notesName: string;
  notesContent: string;
  recordedAt: Date;
}

// Mock the hooks and utilities at the top level
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock("../hooks/useAuth");
vi.mock("../hooks/useTranscripts");

vi.mock("../utils/deepseek", () => ({
  summarizeText: vi.fn(),
}));

describe("NotesPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: logged-in user so Header never crashes.
    (useAuth as unknown as vi.Mock).mockReturnValue({
      user: { uid: "default-user", displayName: "Default User" },
      loading: false,
      logout: vi.fn(),
    });

    // Default: empty transcripts so components that call the hook don't explode.
    (useTranscripts as unknown as vi.Mock).mockReturnValue({
      fetchTranscripts: vi.fn(),
      transcripts: [],
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    });
  });


  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should redirect to home page when user is not authenticated", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: [],
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should display loading state when transcripts are being fetched", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUser = { uid: "test-user", displayName: "Test User" };
    const mockUseAuth = {
      user: mockUser,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: [],
      loading: true,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading transcripts...")).toBeInTheDocument();
  });

  it("should display 'No transcripts found' when there are no transcripts", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUser = { uid: "test-user", displayName: "Test User" };
    const mockUseAuth = {
      user: mockUser,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: [],
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    expect(screen.getByText("No transcripts found.")).toBeInTheDocument();
  });

  it("should display transcripts when available", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUser = { uid: "test-user", displayName: "Test User" };
    const mockUseAuth = {
      user: mockUser,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const mockTranscripts = [
      {
        id: "1",
        notesName: "Test Note 1",
        notesContent: "Content 1",
        recordedAt: new Date("2024-01-15T10:30:00"),
      },
      {
        id: "2",
        notesName: "Test Note 2",
        notesContent: "Content 2",
        recordedAt: new Date("2024-01-16T14:20:00"),
      },
    ];

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: mockTranscripts,
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Test Note 1")).toBeInTheDocument();
    expect(screen.getByText("Test Note 2")).toBeInTheDocument();
  });

  it("should group notes by date correctly when multiple notes have the same date", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUser = { uid: "test-user", displayName: "Test User" };
    const mockUseAuth = {
      user: mockUser,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const sameDate = new Date("2024-01-15T10:00:00");
    const mockTranscripts = [
      {
        id: "1",
        notesName: "Note 1",
        notesContent: "Content 1",
        recordedAt: sameDate,
      },
      {
        id: "2",
        notesName: "Note 2",
        notesContent: "Content 2",
        recordedAt: sameDate,
      },
      {
        id: "3",
        notesName: "Note 3",
        notesContent: "Content 3",
        recordedAt: new Date("2024-01-16T10:00:00"),
      },
    ];

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: mockTranscripts,
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    const mondayJan15 = screen.getByText("Monday, Jan 15");
    expect(mondayJan15).toBeInTheDocument();

    const note1 = screen.getByText("Note 1");
    const note2 = screen.getByText("Note 2");
    expect(note1).toBeInTheDocument();
    expect(note2).toBeInTheDocument();

    const tuesdayJan16 = screen.getByText("Tuesday, Jan 16");
    expect(tuesdayJan16).toBeInTheDocument();
    const note3 = screen.getByText("Note 3");
    expect(note3).toBeInTheDocument();
  });

  it("should filter transcripts based on search term", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUser = { uid: "test-user", displayName: "Test User" };
    const mockUseAuth = {
      user: mockUser,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const mockTranscripts = [
      {
        id: "1",
        notesName: "Meeting Notes",
        notesContent: "Content 1",
        recordedAt: new Date("2024-01-15T10:00:00"),
      },
      {
        id: "2",
        notesName: "Lecture Notes",
        notesContent: "Content 2",
        recordedAt: new Date("2024-01-16T10:00:00"),
      },
      {
        id: "3",
        notesName: "Interview Transcript",
        notesContent: "Content 3",
        recordedAt: new Date("2024-01-17T10:00:00"),
      },
    ];

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: mockTranscripts,
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText("Search notes...");
    fireEvent.change(searchInput, { target: { value: "meeting" } });

    expect(screen.getByText("Meeting Notes")).toBeInTheDocument();
    expect(screen.queryByText("Lecture Notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Interview Transcript")).not.toBeInTheDocument();
  });

  it("should sort transcripts in reverse chronological order by default (newest first)", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUser = { uid: "test-user-id", displayName: "Test User" };
    const mockUseAuth = {
      user: mockUser,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const mockTranscripts = [
      {
        id: "1",
        notesName: "Oldest Note",
        notesContent: "Content 1",
        recordedAt: new Date("2024-01-01"),
      },
      {
        id: "2",
        notesName: "Middle Note",
        notesContent: "Content 2",
        recordedAt: new Date("2024-01-15"),
      },
      {
        id: "3",
        notesName: "Newest Note",
        notesContent: "Content 3",
        recordedAt: new Date("2024-01-30"),
      },
    ];

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: mockTranscripts,
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    const notes = screen.getAllByText(/Note/);
    expect(notes[0]).toHaveTextContent("Newest Note");
    expect(notes[1]).toHaveTextContent("Middle Note");
    expect(notes[2]).toHaveTextContent("Oldest Note");
  });

  it("should download transcript with correct filename format including date and time", () => {
    const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
    const mockRevokeObjectURL = vi.fn();
    (global as any).URL.createObjectURL = mockCreateObjectURL;
    (global as any).URL.revokeObjectURL = mockRevokeObjectURL;

    // We will capture the <a> element your component creates
    let appendedAnchor: HTMLAnchorElement | null = null;

    // Save originals so we can still mount the app normally
    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;

    // Intercept appendChild: when it's an <a>, remember it; otherwise behave normally
    vi.spyOn(document.body, "appendChild").mockImplementation(((node: any) => {
      if (node instanceof HTMLAnchorElement) {
        appendedAnchor = node;
      }
      return originalAppendChild.call(document.body, node);
    }) as any);

    // removeChild can just delegate to the original
    vi.spyOn(document.body, "removeChild").mockImplementation(((node: any) => {
      return originalRemoveChild.call(document.body, node);
    }) as any);

    // Spy on anchor click to assert it was triggered
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const testNote = {
      id: "test-id",
      notesName: "Test Note",
      notesContent: "This is test content",
      recordedAt: new Date("2024-01-15T14:30:00"),
    };

    const mockNavigate = vi.fn();
    (useNavigate as unknown as vi.Mock).mockReturnValue(mockNavigate);

    (useAuth as unknown as vi.Mock).mockReturnValue({
      user: { uid: "test-user", displayName: "Test User" },
      loading: false,
      logout: vi.fn(),
    });

    (useTranscripts as unknown as vi.Mock).mockReturnValue({
      fetchTranscripts: vi.fn(),
      transcripts: [testNote],
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    });

    render(
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    );

    // If there's exactly one download button, getByTitle is enough:
    const downloadButton = screen.getByTitle("Download transcript");
    // If you expect multiple, you can keep getAllByTitle(...)[0] instead.

    fireEvent.click(downloadButton);

    // Assertions
    expect(appendedAnchor).not.toBeNull();
    expect(appendedAnchor!.download).toBe("Test Note_20240115_143000.txt");
    expect(clickSpy).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("should generate AI summary and display it in purple-themed section when summarize button is clicked", async () => {
    const mockNavigate = vi.fn();

    // get the mocked function instance
    const mockSummarizeText = summarizeText as unknown as vi.Mock;

    // set its behavior for this test
    mockSummarizeText.mockResolvedValue(
      "This is a test summary of the content."
    );

    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: { uid: "test-user-id", displayName: "Test User" },
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    const mockUseTranscripts = {
      fetchTranscripts: vi.fn(),
      transcripts: [],
      loading: false,
      fetchTranscriptById: vi.fn(),
      updateTranscript: vi.fn(),
      deleteTranscript: vi.fn(),
    };
    (useTranscripts as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseTranscripts
    );

    const mockNote = {
      id: "1",
      notesName: "Test Note",
      notesContent: "This is test content for summarization.",
      recordedAt: new Date("2024-01-15T10:30:00"),
    };

    const mockOnBack = vi.fn();
    const mockUpdateTranscript = vi.fn();
    const mockHandleDetail = vi.fn();
    const mockDeleteTranscript = vi.fn();

    render(
      <MemoryRouter>
        <NoteDetail
          note={mockNote}
          onBack={mockOnBack}
          updateTranscript={mockUpdateTranscript}
          handleDetail={mockHandleDetail}
          deleteTranscript={mockDeleteTranscript}
        />
      </MemoryRouter>
    );

    const summarizeButton = screen.getByTitle("AI Summary");
    fireEvent.click(summarizeButton);

    await waitFor(() => {
      expect(mockSummarizeText).toHaveBeenCalledWith(mockNote.notesContent);
    });

    await waitFor(() => {
      expect(screen.getByText("AI Summary")).toBeInTheDocument();
      expect(
        screen.getByText("This is a test summary of the content.")
      ).toBeInTheDocument();
    });

    const summarySection = screen
      .getByText("This is a test summary of the content.")
      .closest("div");
    expect(summarySection?.parentElement).toHaveClass(
      "bg-purple-50",
      "border-purple-200"
    );
  });
});
