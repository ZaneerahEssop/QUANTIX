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
  FaCalendarAlt: () => <span data-testid="fa-calendar-alt">FaCalendarAlt</span>,
  FaCheck: () => <span data-testid="fa-check">FaCheck</span>,
  FaClock: () => <span data-testid="fa-clock">FaClock</span>,
  FaFileAlt: () => <span data-testid="fa-file-alt">FaFileAlt</span>,
  FaPlus: () => <span data-testid="fa-plus">FaPlus</span>,
  FaSearch: () => <span data-testid="fa-search">FaSearch</span>,
  FaTimes: () => <span data-testid="fa-times">FaTimes</span>,
  FaUpload: () => <span data-testid="fa-upload">FaUpload</span>,
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
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'mock-url' } }),
      }),
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock environment variable
    process.env.REACT_APP_API_URL = 'http://localhost:3001';
    
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token', user: { id: 'user123' } } },
      error: null,
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
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
            event: { event_id: 'event123', name: 'Test Event' }
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => ({}) });
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
    console.log.mockRestore();
    console.warn.mockRestore();
  });

  test('renders form elements', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Check for the main heading structure
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent(/Create a New/);
      expect(mainHeading).toHaveTextContent(/Event/);
      
      // Find inputs by their name attribute
      const eventNameInput = document.querySelector('input[name="name"]');
      expect(eventNameInput).toBeInTheDocument();
      
      const dateInput = document.querySelector('input[name="date"]');
      expect(dateInput).toBeInTheDocument();
      
      const timeInput = document.querySelector('input[name="time"]');
      expect(timeInput).toBeInTheDocument();
      
      const themeInput = document.querySelector('input[name="theme"]');
      expect(themeInput).toBeInTheDocument();
      
      const venueInput = document.querySelector('input[name="venue"]');
      expect(venueInput).toBeInTheDocument();
      
      const endTimeInput = document.querySelector('input[name="end_time"]');
      expect(endTimeInput).toBeInTheDocument();
      
      expect(screen.getByRole('heading', { name: /Vendors/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Documents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Event/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles file uploads and removal', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024, writable: false });

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('(1.0 KB)')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find the remove button by its title or by looking for the button near the file name
    const removeButtons = screen.getAllByTitle(/Remove file/i);
    expect(removeButtons.length).toBeGreaterThan(0);
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('rejects files larger than 10MB', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large-file.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024, writable: false });

    const fileInput = document.querySelector('input[type="file"]');
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/File is too large/i)).toBeInTheDocument();
      expect(screen.getByText(/Maximum size is 10 MB/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Close the warning modal
    const closeButton = screen.getByRole('button', { name: /×/i });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText(/File is too large/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles API error on form submission', async () => {
    // Mock the API to return an error for events endpoint
    fetch.mockImplementation((url) => {
      if (url.includes('/api/vendors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVendors),
        });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Database error' }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => ({}) });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Fill in required fields
    const eventNameInput = document.querySelector('input[name="name"]');
    fireEvent.change(eventNameInput, { target: { value: 'Test Event' } });
    
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: '2025-10-01' } });

    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    // Wait for the error modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Database error/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });


  test('handles no user session on form submission', async () => {
    // Mock no user session
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    // Fill in required fields
    const eventNameInput = document.querySelector('input[name="name"]');
    fireEvent.change(eventNameInput, { target: { value: 'Test Event' } });
    
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: '2025-10-01' } });

    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/You must be logged in to create an event/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('submits form successfully with all optional fields', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Fill all form fields
    const eventNameInput = document.querySelector('input[name="name"]');
    fireEvent.change(eventNameInput, { target: { value: 'Test Event' } });
    
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: '2025-10-01' } });
    
    const timeInput = document.querySelector('input[name="time"]');
    fireEvent.change(timeInput, { target: { value: '10:00' } });
    
    const themeInput = document.querySelector('input[name="theme"]');
    fireEvent.change(themeInput, { target: { value: 'Birthday' } });
    
    const venueInput = document.querySelector('input[name="venue"]');
    fireEvent.change(venueInput, { target: { value: 'Test Venue' } });
    
    const endTimeInput = document.querySelector('input[name="end_time"]');
    fireEvent.change(endTimeInput, { target: { value: '18:00' } });

    // Select multiple vendors
    const requestButtons = screen.getAllByRole('button', { name: /Select Vendor/i });
    await act(async () => {
      fireEvent.click(requestButtons[0]); // Elegant Events
      fireEvent.click(requestButtons[1]); // Perfect Clicks
    });

    await waitFor(() => {
      const selectedButtons = screen.getAllByText('Selected');
      expect(selectedButtons.length).toBe(2);
    }, { timeout: 3000 });

    // Upload multiple files
    const file1 = new File(['dummy content 1'], 'test1.pdf', { type: 'application/pdf' });
    const file2 = new File(['dummy content 2'], 'test2.docx', { type: 'application/docx' });
    Object.defineProperty(file1, 'size', { value: 1024, writable: false });
    Object.defineProperty(file2, 'size', { value: 2048, writable: false });
    
    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file1, file2] } });
    });

    await waitFor(() => {
      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
      expect(screen.getByText('test2.docx')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    // Wait for success message with vendor count
    await waitFor(() => {
      expect(screen.getByText(/Event "Test Event" created successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/2 vendor request\(s\) sent!/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Close the success modal and navigate to dashboard
    const closeButton = screen.getByRole('button', { name: /×/i });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  test('validates required fields', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please fill in at least the event name and date./i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('validates past dates', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    const eventNameInput = document.querySelector('input[name="name"]');
    fireEvent.change(eventNameInput, { target: { value: 'Test Event' } });
    
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please select a future date./i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('navigates to dashboard on cancel', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  test('navigates to dashboard on back button click', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Back to Dashboard/i));
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });



  test('handles vendor selection and removal', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Wait for vendors to load
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Select a vendor - use more specific selector
    const vendorCards = document.querySelectorAll('.vendor-card');
    const firstVendorSelectButton = vendorCards[0].querySelector('.add-vendor-btn');
    
    await act(async () => {
      fireEvent.click(firstVendorSelectButton);
    });

    await waitFor(() => {
      // Check for selected state
      expect(screen.getByText('Selected')).toBeInTheDocument();
      expect(screen.getByText('Selected Vendors')).toBeInTheDocument();
      
      // Check that vendor appears in selected list
      const selectedVendorNames = screen.getAllByText('Elegant Events');
      expect(selectedVendorNames.length).toBe(2); // One in grid, one in selected list
    }, { timeout: 3000 });

    // Remove vendor from selected list
    const removeButtons = screen.getAllByTitle(/Remove vendor/i);
    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    await waitFor(() => {
      // Check success message
      expect(screen.getByText(/Elegant Events removed from selection/i)).toBeInTheDocument();
      
      // Check that vendor is no longer in selected list
      const vendorElements = screen.getAllByText('Elegant Events');
      expect(vendorElements.length).toBe(1); // Only in grid, not in selected list
      
      // Selected vendors section should be gone
      expect(screen.queryByText('Selected Vendors')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles vendor card click navigation', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on vendor card (not the select button)
    const vendorCard = screen.getByText('Elegant Events').closest('.vendor-card');
    await act(async () => {
      fireEvent.click(vendorCard);
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/vendors/1/services?readonly=true');
    }, { timeout: 3000 });
  });

  test('handles floating label behavior', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    const eventNameInput = document.querySelector('input[name="name"]');
    
    // Initially should not have has-value class
    expect(eventNameInput.classList.contains('has-value')).toBe(false);
    
    // Add value and check class is added
    fireEvent.change(eventNameInput, { target: { value: 'Test Event' } });
    expect(eventNameInput.classList.contains('has-value')).toBe(true);
    
    // Remove value and check class is removed
    fireEvent.change(eventNameInput, { target: { value: '' } });
    expect(eventNameInput.classList.contains('has-value')).toBe(false);
  });

  test('handles form submission without optional fields', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Fill only required fields
    const eventNameInput = document.querySelector('input[name="name"]');
    fireEvent.change(eventNameInput, { target: { value: 'Minimal Event' } });
    
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: '2025-12-01' } });

    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));
    });

    // Wait for success message without vendor mention
    await waitFor(() => {
      expect(screen.getByText(/Event "Minimal Event" created successfully!/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });


  test('handles multiple file uploads with mixed sizes', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    const validFile = new File(['dummy content'], 'valid.pdf', { type: 'application/pdf' });
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 1024, writable: false });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024, writable: false });

    const fileInput = document.querySelector('input[type="file"]');
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [validFile, largeFile] } });
    });

    await waitFor(() => {
      // Should show warning for large file
      expect(screen.getByText(/File is too large/i)).toBeInTheDocument();
      // Valid file should still be uploaded
      expect(screen.getByText('valid.pdf')).toBeInTheDocument();
      // Large file should not be in the list
      expect(screen.queryByText('large.pdf')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles vendor selection from filtered results', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Filter vendors first
    const searchInput = screen.getByPlaceholderText(/Search for vendors by name or category/i);
    fireEvent.change(searchInput, { target: { value: 'Elegant' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
      // Other vendors should be filtered out
      const otherVendors = screen.queryAllByText('Perfect Clicks Photography');
      expect(otherVendors.length).toBe(0);
    }, { timeout: 3000 });

    // Select vendor from filtered results
    const vendorCards = document.querySelectorAll('.vendor-card');
    const selectButton = vendorCards[0].querySelector('.add-vendor-btn');
    
    await act(async () => {
      fireEvent.click(selectButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Selected')).toBeInTheDocument();
      expect(screen.getByText('Selected Vendors')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});