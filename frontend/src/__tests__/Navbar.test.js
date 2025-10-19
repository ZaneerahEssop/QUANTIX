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


jest.mock('react-icons/fa', () => ({
  FaSearch: (props) => <span data-testid="search-icon" {...props}>Search</span>,
  FaTimes: (props) => <span data-testid="close-icon" {...props}>Close</span>,
}));

// Mock fetch API
global.fetch = jest.fn();

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
  { vendor_id: 3, business_name: 'Blooms & Petals', service_type: 'Florist', email: 'info@bloomsandpetals.com' },
  { vendor_id: 4, business_name: 'Melody Makers', service_type: 'Music', email: 'info@melodymakers.com' },
];

const mockVendorsWithMissingData = [
  { vendor_id: 5, business_name: null, service_type: null, email: null },
  { vendor_id: 6, business_name: 'Test Vendor', service_type: '', email: undefined },
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
  let originalEnv;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    supabase.auth.getSession.mockResolvedValue(mockSession);
    supabase.auth.signOut.mockResolvedValue({ error: null });
    
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { assign: jest.fn(), href: '' },
    });

    // Mock console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Store original process.env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original process.env and console mocks
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  //basic rendering tests

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

  test('logo navigates to home when clicked', () => {
    const { container } = renderWithRouter(<Navbar />);
    const logo = screen.getByText('Event-ually Perfect');
    
    fireEvent.click(logo);
    
    expect(logo).toBeInTheDocument();
  });
  
  //role based test

  test('renders planner links on planner dashboard', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('Search for Vendors')).toBeInTheDocument();
    expect(screen.queryByText('My Services')).not.toBeInTheDocument();
  });

  test('renders vendor links on vendor dashboard', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/vendor-dashboard' });
    });
    
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('My Services')).toBeInTheDocument();
  });

  test('renders only logout button when showOnlyLogout is true', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} showOnlyLogout={true} />, { route: '/dashboard' });
    });
    
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('My Services')).not.toBeInTheDocument();
    // Search should still be visible on planner dashboard even with showOnlyLogout
    expect(screen.getByText('Search for Vendors')).toBeInTheDocument();
  });

  test('does not show search on non-planner dashboard pages', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/some-other-page' });
    });
    
    expect(screen.queryByText('Search for Vendors')).not.toBeInTheDocument();
  });

  //functionality

  test('handles logout correctly', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />);
    });
    
    const logoutButton = screen.getByText('Logout');
    
    await act(async () => {
      fireEvent.click(logoutButton);
    });
    
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });
  });

  test('navigates to edit planner profile from planner dashboard', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    const editProfileButton = screen.getByText('Edit Profile');
    
    fireEvent.click(editProfileButton);
    
    expect(editProfileButton).toBeInTheDocument();
  });

  test('navigates to edit vendor profile from vendor dashboard', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/vendor-dashboard' });
    });
    
    const editProfileButton = screen.getByText('Edit Profile');
    
    fireEvent.click(editProfileButton);
    
    expect(editProfileButton).toBeInTheDocument();
  });

  
  describe('Search functionality on planner dashboard', () => {
    beforeEach(async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockVendors,
      });
      
      await act(async () => {
        renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
      });
      
      // Wait for vendors to load
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/vendors'),
          expect.any(Object)
        );
      });
    });

    test('toggles search bar on button click', async () => {
      const searchButton = screen.getByText('Search for Vendors');
      
      await act(async () => {
        fireEvent.click(searchButton);
      });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search vendors...')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByTestId('close-icon');
      
      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search vendors...')).not.toBeInTheDocument();
      });
    });

    test('filters vendors by business name when typing', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Search for Vendors'));
      });
      
      const searchInput = screen.getByPlaceholderText('Search vendors...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Venue' } });
      });
      
      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });
      
      await waitFor(() => {
        expect(screen.getByText('The Venue Collective')).toBeInTheDocument();
        expect(screen.queryByText('Gourmet Delights')).not.toBeInTheDocument();
      });
    });

    test('filters vendors by service type when typing', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Search for Vendors'));
      });
      
      const searchInput = screen.getByPlaceholderText('Search vendors...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Catering' } });
      });
      
      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Gourmet Delights')).toBeInTheDocument();
        expect(screen.queryByText('The Venue Collective')).not.toBeInTheDocument();
      });
    });

    test('shows "No vendors found" for no matches', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Search for Vendors'));
      });
      
      const searchInput = screen.getByPlaceholderText('Search vendors...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });

      await waitFor(() => {
        expect(screen.getByText('No vendors found')).toBeInTheDocument();
      });
    });



    test('selecting vendor navigates to vendor services page', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Search for Vendors'));
      });
      
      const searchInput = screen.getByPlaceholderText('Search vendors...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Venue' } });
      });
      
      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });
      
      await waitFor(() => {
        const vendorItem = screen.getByText('The Venue Collective');
        
        fireEvent.click(vendorItem);
        
        // Search should close after selection
        expect(screen.queryByPlaceholderText('Search vendors...')).not.toBeInTheDocument();
      });
    });
  });

  // error handling

  test('handles vendor fetch error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching vendors:', expect.any(Error));
    });
  });

  test('handles vendor fetch non-ok response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching vendors:',
        expect.any(Error)
      );
    });
  });

  test('handles invalid vendor data format', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 'data' }), // Not an array
    });

    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching vendors:',
        expect.any(Error)
      );
    });
  });

  test('uses mock data in development when API fails', async () => {
    // Set NODE_ENV to development
    process.env.NODE_ENV = 'development';
    
    fetch.mockRejectedValueOnce(new Error('API failed'));
    
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith('Using mock vendor data due to API error');
    });
  });

  test('does not use mock data in production when API fails', async () => {
    // Set NODE_ENV to production
    process.env.NODE_ENV = 'production';
    
    fetch.mockRejectedValueOnce(new Error('API failed'));
    
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });

    await waitFor(() => {
      expect(consoleWarnSpy).not.toHaveBeenCalledWith('Using mock vendor data due to API error');
    });
  });

  test('does not fetch vendors when not on planner dashboard', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/some-other-route' });
    });
    
    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/vendors'));
    });
  });

  test('handles no session when fetching vendors', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });

    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // performanace tests and debouncing

  test('debounces search input', async () => {
    jest.useFakeTimers();
    
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Search for Vendors'));
    });
    
    const searchInput = screen.getByPlaceholderText('Search vendors...');

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });
    
    // Immediately after change, should not have filtered yet
    expect(screen.queryByText('No vendors found')).not.toBeInTheDocument();

    // Fast-forward timers
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      // Now filtering should have occurred
      expect(screen.getByText('No vendors found')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  // UX tests

  test('search input has correct aria-label', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    const searchButton = screen.getByLabelText('Search for vendors');
    expect(searchButton).toBeInTheDocument();
  });

  test('search input auto-focuses when opened', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Search for Vendors'));
    });
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search vendors...');
      expect(searchInput).toHaveFocus();
    });
  });

  // Edge cases 

  test('handles vendor selection with missing vendor_id', async () => {
    const vendorsWithMissingId = [{ business_name: 'Test Vendor', service_type: 'Test' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => vendorsWithMissingId,
    });

    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Search for Vendors'));
    });
    
    const searchInput = screen.getByPlaceholderText('Search vendors...');

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Test' } });
    });

    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    await waitFor(() => {
      const vendorItem = screen.getByText('Test Vendor');
      // This should not crash even with missing vendor_id
      fireEvent.click(vendorItem);
    });
  });

  test('clears search term when closing search', async () => {
    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Search for Vendors'));
    });
    
    const searchInput = screen.getByPlaceholderText('Search vendors...');
    
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'test search' } });
    });
    
    expect(searchInput.value).toBe('test search');
    
    const closeButton = screen.getByTestId('close-icon');
    
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Re-open search and verify it's cleared
    await act(async () => {
      fireEvent.click(screen.getByText('Search for Vendors'));
    });
    
    await waitFor(() => {
      const newSearchInput = screen.getByPlaceholderText('Search vendors...');
      expect(newSearchInput.value).toBe('');
    });
  });

  test('handles vendors with missing data gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVendorsWithMissingData,
    });

    await act(async () => {
      renderWithRouter(<Navbar session={mockSession.data.session} />, { route: '/dashboard' });
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Search for Vendors'));
    });
    
    const searchInput = screen.getByPlaceholderText('Search vendors...');

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Test' } });
    });

    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    await waitFor(() => {
      // Should not crash and should handle missing data
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
  });
});