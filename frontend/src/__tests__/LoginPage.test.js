import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { supabase } from '../client';

// To silence the console warnings
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

// Mock react-router-dom's useNavigate and Link
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// *** FIX 1: Mock the icon library ***
jest.mock('react-icons/fa', () => ({
  FaArrowLeft: () => <i data-testid="fa-arrow-left-icon" />,
}));

// Mock window.location
const originalLocation = window.location;

beforeAll(() => {
  delete window.location;
  window.location = {
    ...originalLocation,
    protocol: 'http:',
    host: 'localhost:3000',
    search: '', // Add search property for URLSearchParams
  };
});

afterAll(() => {
  window.location = originalLocation;
});

// Mock supabase
jest.mock('../client', () => {
  const mockAuth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }), // Mock signOut
  };

  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { user_role: 'planner' }, error: null }),
  }));

  return {
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to their initial implementation
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    supabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });

    // Reset the from mock chain
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { user_role: 'planner' }, error: null }),
    });
    // Reset window.location.search
    window.location.search = '';
  });

  test('renders login page elements', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Check headings and login button
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    expect(screen.getByText(/Event-ually Perfect/i)).toBeInTheDocument();
    const loginButton = screen.getByRole('button', { name: /Login with Google/i });
    expect(loginButton).toBeInTheDocument();

    // Check Sign up link
    const signUpLink = screen.getByText(/Sign up here/i);
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/signup');
  });

  test('clicking login calls GoogleOAuth sign in with correct redirect URL', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Login with Google/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/loading',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        },
      });
    });
  });

  test('redirects planner to planner dashboard', async () => {
    // Mock session with user
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'planner123' } } },
    });

    // Mock user role as planner
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { user_role: 'planner' },
        error: null,
      }),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // *** FIX 2: Test for 'approved' status ***
  test('redirects vendor to vendor dashboard when status is approved', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'vendor456' } } },
    });

    // Mock user role as vendor, then vendor status as 'approved'
    const mockSingle = jest.fn()
      .mockResolvedValueOnce({
        data: { user_role: 'vendor' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { status: 'approved' }, // <-- FIX: Was 'accepted'
        error: null,
      });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/vendor-dashboard');
    });
  });

  // *** FIX 3: Test for '/vendor-pending' route ***
  test('redirects vendor to vendor-pending when status is pending', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'vendor456' } } },
    });

    const mockSingle = jest.fn()
      .mockResolvedValueOnce({
        data: { user_role: 'vendor' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { status: 'pending' },
        error: null,
      });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/vendor-pending'); // <-- FIX: Was '/pending-approval'
    });
  });

  // *** FIX 4: Test for '/vendor-rejected' route ***
  test('redirects vendor to vendor-rejected when status is rejected', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'vendor456' } } },
    });

    const mockSingle = jest.fn()
      .mockResolvedValueOnce({
        data: { user_role: 'vendor' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { status: 'rejected' },
        error: null,
      });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/vendor-rejected'); // <-- FIX: Was '/pending-approval'
    });
  });

  // *** FIX 5: Test for error message, not redirect ***
  test('shows error when vendor record not found', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'vendor456' } } },
    });

    const mockSingle = jest.fn()
      .mockResolvedValueOnce({
        data: { user_role: 'vendor' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Assert that the error message is shown
    await waitFor(() => {
      expect(screen.getByText('Error verifying vendor status. Please try again.')).toBeInTheDocument();
    });
    // Assert that no navigation happened
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('redirects admin to admin dashboard', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin123' } } },
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { user_role: 'admin' },
        error: null,
      }),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
    });
  });

  test('shows error if user account is not found', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'unknown123' } } },
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'not found' },
      }),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Account not found. Please sign up first./i)).toBeInTheDocument();
    // Also check that the user was signed out
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test('handles GoogleOAuth sign in error', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: {},
      error: { message: 'OAuth error' },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Login with Google/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
    });

    expect(await screen.findByText('Failed to sign in with Google. Please try again.')).toBeInTheDocument();
  });

  test('handles unexpected error during sign in', async () => {
    // Mock console.error to track the error logging
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    supabase.auth.signInWithOAuth.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Login with Google/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error during sign in:', expect.any(Error));
    });

    expect(await screen.findByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  test('cleans up auth subscription on unmount', () => {
    const unsubscribeMock = jest.fn();
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    });

    const { unmount } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});