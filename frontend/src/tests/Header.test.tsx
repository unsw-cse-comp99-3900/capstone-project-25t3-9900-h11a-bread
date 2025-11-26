import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Header from "../components/Header";

// Mock the hooks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock("../hooks/useAuth");

describe("Header Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the brand logo and navigate to home page when logo is clicked", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      logout: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const logo = screen.getByAltText("Brand logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/logo.png");

    fireEvent.click(logo);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should render login button when user is not authenticated", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      logout: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const loginButton = screen.getByText("Log in");
    expect(loginButton).toBeInTheDocument();

    fireEvent.click(loginButton);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should render user avatar when user is authenticated", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: {
        uid: "test-user-id",
        displayName: "Test User",
        email: "test@example.com",
      },
      logout: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const avatarButton = screen.getByText("T");
    expect(avatarButton).toBeInTheDocument();
    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
  });

  it("should toggle profile popup when user avatar is clicked", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: {
        uid: "test-user-id",
        displayName: "Test User",
        email: "test@example.com",
      },
      logout: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const avatarButton = screen.getByText("T");
    expect(screen.queryByText("Hi, Test")).not.toBeInTheDocument();

    // Open popup
    fireEvent.click(avatarButton);
    expect(screen.getByText("Hi, Test")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    // Close popup
    fireEvent.click(avatarButton);
    expect(screen.queryByText("Hi, Test")).not.toBeInTheDocument();
  });

  it("should close popup when clicking outside", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: {
        uid: "test-user-id",
        displayName: "Test User",
        email: "test@example.com",
      },
      logout: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const avatarButton = screen.getByText("T");
    fireEvent.click(avatarButton);

    expect(screen.getByText("Hi, Test")).toBeInTheDocument();

    // Click outside (on the backdrop)
    const backdrop = screen.getByText("Hi, Test").closest(".fixed");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(screen.queryByText("Hi, Test")).not.toBeInTheDocument();
    }
  });

  it("should navigate to notes page and close popup when 'My Transcripts' button is clicked", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: {
        uid: "test-user-id",
        displayName: "Test User",
        email: "test@example.com",
      },
      logout: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const avatarButton = screen.getByText("T");
    fireEvent.click(avatarButton);

    expect(screen.getByText("My Transcripts")).toBeInTheDocument();

    const myTranscriptsButton = screen.getByText("My Transcripts");
    fireEvent.click(myTranscriptsButton);

    expect(mockNavigate).toHaveBeenCalledWith("/notes");
    expect(screen.queryByText("Hi, Test")).not.toBeInTheDocument();
  });

  it("should call logout function, close popup, and navigate to home when 'Log Out' button is clicked", async () => {
    const mockNavigate = vi.fn();
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: {
        uid: "test-user-id",
        displayName: "Test User",
        email: "test@example.com",
      },
      logout: mockLogout,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const avatarButton = screen.getByText("T");
    fireEvent.click(avatarButton);

    expect(screen.getByText("Log Out")).toBeInTheDocument();

    const logoutButton = screen.getByText("Log Out");
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
      expect(screen.queryByText("Hi, Test")).not.toBeInTheDocument();
    });
  });

  it("should not render anything while loading", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      logout: vi.fn(),
      loading: true,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
    expect(screen.getByAltText("Brand logo")).toBeInTheDocument();
  });
});
