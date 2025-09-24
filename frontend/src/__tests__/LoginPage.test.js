import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { supabase } from '../client';

//to silence the console warnings: 
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

const mockSignInWithOAuth = supabase.auth.signInWithOAuth;

jest.mock('../client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { user_role: 'planner' }, error: null }),
    })),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login page elements', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Check headings and login button
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    const loginButton = screen.getByRole('button', { name: /Login with Google/i });
    expect(loginButton).toBeInTheDocument();

    // Check Sign up link
    const signUpLink = screen.getByText(/Sign up here/i);
    expect(signUpLink).toBeInTheDocument();

    // Click login button to trigger mocked function
    fireEvent.click(loginButton);
  });

  test('clicking login calls GoogleOAuth sign in', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Login with Google/i }));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalled();
    });
  });

  test('redirects planner to planner dashboard', async () => {
    const { supabase } = require('../client');
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'planner123' } } },
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { user_role: 'planner' }, error: null }),
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

  test('redirects vendor to vendor dashboard', async () => {
    const { supabase } = require('../client');
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'vendor456' } } },
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { user_role: 'vendor' }, error: null }),
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

  test('shows error if user account is not found', async () => {
    const { supabase } = require('../client');
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'unknown123' } } },
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Account not found/i)).toBeInTheDocument();
  });

  test('handles GoogleOAuth sign in error', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ data: {}, error: { message: 'OAuth error' } });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Login with Google/i }));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalled();
    });
    
    expect(mockNavigate).not.toHaveBeenCalled(); //navigation doesnt happen on error
  });


});
