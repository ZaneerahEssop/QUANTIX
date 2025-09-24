import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoadingPage from '../pages/LoadingPage';
import { supabase } from '../client';

// Silence console warnings
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

// Mock useNavigate and useLocation
const mockNavigate = jest.fn();
const mockLocation = { pathname: '/loading' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Mock supabase
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('LoadingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    });
  });

  test('renders loading spinner and text', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );
    expect(getByText(/Loading your dashboard.../i)).toBeInTheDocument();
  });

  test('navigates to login if no session', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('navigates to post-signup if session and signupRole exists', async () => {
    sessionStorage.setItem('signupRole', 'planner');
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user123' } } } });

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/post-signup');
    });
  });

  test('navigates to dashboard for planner role', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user123' } } } });
    supabase.from().single.mockResolvedValueOnce({ data: { user_role: 'planner' } });

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('navigates to vendor-dashboard for accepted vendor', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user123' } } } });
    supabase.from().single
      .mockResolvedValueOnce({ data: { user_role: 'vendor' } }) // users table
      .mockResolvedValueOnce({ data: { status: 'accepted' } }); // vendors table

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/vendor-dashboard');
    });
  });

  test('navigates to pending-approval for pending vendor', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user123' } } } });
    supabase.from().single
      .mockResolvedValueOnce({ data: { user_role: 'vendor' } })
      .mockResolvedValueOnce({ data: { status: 'pending' } });

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pending-approval');
    });
  });

  test('navigates to pending-approval with rejected state for rejected vendor', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user123' } } } });
    supabase.from().single
      .mockResolvedValueOnce({ data: { user_role: 'vendor' } })
      .mockResolvedValueOnce({ data: { status: 'rejected' } });

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pending-approval', { state: { status: 'rejected' } });
    });
  });

  test('navigates to admin-dashboard for admin role', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user123' } } } });
    supabase.from().single.mockResolvedValueOnce({ data: { user_role: 'admin' } });

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
    });
  });

  test('navigates to login on error fetching role', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user123' } } } });
    supabase.from().single.mockResolvedValueOnce({ error: { message: 'error' } });

    render(
      <MemoryRouter>
        <LoadingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});