import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PendingApprovalPage from '../pages/PendingApproval.jsx'; // Explicit .jsx extension
// Debug import at top level
console.log('PendingApprovalPage import:', PendingApprovalPage);
try {
  console.log('Resolved path:', require.resolve('../pages/PendingApproval.jsx'));
} catch (e) {
  console.error('Failed to resolve PendingApproval:', e.message);
}
import { supabase } from '../client';

// Mock Navbar component
jest.mock('../components/Navbar', () => ({ session, showOnlyLogout }) => (
  <div data-testid="navbar">Navbar: {showOnlyLogout ? 'Logout Only' : 'Full'}</div>
));

// Mock CSS import
jest.mock('../styling/PendingApproval.css', () => ({}));

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
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

describe('PendingApprovalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for getSession
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user123' } } },
      error: null,
    });
    // Default mock for vendors table
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }),
        }),
      }),
    });
  });

  // Suppress console warnings
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  });
  afterAll(() => {
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  test('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <PendingApprovalPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('redirects to login if no user session', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PendingApprovalPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('renders pending status UI when status is pending', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PendingApprovalPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log('Pending test DOM:', screen.debug());
      expect(screen.getByText('Application Under Review')).toBeInTheDocument();
      expect(
        screen.getByText(/Thank you for registering as a vendor/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Once approved, you’ll gain access/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId('navbar')).toHaveTextContent('Navbar: Logout Only');
    });
  });

  test('renders rejected status UI when status is rejected', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { status: 'rejected' }, error: null }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PendingApprovalPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log('Rejected test DOM:', screen.debug());
      expect(screen.getByText('Application Rejected')).toBeInTheDocument();
      expect(
        screen.getByText(/Unfortunately, your vendor application has been rejected/i)
      ).toBeInTheDocument();
    });
  });

  test('renders unknown status UI for unexpected status', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { status: 'unknown' }, error: null }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PendingApprovalPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log('Unknown test DOM:', screen.debug());
      expect(screen.getByText('Unknown Status')).toBeInTheDocument();
      expect(
        screen.getByText(/We couldn’t determine your application status/i)
      ).toBeInTheDocument();
    });
  });

  test('redirects to vendor-dashboard when status is accepted', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { status: 'accepted' }, error: null }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PendingApprovalPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/vendor-dashboard');
    });
  });

  test('falls back to pending status on Supabase error', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PendingApprovalPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log('Supabase error test DOM:', screen.debug());
      expect(screen.getByText('Application Under Review')).toBeInTheDocument();
      expect(
        screen.getByText(/Thank you for registering as a vendor/i)
      ).toBeInTheDocument();
    });
  });

  test('falls back to pending status when no vendor data', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PendingApprovalPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log('No vendor data test DOM:', screen.debug());
      expect(screen.getByText('Application Under Review')).toBeInTheDocument();
      expect(
        screen.getByText(/Thank you for registering as a vendor/i)
      ).toBeInTheDocument();
    });
  });
});