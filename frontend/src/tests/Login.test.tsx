
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Login from '../components/Login';
import loginPicMobile from '../assets/login-pic-mobile.png';

// Mock the hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../hooks/useAuth');

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should navigate to home page when 'Use Without Signing In' button is clicked", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      loginWithGoogle: vi.fn(),
      loginWithFacebook: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const useWithoutSignInButton = screen.getByText("Use Without Signing In");
    fireEvent.click(useWithoutSignInButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should redirect to home page when user is already authenticated", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: { uid: "test-user-id", displayName: "Test User" },
      loginWithGoogle: vi.fn(),
      loginWithFacebook: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should render mobile login picture on mobile viewport", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      loginWithGoogle: vi.fn(),
      loginWithFacebook: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const mobileImage = screen.getByAltText("login mobile");
    expect(mobileImage).toBeInTheDocument();
    expect(mobileImage).toHaveAttribute("src", loginPicMobile);
  });

  it("should call loginWithGoogle when Google sign-in button is clicked", () => {
    const mockNavigate = vi.fn();
    const mockLoginWithGoogle = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      loginWithGoogle: mockLoginWithGoogle,
      loginWithFacebook: vi.fn(),
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const googleButton = screen.getByText("Sign in with Google");
    fireEvent.click(googleButton);

    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });

  it("should call loginWithFacebook when Facebook sign-in button is clicked", () => {
    const mockNavigate = vi.fn();
    const mockLoginWithFacebook = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      loginWithGoogle: vi.fn(),
      loginWithFacebook: mockLoginWithFacebook,
      loading: false,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const facebookButton = screen.getByText("Sign in with Facebook");
    fireEvent.click(facebookButton);

    expect(mockLoginWithFacebook).toHaveBeenCalled();
  });

  it("should disable buttons when loading", () => {
    const mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);

    const mockUseAuth = {
      user: null,
      loginWithGoogle: vi.fn(),
      loginWithFacebook: vi.fn(),
      loading: true,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const googleButton = screen.getByText("Signing in...");
    expect(googleButton).toBeDisabled();
  });
});
