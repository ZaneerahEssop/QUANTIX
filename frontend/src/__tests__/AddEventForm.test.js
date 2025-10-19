import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddEventForm from '../pages/AddEventForm.jsx';
import { supabase } from '../client';

// Mock fetch for API calls
global.fetch = jest.fn();

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
    
    process.env.REACT_APP_API_URL = 'http://localhost:3001';
    
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
    
    // mock for successful API calls
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

  // Helper function to get form inputs by name (since labels don't have proper htmlFor)
  const getInputByName = (name) => document.querySelector(`input[name="${name}"]`);
  const getSelectByName = (name) => document.querySelector(`select[name="${name}"]`);

  const renderComponent = async () => {
    let utils;
    await act(async () => {
      utils = render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });
    
    // Wait for initial load 
    await waitFor(() => {
      const heading = screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h1' && 
               content.includes('Create a New');
      });
      expect(heading).toBeInTheDocument();
    });
    
    return utils;
  };

  test('renders form elements correctly', async () => {
    await renderComponent();

    // Check main form elements 
    expect(getInputByName('name')).toBeInTheDocument();
    expect(getInputByName('date')).toBeInTheDocument();
    expect(getInputByName('time')).toBeInTheDocument();
    expect(getInputByName('theme')).toBeInTheDocument();
    expect(getInputByName('venue')).toBeInTheDocument();
    expect(getInputByName('end_time')).toBeInTheDocument();
    
    // Check vendor section 
    const vendorElements = screen.getAllByText(/Vendors/i);
    expect(vendorElements.length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Search vendors by name or service/i)).toBeInTheDocument();
    
    // Check action buttons
    expect(screen.getByRole('button', { name: /Create Event/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
  });


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

  // validation test
  test('prevents submission with past dates', async () => {
    await renderComponent();

    // Fill form with past date
    fireEvent.change(getInputByName('name'), { 
      target: { value: 'Test Event' } 
    });
    
    fireEvent.change(getInputByName('date'), { 
      target: { value: '2020-01-01' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please select a future date/i)).toBeInTheDocument();
    });
  });

  test('handles vendor selection and removal correctly', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    const selectButtons = screen.getAllByText(/Select as Venue/i);
    await act(async () => {
      fireEvent.click(selectButtons[0]);
    });

    // Verify vendor was selected 
    await waitFor(() => {
      expect(screen.getByText(/Selected Vendors/i)).toBeInTheDocument();
      const vendorElements = screen.getAllByText(/Elegant Events/i);
      expect(vendorElements.length).toBe(2); // One in grid, one in selected list
    });

    
    const removeButton = screen.getByTitle(/Remove vendor selection/i);
    await act(async () => {
      fireEvent.click(removeButton);
    });

    // Verify vendor was removed with success message
    await waitFor(() => {
      expect(screen.getByText(/removed from selection/i)).toBeInTheDocument();
    });
  });

  test('filters vendors based on search input', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
      expect(screen.getByText('Perfect Clicks Photography')).toBeInTheDocument();
    });

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


  test('filters vendors by category', async () => {
    await renderComponent();

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

  test('submits form successfully with selected vendors', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(getInputByName('name'), { 
      target: { value: 'Wedding Celebration' } 
    });
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().split('T')[0];
    
    fireEvent.change(getInputByName('date'), { 
      target: { value: dateString } 
    });

    const selectButtons = screen.getAllByText(/Select as Venue/i);
    await act(async () => {
      fireEvent.click(selectButtons[0]);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    // Verify success message 
    await waitFor(() => {
      const successMessage = screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'p' && 
               content.includes('Wedding Celebration') && 
               content.includes('created successfully');
      });
      expect(successMessage).toBeInTheDocument();
    });
  });


  test('navigates correctly on back and cancel', async () => {
    await renderComponent();

    await act(async () => {
      fireEvent.click(screen.getByText(/Back to Dashboard/i));
    });

    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    mockedNavigate.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    });

    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });


  test('navigates to vendor profile correctly', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    const viewProfileButtons = screen.getAllByText(/View Profile/i);
    await act(async () => {
      fireEvent.click(viewProfileButtons[0]);
    });

    // Verify navigation with correct parameters
    expect(mockedNavigate).toHaveBeenCalledWith(
      '/vendors/1/services?readonly=true'
    );
  });


  test('persists form data in localStorage', async () => {
    await renderComponent();

    fireEvent.change(getInputByName('name'), { 
      target: { value: 'Persisted Event' } 
    });
    
    fireEvent.change(getInputByName('theme'), { 
      target: { value: 'Winter Wonderland' } 
    });

    // Check if data is persist
    await waitFor(() => {
      const savedData = JSON.parse(localStorage.getItem('eventFormData'));
      expect(savedData.name).toBe('Persisted Event');
      expect(savedData.theme.name).toBe('Winter Wonderland');
    });
  });


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

  test('handles vendors with multiple services', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Multi-Service Vendor')).toBeInTheDocument();
    });

    
    const cateringButtons = screen.getAllByText(/Select as Catering/i);
    const decorButtons = screen.getAllByText(/Select as Decor/i);
    const musicButtons = screen.getAllByText(/Select as Music/i);
    
    expect(cateringButtons.length).toBeGreaterThan(0);
    expect(decorButtons.length).toBeGreaterThan(0);
    expect(musicButtons.length).toBeGreaterThan(0);
    
    // Find the multi-service vendor card and verify it has all three service buttons
    const multiServiceVendorCard = screen.getByText('Multi-Service Vendor').closest('.vendor-card');
    expect(multiServiceVendorCard).toBeInTheDocument();

    const hasCatering = Array.from(cateringButtons).some(button => 
      multiServiceVendorCard?.contains(button)
    );
    const hasDecor = Array.from(decorButtons).some(button => 
      multiServiceVendorCard?.contains(button)
    );
    const hasMusic = Array.from(musicButtons).some(button => 
      multiServiceVendorCard?.contains(button)
    );
    
    expect(hasCatering).toBe(true);
    expect(hasDecor).toBe(true);
    expect(hasMusic).toBe(true);
  });


  test('handles venue vendor selection correctly', async () => {
    await renderComponent();

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
      const venueInput = getInputByName('venue');
      expect(venueInput.value).toBe('Main Hall');
      expect(venueInput.disabled).toBe(true);
    });
  });

  test('handles theme object correctly', async () => {
    await renderComponent();

    const themeInput = getInputByName('theme');
    fireEvent.change(themeInput, { target: { value: 'Test Theme' } });

    await waitFor(() => {
      const savedData = JSON.parse(localStorage.getItem('eventFormData'));
      expect(savedData.theme.name).toBe('Test Theme');
      expect(Array.isArray(savedData.theme.colors)).toBe(true);
      expect(savedData.theme.notes).toBe('');
    });
  });

  test('submits form successfully without optional fields', async () => {
    await renderComponent();

    //only required fields
    fireEvent.change(getInputByName('name'), { 
      target: { value: 'Minimal Event' } 
    });
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().split('T')[0];
    
    fireEvent.change(getInputByName('date'), { 
      target: { value: dateString } 
    });


    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    // Verify success message
    await waitFor(() => {
      const successMessage = screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'p' && 
               content.includes('Minimal Event') && 
               content.includes('created successfully');
      });
      expect(successMessage).toBeInTheDocument();
    });
  });


  test('shows loading state during vendor fetch', async () => {
    // Create a promise that can be resolve manually
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

  
  test('shows success message when vendor is removed', async () => {
    await renderComponent();

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    });

    // Select a vendor
    const selectButtons = screen.getAllByText(/Select as Venue/i);
    await act(async () => {
      fireEvent.click(selectButtons[0]);
    });

    // Wait for vendor to be selected
    await waitFor(() => {
      expect(screen.getByText(/Selected Vendors/i)).toBeInTheDocument();
    });

    // Remove the vendor
    const removeButton = screen.getByTitle(/Remove vendor selection/i);
    await act(async () => {
      fireEvent.click(removeButton);
    });

    // Verify success message appears - use a more flexible matcher
    await waitFor(() => {
      const successMessage = screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'p' && 
               content.includes('removed from selection');
      });
      expect(successMessage).toBeInTheDocument();
    });
  });

  test('clears form data when navigating away', async () => {
    await renderComponent();

    // Fill some data
    fireEvent.change(getInputByName('name'), { 
      target: { value: 'Event to Clear' } 
    });

    // Wait for data to be persisted
    await waitFor(() => {
      const savedData = JSON.parse(localStorage.getItem('eventFormData'));
      expect(savedData.name).toBe('Event to Clear');
    });

    // Navigate away using back button
    await act(async () => {
      fireEvent.click(screen.getByText(/Back to Dashboard/i));
    });

    // The form data is reset to empty values, but localStorage still contains the empty structure
    // This is actually the expected behavior - the form is cleared but localStorage keeps the structure
    await waitFor(() => {
      const savedData = JSON.parse(localStorage.getItem('eventFormData'));
      // The form should be reset to empty values
      expect(savedData.name).toBe('');
      expect(savedData.date).toBe('');
      expect(savedData.theme.name).toBe('');
    });

    // Verify navigation occurred
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });
});