import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventDetails from "../pages/EventDetails";
import { supabase } from "../client";

// Mock the supabase client properly with chainable methods
jest.mock("../client", () => {
  const mockFrom = jest.fn();
  const mockStorageFrom = jest.fn();
  
  // Create chainable mock methods
  const createChainableMock = () => {
    const mock = jest.fn();
    mock.select = jest.fn(() => mock);
    mock.eq = jest.fn(() => mock);
    mock.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
    mock.update = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) }));
    mock.delete = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) }));
    mock.insert = jest.fn(() => Promise.resolve({ error: null }));
    return mock;
  };

  mockFrom.mockImplementation(createChainableMock);
  mockStorageFrom.mockReturnValue({
    upload: jest.fn(() => Promise.resolve({ error: null })),
    getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } }))
  });

  return {
    supabase: {
      auth: {
        getUser: jest.fn(),
      },
      from: mockFrom,
      storage: {
        from: mockStorageFrom
      }
    },
  };
});

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaArrowLeft: () => <span>←</span>,
  FaEdit: () => <span>✏️</span>,
  FaSave: () => <span>💾</span>,
  FaUpload: () => <span>📤</span>,
  FaFilePdf: () => <span>📄</span>,
  FaTimes: () => <span>✕</span>,
  FaCalendarAlt: () => <span>📅</span>,
  FaClock: () => <span>⏰</span>,
  FaMapMarkerAlt: () => <span>📍</span>,
  FaStar: () => <span>⭐</span>,
  FaPlus: () => <span>➕</span>,
  FaTrash: () => <span>🗑️</span>,
  FaEnvelope: () => <span>✉️</span>,
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ eventId: '123' }),
  useNavigate: () => mockNavigate,
}));

const renderWithRouter = (eventId = "123") => {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <Routes>
        <Route path="/events/:eventId" element={<EventDetails />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe.skip("EventDetails Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
    });
  });

  test("redirects to login if user is not authenticated", async () => {
    // Override the default mock for this test
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    renderWithRouter();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test("renders event details when data is returned", async () => {
    // Mock event data response
    const mockEventData = {
      event_id: "123",
      name: "Mock Event",
      venue: "Test Venue",
      start_time: "2025-09-19T18:00:00",
      schedule: [],
      guests: [],
      theme: { name: "Cool Theme", colors: ["#000"], notes: "Dark mode" },
      documents: [],
    };

    // Mock vendors data
    const mockVendorsData = [
      {
        vendor_id: 1,
        business_name: "Vendor A",
        service_type: "Catering",
        contact_number: "123456789",
        description: "Food services",
      },
    ];

    // Setup specific mock responses
    supabase.from.mockImplementation((table) => {
      const mock = jest.fn();
      mock.select = jest.fn(() => mock);
      mock.eq = jest.fn(() => mock);
      
      if (table === 'events') {
        mock.single = jest.fn(() => Promise.resolve({ data: mockEventData, error: null }));
      } else if (table === 'vendors') {
        mock.select = jest.fn(() => Promise.resolve({ data: mockVendorsData, error: null }));
      } else if (table === 'event_vendors') {
        mock.select = jest.fn(() => Promise.resolve({ data: [], error: null }));
      }
      
      return mock;
    });

    renderWithRouter();

    // Wait for loading to complete and check for event name
    await waitFor(() => {
      expect(screen.getByText('Mock Event')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Test Venue')).toBeInTheDocument();
    expect(screen.getByText('Cool Theme')).toBeInTheDocument();
  });

  test("enters editing mode", async () => {
    const mockEventData = {
      event_id: "123",
      name: "Editable Event",
      venue: "Old Venue",
      start_time: "2025-09-19T18:00:00",
      schedule: [],
      guests: [],
      theme: { name: "", colors: [], notes: "" },
      documents: [],
    };

    // Setup specific mock responses
    supabase.from.mockImplementation((table) => {
      const mock = jest.fn();
      mock.select = jest.fn(() => mock);
      mock.eq = jest.fn(() => mock);
      
      if (table === 'events') {
        mock.single = jest.fn(() => Promise.resolve({ data: mockEventData, error: null }));
      } else {
        mock.select = jest.fn(() => Promise.resolve({ data: [], error: null }));
      }
      
      return mock;
    });

    renderWithRouter();

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading event details/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Find and click edit button by text content
    const editButton = screen.getByText((content, element) => 
      element.textContent.includes('Edit Event')
    );
    fireEvent.click(editButton);

    // Should show save button
    await waitFor(() => {
      expect(screen.getByText((content, element) => 
        element.textContent.includes('Save Changes')
      )).toBeInTheDocument();
    });
  });

  test("handles error when fetching event fails", async () => {
    // Mock failed event fetch
    supabase.from.mockImplementation((table) => {
      const mock = jest.fn();
      mock.select = jest.fn(() => mock);
      mock.eq = jest.fn(() => mock);
      
      if (table === 'events') {
        mock.single = jest.fn(() => Promise.resolve({ 
          data: null, 
          error: new Error("Not found") 
        }));
      } else {
        mock.select = jest.fn(() => Promise.resolve({ data: [], error: null }));
      }
      
      return mock;
    });

    renderWithRouter();

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Event Not Found/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("shows loading state initially", async () => {
    // Delay the response to test loading state
    supabase.auth.getUser.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: { user: { id: "test-user-id" } }
      }), 100))
    );

    supabase.from.mockImplementation((table) => {
      const mock = jest.fn();
      mock.select = jest.fn(() => mock);
      mock.eq = jest.fn(() => mock);
      mock.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
      return mock;
    });

    renderWithRouter();

    // Should show loading initially
    expect(screen.getByText(/Loading event details/i)).toBeInTheDocument();
    
    // Loading should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Loading event details/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles navigation between views", async () => {
    const mockEventData = {
      event_id: "123",
      name: "Test Event",
      venue: "Test Venue",
      start_time: "2025-09-19T18:00:00",
      schedule: [],
      guests: [],
      theme: { name: "", colors: [], notes: "" },
      documents: [],
    };

    supabase.from.mockImplementation((table) => {
      const mock = jest.fn();
      mock.select = jest.fn(() => mock);
      mock.eq = jest.fn(() => mock);
      
      if (table === 'events') {
        mock.single = jest.fn(() => Promise.resolve({ data: mockEventData, error: null }));
      } else {
        mock.select = jest.fn(() => Promise.resolve({ data: [], error: null }));
      }
      
      return mock;
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.queryByText(/Loading event details/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on different view buttons using more specific queries
    const guestButton = screen.getByText('Guest Management');
    const vendorButton = screen.getByText('Vendor Management');
    const documentButton = screen.getByText('Document Management');
    const overviewButton = screen.getByText('Event Overview');

    fireEvent.click(guestButton);
    fireEvent.click(vendorButton);
    fireEvent.click(documentButton);
    fireEvent.click(overviewButton);

    // All buttons should be present
    expect(guestButton).toBeInTheDocument();
    expect(vendorButton).toBeInTheDocument();
    expect(documentButton).toBeInTheDocument();
    expect(overviewButton).toBeInTheDocument();
  });

  test("handles back button click", async () => {
    const mockEventData = {
      event_id: "123",
      name: "Test Event",
      venue: "Test Venue",
      start_time: "2025-09-19T18:00:00",
      schedule: [],
      guests: [],
      theme: { name: "", colors: [], notes: "" },
      documents: [],
    };

    supabase.from.mockImplementation((table) => {
      const mock = jest.fn();
      mock.select = jest.fn(() => mock);
      mock.eq = jest.fn(() => mock);
      
      if (table === 'events') {
        mock.single = jest.fn(() => Promise.resolve({ data: mockEventData, error: null }));
      } else {
        mock.select = jest.fn(() => Promise.resolve({ data: [], error: null }));
      }
      
      return mock;
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.queryByText(/Loading event details/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Find and click back button
    const backButton = screen.getByText((content, element) => 
      element.textContent.includes('Back to Dashboard')
    );
    fireEvent.click(backButton);
    
    // Should navigate back
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});