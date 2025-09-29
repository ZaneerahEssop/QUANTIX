// src/components/__tests__/Navbar.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../client';

// Mock external dependencies
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// CORRECTED MOCK: Now accepts and spreads props
jest.mock('react-icons/fa', () => ({
  FaSearch: (props) => <span data-testid="search-icon" {...props}>Search</span>,
  FaTimes: (props) => <span data-testid="close-icon" {...props}>Close</span>,
}));

// Mock fetch API
global.fetch = jest.fn();

// --- MOCK DATA ---
const mockSession = {
  data: {
    session: {
      access_token: 'mock-access-token',
      user: { id: '123', email: 'test@example.com' },
    },
  },
};

const mockVendors = [
  { vendor_id: 1, business_name: 'The Venue Collective', service_type: 'Venue', email: 'info@venuecollective.com' },
  { vendor_id: 2, business_name: 'Gourmet Delights', service_type: 'Catering', email: 'info@gourmetdelights.com' },
];

const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Navbar Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockVendors,
    });
    supabase.auth.getSession.mockResolvedValue(mockSession);
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { assign: jest.fn(), href: '' },
    });
  });

  // --- BASIC RENDERING TESTS ---

  test('renders the logo', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByText('Event-ually Perfect')).toBeInTheDocument();
  });

  test('does not show user buttons when logged out', () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    renderWithRouter(<Navbar session={null} />);
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
  });
  
  // --- ROLE-BASED RENDERING TESTS ---

  test('renders planner links on planner dashboard', () => {
    renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.queryByText('My Services')).not.toBeInTheDocument();
  });

  test('renders vendor links on vendor dashboard', () => {
    renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/vendor-dashboard' });
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('My Services')).toBeInTheDocument();
  });

  test('renders only logout button when showOnlyLogout is true', () => {
    renderWithRouter(<Navbar session={mockSession.data.session} showOnlyLogout={true} />, { route: '/dashboard' });
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('My Services')).not.toBeInTheDocument();
  });

  // --- FUNCTIONALITY TESTS ---

  test('handles logout correctly', async () => {
    renderWithRouter(<Navbar session={mockSession.data.session} />);
    const logoutButton = screen.getByText('Logout');
    
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });
  });

  // --- SEARCH FUNCTIONALITY TESTS ---
  
  describe('Search functionality on planner dashboard', () => {
    beforeEach(() => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });

    test('toggles search bar on icon click', async () => {
      const searchButton = screen.getByTestId('search-icon');
      fireEvent.click(searchButton);
      expect(screen.getByPlaceholderText('Search vendors...')).toBeInTheDocument();
      
      const closeButton = screen.getByTestId('close-icon');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search vendors...')).not.toBeInTheDocument();
      });
    });

    test('fetches and filters vendors when typing', async () => {
      fireEvent.click(screen.getByTestId('search-icon'));
      const searchInput = screen.getByPlaceholderText('Search vendors...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Venue' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('The Venue Collective')).toBeInTheDocument();
        expect(screen.queryByText('Gourmet Delights')).not.toBeInTheDocument();
      });
    });

    test('shows "No vendors found" for no matches', async () => {
      fireEvent.click(screen.getByTestId('search-icon'));
      const searchInput = screen.getByPlaceholderText('Search vendors...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      await waitFor(() => {
        expect(screen.getByText('No vendors found')).toBeInTheDocument();
      });
    });
    
    test('closes search results when clicking outside', async () => {
      fireEvent.click(screen.getByTestId('search-icon'));
      expect(screen.getByPlaceholderText('Search vendors...')).toBeInTheDocument();

      // Find the logo and click it to simulate clicking "outside"
      const logo = screen.getByText('Event-ually Perfect');
      fireEvent.click(logo);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search vendors...')).not.toBeInTheDocument();
      });
    });
  });
});