import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventDetails from "../pages/EventDetails.jsx";

// Mock the entire supabase module
jest.mock("../client", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ error: null })),
        remove: jest.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: "mock-url" } })),
        list: jest.fn(() => Promise.resolve({ 
          data: [
            { 
              name: "doc.pdf", 
              created_at: "2025-09-24T09:00:00Z",
              metadata: { size: 1024 }
            }
          ], 
          error: null 
        })),
      })),
    },
    from: jest.fn(() => ({
      update: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// Mock jspdf and html2canvas dependencies
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    text: jest.fn(),
    addImage: jest.fn(),
    save: jest.fn(),
    internal: {
      pageSize: {
        getWidth: jest.fn().mockReturnValue(595.28),
        getHeight: jest.fn().mockReturnValue(841.89),
      }
    }
  }));
});

jest.mock('html2canvas', () => {
  return jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mocked')
  });
});

// Mock the ContractManagement component
jest.mock('../components/ContractManagement.jsx', () => {
  return function MockContractManagement({ vendor, onBack }) {
    return (
      <div data-testid="mock-contract-management">
        <h3>Contract Management for {vendor?.business_name}</h3>
        <button onClick={onBack}>Back to Vendors</button>
      </div>
    );
  };
});

// Mock all react-icons/fa icons used in the component
jest.mock('react-icons/fa', () => ({
  FaArrowLeft: () => <span data-testid="fa-arrow-left">FaArrowLeft</span>,
  FaCalendarAlt: () => <span data-testid="fa-calendar-alt">FaCalendarAlt</span>,
  FaCheck: () => <span data-testid="fa-check">FaCheck</span>,
  FaClock: () => <span data-testid="fa-clock">FaClock</span>,
  FaEdit: () => <span data-testid="fa-edit">FaEdit</span>,
  FaEnvelope: () => <span data-testid="fa-envelope">FaEnvelope</span>,
  FaFilePdf: () => <span data-testid="fa-file-pdf">FaFilePdf</span>,
  FaMapMarkerAlt: () => <span data-testid="fa-map-marker-alt">FaMapMarkerAlt</span>,
  FaPlus: () => <span data-testid="fa-plus">FaPlus</span>,
  FaSave: () => <span data-testid="fa-save">FaSave</span>,
  FaSearch: () => <span data-testid="fa-search">FaSearch</span>,
  FaStar: () => <span data-testid="fa-star">FaStar</span>,
  FaTimes: () => <span data-testid="fa-times">FaTimes</span>,
  FaTrash: () => <span data-testid="fa-trash">FaTrash</span>,
  FaUpload: () => <span data-testid="fa-upload">FaUpload</span>,
}));

// Mock unsplash services
jest.mock("../services/unsplash", () => ({
  searchUnsplashPhotos: jest.fn(),
  registerUnsplashDownload: jest.fn(),
}));

global.fetch = jest.fn();
global.alert = jest.fn();
global.confirm = jest.fn();

// Mock process.env for API_BASE
process.env.REACT_APP_BASE_URL = "http://localhost:5000";
process.env.REACT_APP_API_URL = "http://localhost:5000";

// Mock URL methods for export functionality
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
  useParams: () => ({ id: "test-event-id" }),
  useLocation: () => ({ 
    pathname: '/events/test-event-id',
    search: '',
    state: null 
  }),
}));

// Mock CSS
jest.mock("../styling/eventDetails.css", () => ({}));

describe("EventDetails Component", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    user_metadata: { full_name: "Test User" }
  };
  const mockSession = { access_token: "mock-token" };

  const mockEventData = {
    event_id: "test-event-id",
    planner_id: "test-user-id",
    name: "Test Event",
    start_time: "2025-10-01T14:00:00",
    venue: "Test Venue",
    theme: JSON.stringify({ name: "Test Theme", colors: ["#FF0000"], notes: "Test notes" }),
    schedule: [{ time: "14:00", activity: "Welcome" }],
    documents: [{ name: "doc.pdf", url: "http://example.com/doc.pdf", uploaded_at: "2025-09-24T09:00:00Z" }],
    vendors: ["vendor1"],
    notes: "Test event notes"
  };

  const mockGuestsData = [
    { guest_id: "guest1", name: "John Doe", email: "john@example.com", rsvp_status: "Pending", dietary_info: "Vegan" },
    { guest_id: "guest2", name: "Jane Smith", email: "jane@example.com", rsvp_status: "Attending", dietary_info: "" },
  ];

  const mockVendorsData = [
    { vendor_id: "vendor1", business_name: "Vendor One", service_type: "Catering,Venue", contact_number: "1234567890", description: "Catering services" },
    { vendor_id: "vendor2", business_name: "Venue Provider", service_type: "venue", contact_number: "0987654321", description: "Beautiful venue" },
    { vendor_id: "vendor3", business_name: "Photography Pro", service_type: "photography", contact_number: "5555555555", description: "Professional photography" },
  ];

  const mockVendorRequests = [
    { request_id: "req1", vendor_id: "vendor1", service_requested: "Catering", status: "pending", vendor: mockVendorsData[0] },
    { request_id: "req2", vendor_id: "vendor2", service_requested: "venue", status: "accepted", vendor: mockVendorsData[1] },
    { request_id: "req3", vendor_id: "vendor3", service_requested: "photography", status: "rejected", vendor: mockVendorsData[2] },
  ];

  // Helper functions
  const waitForComponentToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });
  };

  const switchToView = async (viewName) => {
    // Find all buttons with the view name and click the main navigation one
    const viewButtons = screen.getAllByRole("button", { name: new RegExp(viewName, "i") });
    const mainNavButton = viewButtons.find(button => 
      button.className.includes('new-button')
    );
    
    if (mainNavButton) {
      await act(async () => {
        fireEvent.click(mainNavButton);
      });
    } else if (viewButtons.length > 0) {
      // Fallback to first button if no main nav button found
      await act(async () => {
        fireEvent.click(viewButtons[0]);
      });
    }
  };

  const setupMocks = (overrides = {}) => {
    const { supabase } = require("../client");
    const { searchUnsplashPhotos, registerUnsplashDownload } = require("../services/unsplash");

    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
    
    // Mock storage
    supabase.storage.from.mockReturnValue({
      upload: jest.fn(() => Promise.resolve({ error: null })),
      remove: jest.fn(() => Promise.resolve({ error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: "mock-url" } })),
      list: jest.fn(() => Promise.resolve({ 
        data: overrides.documents || [
          { 
            name: "doc.pdf", 
            created_at: "2025-09-24T09:00:00Z",
            metadata: { size: 1024 }
          }
        ], 
        error: null 
      })),
    });

    searchUnsplashPhotos.mockResolvedValue({ results: [] });
    registerUnsplashDownload.mockResolvedValue();

    // URLSearchParams mock
    global.URLSearchParams = jest.fn().mockImplementation(() => ({
      get: jest.fn((param) => param === 'readonly' ? (overrides.readOnly ? 'true' : 'false') : null)
    }));

    // Fetch mock
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve(overrides.eventData || mockEventData) 
        });
      }
      if (url.includes("/api/guests/test-event-id")) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve(overrides.guestsData || mockGuestsData) 
        });
      }
      if (url.includes("/api/vendors")) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve(overrides.vendorsData || mockVendorsData) 
        });
      }
      if (url.includes("/api/vendor-requests/event/test-event-id")) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve(overrides.vendorRequests || mockVendorRequests) 
        });
      }
      if (url.includes("/api/events/test-event-id/export")) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'attachment; filename="event_export.zip"' },
          blob: () => Promise.resolve(new Blob(['test']))
        });
      }
      if (url.includes("/api/events/test-event-id")) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve({ success: true }) 
        });
      }
      if (url.includes("/api/guests/test-event-id/")) {
        return Promise.resolve({ ok: true });
      }
      if (url.includes("/api/emails/send-invite")) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve({ success: true }) 
        });
      }
      if (url.includes("/api/vendor-requests")) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve({ success: true }) 
        });
      }
      return Promise.resolve({ ok: false });
    });
  };

  const renderComponent = (initialEntries = ["/events/test-event-id"]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/events/:id" element={<EventDetails />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Initialization and Loading", () => {
    test("renders event details component with correct data", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      const venueBox = screen.getByText("Venue").closest('.info-box');
      expect(within(venueBox).getByText("Test Venue")).toBeInTheDocument();
      const themeBox = screen.getByText("Theme").closest('.info-box');
      expect(within(themeBox).getByText("Test Theme")).toBeInTheDocument();
      expect(screen.getByText("October 1, 2025")).toBeInTheDocument();
      expect(screen.getByText("14:00")).toBeInTheDocument();
      
      // Verify the main sections are present
      expect(screen.getByText("Event Details")).toBeInTheDocument();
      expect(screen.getByText("Schedule")).toBeInTheDocument();
      expect(screen.getByText("Event Theme")).toBeInTheDocument();
    });

    test("shows loading state during data fetch", async () => {
      let resolveEventFetch;
      const eventFetchPromise = new Promise((resolve) => {
        resolveEventFetch = () => resolve({ 
          ok: true, 
          json: () => Promise.resolve(mockEventData) 
        });
      });

      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/events/id/test-event-id")) {
          return eventFetchPromise;
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      await act(async () => {
        renderComponent();
      });

      expect(screen.getByText("Loading event details...")).toBeInTheDocument();

      await act(async () => {
        resolveEventFetch();
      });

      await waitForComponentToLoad();
    });

    test("handles no user session by redirecting to login", async () => {
      const { supabase } = require("../client");
      supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      await act(async () => {
        renderComponent();
      });

      await waitFor(() => {
        expect(mockedNavigate).toHaveBeenCalledWith("/login");
      });
    });

    test("handles error when fetching event data", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/events/id/test-event-id")) {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({ ok: false });
      });

      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      expect(screen.getByText("Event Not Found")).toBeInTheDocument();
      expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
    });
  });

  describe("Read-Only Mode", () => {
    test("disables edit buttons in read-only mode", async () => {
      setupMocks({ readOnly: true });

      await act(async () => {
        renderComponent(["/events/test-event-id?readonly=true"]);
      });

      await waitForComponentToLoad();

      expect(screen.queryByRole('button', { name: /edit details/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit schedule/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit theme/i })).not.toBeInTheDocument();
    });

    test("allows view-only operations in read-only mode", async () => {
      setupMocks({ readOnly: true });

      await act(async () => {
        renderComponent(["/events/test-event-id?readonly=true"]);
      });

      await waitForComponentToLoad();

      // Should still be able to view different sections
      await switchToView("Guest List");
      expect(screen.getByText("John Doe")).toBeInTheDocument();

      await switchToView("Vendor List");
      expect(screen.getByText("Vendor One")).toBeInTheDocument();
    });
  });

  describe("Event Details Management", () => {
    test("toggles edit mode for main details", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await act(async () => {
        fireEvent.click(editButton);
      });

      expect(screen.getByRole('button', { name: /save details/i })).toBeInTheDocument();
      
      // Should show editable inputs
      expect(screen.getByDisplayValue("Test Venue")).toBeInTheDocument();
    });

    test("saves event details changes", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit details/i });
      await act(async () => {
        fireEvent.click(editButton);
      });

      // Change venue
      const venueInput = screen.getByDisplayValue("Test Venue");
      await act(async () => {
        fireEvent.change(venueInput, { target: { value: "Updated Venue" } });
      });

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save details/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/events/test-event-id"),
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "application/json" }
          })
        );
      });
    });
  });

  describe("Schedule Management", () => {
    test("handles schedule editing and adding activities", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      const editScheduleButton = screen.getByRole('button', { name: /edit schedule/i });
      await act(async () => {
        fireEvent.click(editScheduleButton);
      });

      // Add new activity
      const addActivityButton = screen.getByRole('button', { name: /add activity/i });
      await act(async () => {
        fireEvent.click(addActivityButton);
      });

      const timeInputs = screen.getAllByDisplayValue("");
      const activityInputs = screen.getAllByPlaceholderText("Activity");

      expect(timeInputs.length).toBeGreaterThan(0);
      expect(activityInputs.length).toBeGreaterThan(0);

      await act(async () => {
        fireEvent.change(timeInputs[timeInputs.length - 1], { target: { value: "15:00" } });
        fireEvent.change(activityInputs[activityInputs.length - 1], { target: { value: "New Activity" } });
      });

      // Save schedule
      const saveScheduleButton = screen.getByRole('button', { name: /save schedule/i });
      await act(async () => {
        fireEvent.click(saveScheduleButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/events/test-event-id/schedule"),
          expect.objectContaining({ method: "PUT" })
        );
      });
    });

    test("schedule functionality works", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      // Test that we can enter edit mode and see the schedule section
      const editScheduleButton = screen.getByRole('button', { name: /edit schedule/i });
      await act(async () => {
        fireEvent.click(editScheduleButton);
      });

      // Should show save & add activity button in edit mode
      expect(screen.getByRole('button', { name: /save schedule/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add activity/i })).toBeInTheDocument();
    });

  });

  describe("Theme Management", () => {

    test("handles malformed theme data gracefully", async () => {
      const eventWithBadTheme = {
        ...mockEventData,
        theme: "invalid-json"
      };

      setupMocks({ eventData: eventWithBadTheme });

      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      // Should not crash and should show default theme state
      expect(screen.getByText("No theme has been set for this event.")).toBeInTheDocument();
    });
  });

describe("Guest Management", () => {
  const navigateToGuestList = async () => {
    const guestListButton = screen.getByRole('button', { name: "Guest List" });
    await act(async () => {
      fireEvent.click(guestListButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Guest Management")).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    // Ensure all API calls succeed by default and vendorRequests is an array
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEventData) });
      }
      if (url.includes("/api/guests/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuestsData) });
      }
      if (url.includes("/api/vendor-requests/event/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendorRequests) });
      }
      if (url.includes("/api/emails/send-invite")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  test("displays guest list correctly", async () => {
    await act(async () => {
      renderComponent();
    });

    await waitForComponentToLoad();
    await navigateToGuestList();

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });


  test("handles RSVP status changes", async () => {
    await act(async () => {
      renderComponent();
    });

    await waitForComponentToLoad();
    await navigateToGuestList();

    const yesCheckboxes = screen.getAllByRole('checkbox', { name: /yes/i });
    await act(async () => {
      fireEvent.click(yesCheckboxes[0]);
    });

    expect(yesCheckboxes[0]).toBeChecked();
  });

  test("sends guest invites successfully", async () => {
    await act(async () => {
      renderComponent();
    });

    await waitForComponentToLoad();
    await navigateToGuestList();

    const sendButtons = screen.getAllByRole("button", { name: /send invite/i });
    await act(async () => {
      fireEvent.click(sendButtons[0]);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/emails/send-invite"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  test("adds new guests in edit mode", async () => {
    await act(async () => {
      renderComponent();
    });

    await waitForComponentToLoad();
    await navigateToGuestList();

    const editGuestsButton = screen.getByRole('button', { name: /edit guests/i });
    await act(async () => {
      fireEvent.click(editGuestsButton);
    });

    // Fill new guest form
    const nameInput = screen.getByPlaceholderText("Guest Name");
    const emailInput = screen.getByPlaceholderText("Email");
    const dietaryInput = screen.getByPlaceholderText("Dietary Requirements");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "New Guest" } });
      fireEvent.change(emailInput, { target: { value: "new@example.com" } });
      fireEvent.change(dietaryInput, { target: { value: "Gluten Free" } });
    });

    const addButton = screen.getByRole('button', { name: /add guest/i });
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(screen.getByText("New Guest")).toBeInTheDocument();
  });
});

  describe("Vendor Management", () => {
    test("displays vendor requests with correct status", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      await switchToView("Vendor List");

      await waitFor(() => {
        const confirmedSection = screen.getByText("Confirmed Vendors").closest('.confirmed-vendors-container');
        expect(within(confirmedSection).getByText("Venue Provider")).toBeInTheDocument();
      });

      // Check for pending status
      expect(screen.getByText("Pending Approval")).toBeInTheDocument();
      
      const vendorNames = screen.getAllByText(/Vendor One|Venue Provider/);
      expect(vendorNames.length).toBeGreaterThan(0);
    });

    test("handles vendor selection and deselection", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      await switchToView("Vendor List");

      // Enter vendor editing mode
      const addVendorsButton = screen.getByRole('button', { name: /add vendors/i });
      await act(async () => {
        fireEvent.click(addVendorsButton);
      });

      // Wait for vendor cards to load by checking for select buttons
      await waitFor(() => {
        const selectButtons = screen.getAllByRole('button', { name: /select as/i });
        expect(selectButtons.length).toBeGreaterThan(0);
      });

      const selectButtons = screen.getAllByRole('button', { name: /select as/i });
      
      // Click the first select button
      await act(async () => {
        fireEvent.click(selectButtons[0]);
      });

      // Wait for the button to change to selected state
      await waitFor(() => {
        const selectedButtons = screen.getAllByText(/selected/i);
        expect(selectedButtons.length).toBeGreaterThan(0);
      });

      // Now look for the remove/X button specifically
      const removeIcons = screen.getAllByTestId("fa-times");
      const removeButton = removeIcons.find(icon => {
        const button = icon.closest('button');
        return button && !button.disabled;
      });

      if (removeButton && removeButton.closest('button')) {
        await act(async () => {
          fireEvent.click(removeButton.closest('button'));
        });
      }

      // Verify we can select again
      await waitFor(() => {
        const selectButtonsAfter = screen.getAllByRole('button', { name: /select as/i });
        expect(selectButtonsAfter.length).toBeGreaterThan(0);
      });
    });

    test("saves vendor selections", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      await switchToView("Vendor List");

      // Enter vendor editing mode
      const addVendorsButton = screen.getByRole('button', { name: /add vendors/i });
      await act(async () => {
        fireEvent.click(addVendorsButton);
      });

      // Select a vendor
      const selectButtons = screen.getAllByRole('button', { name: /select as/i });
      await act(async () => {
        fireEvent.click(selectButtons[0]);
      });

      // Save vendors
      const saveVendorsButton = screen.getByRole('button', { name: /save vendors/i });
      await act(async () => {
        fireEvent.click(saveVendorsButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/vendor-requests"),
          expect.objectContaining({ method: "POST" })
        );
      });
    });

  });

  describe("Document Management", () => {
    test("displays documents list", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      await switchToView("Documents");

      await waitFor(() => {
        expect(screen.getByText("doc.pdf")).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test("handles document upload", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      await switchToView("Documents");

      // Enter edit mode
      const editDocsButton = screen.getByRole('button', { name: /edit documents/i });
      await act(async () => {
        fireEvent.click(editDocsButton);
      });

      // Mock file upload
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/upload documents/i);

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        const { supabase } = require("../client");
        expect(supabase.storage.from).toHaveBeenCalledWith("event-documents");
      });
    });

    test("handles document deletion", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      await switchToView("Documents");

      // Enter edit mode
      const editDocsButton = screen.getByRole('button', { name: /edit documents/i });
      await act(async () => {
        fireEvent.click(editDocsButton);
      });

      // Wait for delete button to appear
      await waitFor(() => {
        expect(screen.getByTitle("Delete document")).toBeInTheDocument();
      });

      global.confirm.mockReturnValueOnce(true);
      const deleteButton = screen.getByTitle("Delete document");
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(global.confirm).toHaveBeenCalledWith("Are you sure you want to delete \"doc.pdf\"?");
    });

    test("shows empty state when no documents", async () => {
      // Mock empty documents
      setupMocks({ documents: [] });

      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();
      await switchToView("Documents");

      expect(screen.getByText("No documents found in storage for this event.")).toBeInTheDocument();
    });
  });

  describe("Export Functionality", () => {
    test("exports event data successfully", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      const exportButton = screen.getByRole("button", { name: /export event data/i });
      await act(async () => {
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/events/test-event-id/export"),
          expect.objectContaining({ method: "GET" })
        );
      });
    });

    test("handles export failure", async () => {
      // Mock successful event fetch but failed export
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/events/id/test-event-id")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEventData) });
        }
        if (url.includes("/api/events/test-event-id/export")) {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      const exportButton = screen.getByRole("button", { name: /export event data/i });
      await act(async () => {
        fireEvent.click(exportButton);
      });

      // Should handle the error without crashing
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe("Navigation and UI Interactions", () => {
    test("navigates back to dashboard", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      const backButton = screen.getByRole('button', { name: /back to.*dashboard/i });
      await act(async () => {
        fireEvent.click(backButton);
      });

      expect(mockedNavigate).toHaveBeenCalledWith("/dashboard");
    });

    test("switches between different views", async () => {
      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      // Test all view switches
      const views = [
        { name: "Guest List", buttonText: /guest list/i },
        { name: "Vendor List", buttonText: /vendor list/i },
        { name: "Documents", buttonText: /documents/i },
        { name: "Event Overview", buttonText: /event overview/i }
      ];
      
      for (const view of views) {
        const viewButtons = screen.getAllByRole('button', { name: view.buttonText });
        const mainNavButton = viewButtons.find(button => 
          button.className.includes('new-button')
        );
        
        if (mainNavButton) {
          await act(async () => {
            fireEvent.click(mainNavButton);
          });
          
          await waitFor(() => {
            expect(mainNavButton).toHaveClass('active');
          });
        }
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("handles empty data states gracefully", async () => {
      const emptyData = {
        event_id: "test-event-id",
        name: "Empty Event",
        start_time: "2025-10-01T14:00:00",
        venue: "",
        theme: null,
        schedule: [],
        documents: [],
        vendors: []
      };

      setupMocks({ 
        eventData: emptyData,
        guestsData: [],
        vendorsData: [],
        vendorRequests: [],
        documents: []
      });

      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      // Test empty states in different views
      await switchToView("Guest List");
      expect(screen.getByText("No guests have been added yet.")).toBeInTheDocument();

      await switchToView("Vendor List");
      expect(screen.getByText("No vendors have been added or requested for this event.")).toBeInTheDocument();

      await switchToView("Documents");
      expect(screen.getByText("No documents found in storage for this event.")).toBeInTheDocument();
    });

    test("handles API failures gracefully", async () => {
      global.fetch.mockImplementation(() => Promise.resolve({ ok: false }));

      await act(async () => {
        renderComponent();
      });

      // Should handle errors without crashing
      await waitForComponentToLoad();
    });

    test("handles vendor user role correctly", async () => {
      const vendorUser = {
        id: "vendor-user-id",
        email: "vendor@example.com",
        user_metadata: { full_name: "Vendor User" }
      };

      const { supabase } = require("../client");
      supabase.auth.getUser.mockResolvedValue({ data: { user: vendorUser } });

      // Mock read-only mode for vendor
      setupMocks({ readOnly: true });

      await act(async () => {
        renderComponent(["/events/test-event-id?readonly=true"]);
      });

      await waitForComponentToLoad();

      // Vendor should see back button
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toHaveTextContent(/vendor dashboard/i);
    });
  });

  describe("Unsplash Integration", () => {
    test("searches for event inspiration photos", async () => {
      const { searchUnsplashPhotos } = require("../services/unsplash");
      searchUnsplashPhotos.mockResolvedValue({
        results: [
          {
            id: "photo1",
            urls: { small: "http://example.com/photo1.jpg" },
            alt_description: "Test photo",
            user: { name: "Photographer" },
            links: { html: "http://unsplash.com/photo1" }
          }
        ]
      });

      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      const searchInput = screen.getByPlaceholderText("Search inspiration for this event");
      const searchButton = screen.getByRole('button', { name: /search/i });

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "wedding" } });
        fireEvent.click(searchButton);
      });

      await waitFor(() => {
        expect(searchUnsplashPhotos).toHaveBeenCalledWith("wedding", 1, 12);
      });
    });

    test("handles unsplash search errors", async () => {
      const { searchUnsplashPhotos } = require("../services/unsplash");
      searchUnsplashPhotos.mockRejectedValue(new Error("Search failed"));

      await act(async () => {
        renderComponent();
      });

      await waitForComponentToLoad();

      const searchButton = screen.getByRole('button', { name: /search/i });
      await act(async () => {
        fireEvent.click(searchButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/search failed/i)).toBeInTheDocument();
      });
    });
  });
});