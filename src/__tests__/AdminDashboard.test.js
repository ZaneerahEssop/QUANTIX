import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard.jsx'; // Explicit .jsx extension
// Debug import
console.log('AdminDashboard import:', AdminDashboard);
try {
  console.log('Resolved path:', require.resolve('../pages/AdminDashboard.jsx'));
} catch (e) {
  console.error('Failed to resolve AdminDashboard:', e.message);
}
import { supabase } from '../client';

// Mock dependencies
jest.mock('../styling/AdminDashboard.css', () => ({}));
jest.mock('react-icons/fa', () => ({
  FaClock: () => <span data-testid="fa-clock">FaClock</span>,
  FaCheckCircle: () => <span data-testid="fa-check-circle">FaCheckCircle</span>,
  FaTimesCircle: () => <span data-testid="fa-times-circle">FaTimesCircle</span>,
  FaListAlt: () => <span data-testid="fa-list-alt">FaListAlt</span>,
}));

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
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('AdminDashboard', () => {
  const mockVendors = [
    {
      vendor_id: '1',
      vendor_name: 'Vendor 1',
      business_name: 'Business 1',
      service_type: 'Catering',
      contact_number: '1234567890',
      created_at: '2023-10-01T10:00:00Z',
      status: 'pending',
    },
    {
      vendor_id: '2',
      vendor_name: 'Vendor 2',
      business_name: 'Business 2',
      service_type: 'Photography',
      contact_number: '0987654321',
      created_at: '2023-10-02T10:00:00Z',
      status: 'accepted',
    },
    {
      vendor_id: '3',
      vendor_name: 'Vendor 3',
      business_name: 'Business 3',
      service_type: 'Decor',
      contact_number: '1122334455',
      created_at: '2023-10-03T10:00:00Z',
      status: 'rejected',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user123' } } },
      error: null,
    });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { user_role: 'admin' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'vendors') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockVendors,
              error: null,
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  // Suppress console warnings and errors, but allow specific logs
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation((msg) => {
      if (!msg.includes('Error fetching vendors') && !msg.includes('Error updating vendor')) {
        console.log('Console error:', msg);
      }
    });
  });
  afterAll(() => {
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  test('renders loading state initially', async () => {
    // Mock vendors to return empty array to avoid filter error
    supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { user_role: 'admin' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'vendors') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

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
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('redirects to login if user is not admin', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { user_role: 'vendor' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('renders dashboard for admin user', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Admin!')).toBeInTheDocument();
      expect(screen.getByText('Pending Vendors')).toBeInTheDocument();
      expect(screen.getByText('Approved Vendors')).toBeInTheDocument();
      expect(screen.getByText('Rejected Vendors')).toBeInTheDocument();
      expect(screen.getByText('Total Vendors')).toBeInTheDocument();
      expect(screen.getByText('Vendors')).toBeInTheDocument();
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
    });
  });

  test('displays correct stats for vendors', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('pending-count')).toHaveTextContent('1');
      expect(screen.getByTestId('accepted-count')).toHaveTextContent('1');
      expect(screen.getByTestId('rejected-count')).toHaveTextContent('1');
      expect(screen.getByTestId('total-count')).toHaveTextContent('3');
    });
  });

  test('filters vendors by status', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
      expect(screen.getByText('Vendor 2')).toBeInTheDocument();
      expect(screen.getByText('Vendor 3')).toBeInTheDocument();
    });

    // Change filter to Pending
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Pending' } });

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
      expect(screen.queryByText('Vendor 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Vendor 3')).not.toBeInTheDocument();
    });
  });

  test('handles accept action', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { user_role: 'admin' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'vendors') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  vendor_id: '1',
                  vendor_name: 'Vendor 1',
                  status: 'pending',
                  business_name: 'Business 1',
                  service_type: 'Catering',
                  contact_number: '1234567890',
                  created_at: '2023-10-01T10:00:00Z',
                },
              ],
              error: null,
            }),
          }),
          update: updateMock,
        };
      }
      return {};
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Accept'));
    });

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ status: 'accepted' });
      expect(screen.getByText('Processed')).toBeInTheDocument();
    });
  });

  test('handles reject action', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { user_role: 'admin' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'vendors') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  vendor_id: '1',
                  vendor_name: 'Vendor 1',
                  status: 'pending',
                  business_name: 'Business 1',
                  service_type: 'Catering',
                  contact_number: '1234567890',
                  created_at: '2023-10-01T10:00:00Z',
                },
              ],
              error: null,
            }),
          }),
          update: updateMock,
        };
      }
      return {};
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Decline'));
    });

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ status: 'rejected' });
      expect(screen.getByText('Processed')).toBeInTheDocument();
    });
  });

  test('handles logout', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockedNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('handles Supabase error when fetching vendors', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { user_role: 'admin' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'vendors') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: { message: 'Database error' } }),
          }),
        };
      }
      return {};
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('No vendors found.')).toBeInTheDocument();
    });
  });
});