import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddEventForm from '../pages/AddEventForm.jsx';
import { supabase } from '../client';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock icons
jest.mock('react-icons/fa', () => ({
  FaArrowLeft: () => <span data-testid="fa-arrow-left">FaArrowLeft</span>,
  FaArrowDown: () => <span data-testid="fa-arrow-down">FaArrowDown</span>,
  FaArrowUp: () => <span data-testid="fa-arrow-up">FaArrowUp</span>,
  FaCalendarAlt: () => <span data-testid="fa-calendar-alt">FaCalendarAlt</span>,
  FaCheck: () => <span data-testid="fa-check">FaCheck</span>,
  FaClock: () => <span data-testid="fa-clock">FaClock</span>,
  FaPlus: () => <span data-testid="fa-plus">FaPlus</span>,
  FaSearch: () => <span data-testid="fa-search">FaSearch</span>,
  FaTimes: () => <span data-testid="fa-times">FaTimes</span>,
  FaUsers: () => <span data-testid="fa-users">FaUsers</span>,
}));

// Mock CSS
jest.mock('../AddEventForm.css', () => ({}));

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
      getUser: jest.fn(),
    },
  },
}));

describe('AddEventForm', () => {
  const mockVendors = [
    {
      vendor_id: 1,
      business_name: 'Elegant Events',
      service_type: 'Venue',
      contact_number: '(555) 123-4567',
      email: 'info@elegantevents.com',
      address: '123 Event St, New York, NY',
      description: 'A beautiful venue for all types of events with modern amenities and professional staff.',
      venue_names: ['Main Hall', 'Garden Pavilion', 'Conference Room']
    },
    {
      vendor_id: 2,
      business_name: 'Perfect Clicks Photography',
      service_type: 'Photography',
      contact_number: '(555) 234-5678',
      email: 'hello@perfectclicks.com',
      address: '456 Photo Ave, New York, NY',
      description: 'Professional photography services capturing your special moments with creativity and style.',
    },
    {
      vendor_id: 3,
      business_name: 'Gourmet Delights',
      service_type: 'Catering',
      contact_number: '(555) 567-8901',
      email: 'catering@gourmetdelights.com',
      address: '654 Food Blvd, New York, NY',
      description: 'Delicious catering services with a variety of menu options for any occasion.',
    },
    {
      vendor_id: 4,
      business_name: 'Multi-Service Vendor',
      service_type: 'Catering,Decor,Music',
      contact_number: '(555) 999-8888',
      email: 'info@multiservice.com',
      address: '789 Multi St, New York, NY',
      description: 'We provide multiple services for your convenience.',
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock environment variable
    process.env.REACT_APP_API_URL = 'http://localhost:3001';
    
    // Mock successful session
    supabase.auth.getSession.mockResolvedValue({
      data: { 
        session: { 
          access_token: 'mock-token', 
          user: { id: 'user123' } 
        } 
      },
      error: null,
    });
    
    supabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user123',
          email: 'test@example.com'
        } 
      },
      error: null,
    });
    
    // Default mock for successful API calls
    fetch.mockImplementation((url) => {
      if (url.includes('/api/vendors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVendors),
        });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            event_id: 'event123', 
            name: 'Test Event',
            message: 'Event created successfully'
          }),
        });
      }
      return Promise.resolve({ 
        ok: false, 
        status: 404, 
        json: () => Promise.resolve({ error: 'Not found' }) 
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to render component with common setup
  const renderComponent = async () => {
    let utils;
    await act(async () => {
      utils = render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });
    
    // Wait for initial load - use a more flexible approach
    await waitFor(() => {
      // Check for any part of the heading text
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h1' && 
               content.includes('Create a New');
      })).toBeInTheDocument();
    });
    
    return utils;
  };

  // FIXED: Basic rendering test with correct selectors
  test('renders form elements correctly', async () => {
    await renderComponent();

    // Check for main form elements using proper selectors
    expect(screen.getByLabelText(/Event Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time.*Optional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Theme.*Optional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Venue.*Optional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Time.*Optional/i)).toBeInTheDocument();
    
    // Check for vendor section
    expect(screen.getByText(/Vendors/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search vendors by name or service/i)).toBeInTheDocument();
    
    // Check for action buttons
    expect(screen.getByRole('button', { name: /Create Event/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
  });

  // FIXED: Form validation test
  test('validates required fields on submission', async () => {
    await renderComponent();

    // Submit without filling required fields
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please fill in at least the event name and date/i)).toBeInTheDocument();
    });
  });

  // FIXED: Date validation test
  test('prevents submission with past dates', async () => {
    await renderComponent();

    // Fill form with past date
    fireEvent.change(screen.getByLabelText(/Event Name/i), { 
      target: { value: 'Test Event' } 
    });
    
    fireEvent.change(screen.getByLabelText(/Date/i), { 
      target: { value: '2020-01-01' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please select a future date/i)).toBeInTheDocument();
    });
  });

  // FIXED: Vendor selection and removal
  test('handles vendor selection and removal correctly', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    // Select a vendor - use the specific service button
    const selectButtons = screen.getAllByText(/Select as Venue/i);
    await act(async () => {
      fireEvent.click(selectButtons[0]);
    });

    // Verify vendor was selected
    await waitFor(() => {
      expect(screen.getByText(/Selected Vendors/i)).toBeInTheDocument();
      expect(screen.getByText(/Elegant Events/i)).toBeInTheDocument();
    });

    // Remove the vendor - find by title attribute
    const removeButton = screen.getByTitle(/Remove vendor selection/i);
    await act(async () => {
      fireEvent.click(removeButton);
    });

    // Verify vendor was removed with success message
    await waitFor(() => {
      expect(screen.getByText(/removed from selection/i)).toBeInTheDocument();
    });
  });

  // FIXED: Vendor search functionality
  test('filters vendors based on search input', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
      expect(screen.getByText('Perfect Clicks Photography')).toBeInTheDocument();
    });

    // Search for specific vendor
    const searchInput = screen.getByPlaceholderText(/Search vendors by name or service/i);
    fireEvent.change(searchInput, { target: { value: 'Elegant' } });

    // Wait for debounced search
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
      expect(screen.queryByText('Perfect Clicks Photography')).not.toBeInTheDocument();
    });
  });

  // FIXED: Category filter functionality
  test('filters vendors by category', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    // Filter by category
    const categoryFilter = screen.getByDisplayValue('All Categories');
    fireEvent.change(categoryFilter, { target: { value: 'Photography' } });

    await waitFor(() => {
      expect(screen.getByText('Perfect Clicks Photography')).toBeInTheDocument();
      expect(screen.queryByText('Elegant Events')).not.toBeInTheDocument();
    });
  });

  // FIXED: Form submission with vendors
  test('submits form successfully with selected vendors', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Event Name/i), { 
      target: { value: 'Wedding Celebration' } 
    });
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().split('T')[0];
    
    fireEvent.change(screen.getByLabelText(/Date/i), { 
      target: { value: dateString } 
    });

    // Select a vendor
    const selectButtons = screen.getAllByText(/Select as Venue/i);
    await act(async () => {
      fireEvent.click(selectButtons[0]);
    });

    // Submit form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/Wedding Celebration.*created successfully/i)).toBeInTheDocument();
    });
  });

  // FIXED: Navigation tests
  test('navigates correctly on back and cancel', async () => {
    await renderComponent();

    // Test back button
    await act(async () => {
      fireEvent.click(screen.getByText(/Back to Dashboard/i));
    });

    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');

    // Reset mock
    mockedNavigate.mockClear();

    // Test cancel button
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    });

    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });

  // FIXED: Vendor profile navigation
  test('navigates to vendor profile correctly', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    // Click view profile button
    const viewProfileButtons = screen.getAllByText(/View Profile/i);
    await act(async () => {
      fireEvent.click(viewProfileButtons[0]);
    });

    // Verify navigation with correct parameters
    expect(mockedNavigate).toHaveBeenCalledWith(
      '/vendors/1/services?readonly=true'
    );
  });

  // NEW TEST: Form data persistence
  test('persists form data in localStorage', async () => {
    await renderComponent();

    // Fill some form fields
    fireEvent.change(screen.getByLabelText(/Event Name/i), { 
      target: { value: 'Persisted Event' } 
    });
    
    fireEvent.change(screen.getByLabelText(/Theme.*Optional/i), { 
      target: { value: 'Winter Wonderland' } 
    });

    // Check if data is persisted
    await waitFor(() => {
      const savedData = JSON.parse(localStorage.getItem('eventFormData'));
      expect(savedData.name).toBe('Persisted Event');
      expect(savedData.theme.name).toBe('Winter Wonderland');
    });
  });

  // NEW TEST: Error handling for vendor fetch
  test('handles vendor fetch errors gracefully', async () => {
    // Mock failed vendor fetch
    fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load vendors/i)).toBeInTheDocument();
    });
  });

  // NEW TEST: Multi-service vendor handling
  test('handles vendors with multiple services', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Multi-Service Vendor')).toBeInTheDocument();
    });

    // Should show multiple service buttons
    const cateringButton = screen.getByText(/Select as Catering/i);
    const decorButton = screen.getByText(/Select as Decor/i);
    const musicButton = screen.getByText(/Select as Music/i);
    
    expect(cateringButton).toBeInTheDocument();
    expect(decorButton).toBeInTheDocument();
    expect(musicButton).toBeInTheDocument();
  });

  // NEW TEST: Venue vendor special handling
  test('handles venue vendor selection correctly', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    // Select venue vendor
    const venueSelectButtons = screen.getAllByText(/Select as Venue/i);
    await act(async () => {
      fireEvent.click(venueSelectButtons[0]);
    });

    // Verify venue is auto-filled and disabled
    await waitFor(() => {
      const venueInput = screen.getByDisplayValue('Main Hall');
      expect(venueInput).toBeInTheDocument();
      expect(venueInput.disabled).toBe(true);
    });
  });

  // NEW TEST: Theme object handling
  test('handles theme object correctly', async () => {
    await renderComponent();

    const themeInput = screen.getByLabelText(/Theme.*Optional/i);
    fireEvent.change(themeInput, { target: { value: 'Test Theme' } });

    await waitFor(() => {
      const savedData = JSON.parse(localStorage.getItem('eventFormData'));
      expect(savedData.theme.name).toBe('Test Theme');
      expect(Array.isArray(savedData.theme.colors)).toBe(true);
      expect(savedData.theme.notes).toBe('');
    });
  });

  // NEW TEST: Form submission without optional fields
  test('submits form successfully without optional fields', async () => {
    await renderComponent();

    // Fill only required fields
    fireEvent.change(screen.getByLabelText(/Event Name/i), { 
      target: { value: 'Minimal Event' } 
    });
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().split('T')[0];
    
    fireEvent.change(screen.getByLabelText(/Date/i), { 
      target: { value: dateString } 
    });

    // Submit form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/Minimal Event.*created successfully/i)).toBeInTheDocument();
    });
  });

  // NEW TEST: Loading states during vendor fetch
  test('shows loading state during vendor fetch', async () => {
    // Create a promise that we can resolve manually
    let resolveFetch;
    const fetchPromise = new Promise(resolve => {
      resolveFetch = () => resolve({
        ok: true,
        json: () => Promise.resolve(mockVendors),
      });
    });
    
    fetch.mockImplementationOnce(() => fetchPromise);

    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    // Should show loading initially
    expect(screen.getByText(/Loading vendors/i)).toBeInTheDocument();

    // Resolve the fetch
    await act(async () => {
      resolveFetch();
    });

    // Loading should disappear and vendors should appear
    await waitFor(() => {
      expect(screen.queryByText(/Loading vendors/i)).not.toBeInTheDocument();
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });
  });
});