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
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn((table) => {
      if (table === 'events') {
        return {
          insert: mockInsert.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle,
            }),
          }),
        };
      }
      if (table === 'files') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    }),
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
      business_name: 'Melody Makers',
      service_type: 'Music',
      contact_number: '(555) 345-6789',
      email: 'bookings@melodymakers.com',
      address: '789 Music Ln, New York, NY',
      description: 'Live music band providing entertainment for all types of events and celebrations.',
    },
    {
      vendor_id: 4,
      business_name: 'Blooms & Petals',
      service_type: 'Florist',
      contact_number: '(555) 456-7890',
      email: 'info@bloomsandpetals.com',
      address: '321 Flower Rd, New York, NY',
      description: 'Floral arrangements and decorations to make your event beautiful and memorable.',
    },
    {
      vendor_id: 5,
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
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token', user: { id: 'user123' } } },
      error: null,
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { event_id: 'event123' }, error: null });
    fetch.mockImplementation((url) => {
      if (url.includes('/api/vendors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVendors),
        });
      }
      if (url.includes('/api/vendor-requests') && !url.includes('DELETE')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            request: {
              id: `mock-${Date.now()}`,
              event_id: 'event123',
              vendor_id: expect.any(Number),
              requester_id: 'user123',
              status: 'pending',
              created_at: new Date().toISOString(),
            },
          }),
        });
      }
      if (url.includes('/api/vendor-requests') && url.includes('DELETE')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
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
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      console.log('Console error:', ...args);
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
    console.log.mockRestore();
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
      expect(screen.getByText(/Create a New/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Event Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Time (Optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Theme (Optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Venue (Optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('End Time (Optional)')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Vendors/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Documents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Event/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('renders loading state initially', async () => {
    fetch.mockImplementationOnce(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, json: () => Promise.resolve(mockVendors) }), 100)
      )
    );

    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/Loading vendors.../i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Loading vendors.../i)).not.toBeInTheDocument();
      expect(screen.getByText('Elegant Events')).toBeInTheDocument();
      expect(screen.getByText('Perfect Clicks Photography')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles input changes', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('Event Name'), { target: { value: 'Test Event' } });
      expect(screen.getByLabelText('Event Name')).toHaveValue('Test Event');

      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-10-01' } });
      expect(screen.getByLabelText('Date')).toHaveValue('2025-10-01');

      fireEvent.change(screen.getByLabelText('Start Time (Optional)'), { target: { value: '10:00' } });
      expect(screen.getByLabelText('Start Time (Optional)')).toHaveValue('10:00');

      fireEvent.change(screen.getByLabelText('Theme (Optional)'), { target: { value: 'Birthday' } });
      expect(screen.getByLabelText('Theme (Optional)')).toHaveValue('Birthday');

      fireEvent.change(screen.getByLabelText('Venue (Optional)'), { target: { value: 'Test Venue' } });
      expect(screen.getByLabelText('Venue (Optional)')).toHaveValue('Test Venue');

      fireEvent.change(screen.getByLabelText('End Time (Optional)'), { target: { value: '18:00' } });
      expect(screen.getByLabelText('End Time (Optional)')).toHaveValue('18:00');
    }, { timeout: 3000 });
  });

  test('handles vendor search and filtering', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Elegant Events' })).toBeInTheDocument();
      expect(screen.getByText('Perfect Clicks Photography')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.change(screen.getByPlaceholderText(/Search for vendors/i), {
      target: { value: 'Elegant Events' },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Elegant Events' })).toBeInTheDocument();
      expect(screen.queryByText('Perfect Clicks Photography')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Venue' } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Elegant Events' })).toBeInTheDocument();
      expect(screen.queryByText('Perfect Clicks Photography')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('adds and removes vendors', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Elegant Events' })).toBeInTheDocument();
    }, { timeout: 3000 });

    const requestButtons = screen.getAllByRole('button', { name: /Request Vendor/i });
    fireEvent.click(requestButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Requested')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Elegant Events' })).toBeInTheDocument();
      expect(screen.getByText(/Selected Vendors/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /Undo/i }));

    await waitFor(() => {
      expect(screen.queryByText('Requested')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Request Vendor/i })).toHaveLength(mockVendors.length);
      expect(screen.queryByText(/Selected Vendors/i)).not.toBeInTheDocument();
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

    const fileInput = screen.getByTestId('file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('(1.0 KB)')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getAllByRole('button', { name: /Remove file/i })[0]);

    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows warning for large files', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    const file = new File(['dummy content'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024, writable: false });

    const fileInput = screen.getByTestId('file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/File is too large: large.pdf. Maximum size is 10 MB./i)).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));

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

    fireEvent.change(screen.getByLabelText('Event Name'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2020-01-01' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please select a future date./i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('submits form successfully', async () => {
    mockSingle.mockResolvedValue({ data: { event_id: 'event123' }, error: null });

    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    fireEvent.change(screen.getByLabelText('Event Name'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-10-01' } });
    fireEvent.change(screen.getByLabelText('Start Time (Optional)'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Theme (Optional)'), { target: { value: 'Birthday' } });
    fireEvent.change(screen.getByLabelText('Venue (Optional)'), { target: { value: 'Test Venue' } });
    fireEvent.change(screen.getByLabelText('End Time (Optional)'), { target: { value: '18:00' } });

    const requestButtons = screen.getAllByRole('button', { name: /Request Vendor/i });
    fireEvent.click(requestButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Requested')).toBeInTheDocument();
    }, { timeout: 3000 });

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf', size: 1024 });
    Object.defineProperty(file, 'size', { value: 1024, writable: false });
    const fileInput = screen.getByTestId('file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Test Event',
        theme: 'Birthday',
        start_time: '2025-10-01T10:00',
        end_time: '18:00',
        venue: 'Test Venue',
        planner_id: 'user123',
      });
      expect(screen.getByText(/Event created successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /×/i }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  test('handles Supabase error on form submission', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    await act(async () => {
      render(
        <MemoryRouter>
          <AddEventForm />
        </MemoryRouter>
      );
    });

    fireEvent.change(screen.getByLabelText('Event Name'), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-10-01' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Event/i }));

    await waitFor(() => {
      expect(screen.getByText(/Database error/i)).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });
});