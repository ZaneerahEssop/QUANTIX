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
        list: jest.fn(() => Promise.resolve({ data: [], error: null })),
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

// Mock global fetch
global.fetch = jest.fn();

// Mock window.alert and confirm
global.alert = jest.fn();
global.confirm = jest.fn();

// Mock process.env for API_BASE
process.env.REACT_APP_BASE_URL = "http://localhost:5000";
process.env.REACT_APP_API_URL = "http://localhost:5000";

// Mock URL methods for export functionality
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

// Mock useNavigate and useParams
const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
  useParams: () => ({ id: "test-event-id" }),
}));

// Mock CSS
jest.mock("../styling/eventDetails.css", () => ({}));

describe("EventDetails Testing", () => {
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
    { vendor_id: "vendor1", business_name: "Vendor One", service_type: "Catering", contact_number: "1234567890", description: "Catering services" },
    { vendor_id: "vendor2", business_name: "Venue Provider", service_type: "venue", contact_number: "0987654321", description: "Beautiful venue" },
  ];

  const mockVendorRequests = [
    { request_id: "req1", vendor_id: "vendor1", status: "pending", vendor: mockVendorsData[0] },
    { request_id: "req2", vendor_id: "vendor2", status: "accepted", vendor: mockVendorsData[1] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    const { supabase } = require("../client");
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });

    // Mock URLSearchParams properly
    global.URLSearchParams = jest.fn().mockImplementation(() => ({
      get: jest.fn((param) => param === 'readonly' ? 'false' : null)
    }));

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEventData) });
      }
      if (url.includes("/api/guests/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuestsData) });
      }
      if (url.includes("/api/vendors")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendorsData) });
      }
      if (url.includes("/api/vendor-requests/event/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendorRequests) });
      }
      if (url.includes("/api/events/test-event-id/export")) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'attachment; filename="event_export.zip"' },
          blob: () => Promise.resolve(new Blob(['test']))
        });
      }
      if (url.includes("/api/events/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      if (url.includes("/api/guests/test-event-id/guest1")) {
        return Promise.resolve({ ok: true });
      }
      if (url.includes("/api/emails/send-invite")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error.mockRestore();
    console.log.mockRestore();
  });

  // Helper function to wait for component to load
  const waitForComponentToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });
  };

  // Helper function to switch to different views
  const switchToView = async (viewName) => {
    const viewButton = screen.getByRole("button", { name: new RegExp(viewName, "i") });
    await act(async () => {
      fireEvent.click(viewButton);
    });
  };

  test("renders event details component", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    expect(screen.getByText("Test Venue")).toBeInTheDocument();
    expect(screen.getByText("Test Theme")).toBeInTheDocument();
  });

  test("shows loading state during data fetch", async () => {
    let resolveEventFetch;
    const eventFetchPromise = new Promise((resolve) => {
      resolveEventFetch = () => resolve({ ok: true, json: () => Promise.resolve(mockEventData) });
    });

    const originalFetch = global.fetch;
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return eventFetchPromise;
      }
      return originalFetch(url);
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.queryByText("Loading event details...")).toBeInTheDocument();

    await act(async () => {
      resolveEventFetch();
    });

    await waitForComponentToLoad();
  });

  test("handles read-only mode", async () => {
    global.URLSearchParams = jest.fn().mockImplementation(() => ({
      get: jest.fn((param) => param === 'readonly' ? 'true' : null)
    }));

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id?readonly=true"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    expect(screen.queryByRole('button', { name: /edit details/i })).not.toBeInTheDocument();
  });

  test("toggles edit mode", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    const editButton = screen.getByRole('button', { name: /edit details/i });
    await act(async () => {
      fireEvent.click(editButton);
    });

    expect(screen.getByRole('button', { name: /save details/i })).toBeInTheDocument();
  });

  test("handles schedule management in edit mode", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    const editScheduleButton = screen.getByRole('button', { name: /edit schedule/i });
    await act(async () => {
      fireEvent.click(editScheduleButton);
    });

    const addActivityButton = screen.getByRole('button', { name: /add activity/i });
    await act(async () => {
      fireEvent.click(addActivityButton);
    });

    const timeInputs = screen.getAllByDisplayValue("");
    const activityInputs = screen.getAllByPlaceholderText("Activity");

    expect(timeInputs.length).toBeGreaterThan(0);
    expect(activityInputs.length).toBeGreaterThan(0);
  });

  test("handles theme management in edit mode", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    const editThemeButton = screen.getByRole('button', { name: /edit theme/i });
    await act(async () => {
      fireEvent.click(editThemeButton);
    });

    const themeNameInput = screen.getByPlaceholderText("Enter theme name");
    await act(async () => {
      fireEvent.change(themeNameInput, { target: { value: "Updated Theme" } });
    });

    expect(themeNameInput).toHaveValue("Updated Theme");
  });

  test("displays guest management", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Guest Management");

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  test("handles RSVP status changes", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Guest Management");

    const yesCheckboxes = screen.getAllByRole('checkbox', { name: /yes/i });
    await act(async () => {
      fireEvent.click(yesCheckboxes[0]);
    });

    expect(yesCheckboxes[0]).toBeChecked();
  });

  test("sends guest invites with email functionality", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Guest Management");

    const sendButtons = screen.getAllByRole("button", { name: /send invite/i });
    await act(async () => {
      fireEvent.click(sendButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Invitation successfully sent to/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("displays vendor management", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Vendor Management");

    expect(screen.getByText("Vendor One")).toBeInTheDocument();
  });

  test("handles vendor requests", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Vendor Management");

    const vendorRequestCalls = global.fetch.mock.calls.filter(call =>
      call[0].includes("/api/vendor-requests/event/test-event-id")
    );
    expect(vendorRequestCalls.length).toBeGreaterThan(0);

    expect(screen.getByText("Vendor One")).toBeInTheDocument();
  });

  test("handles contract management view", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Vendor Management");

    await waitFor(() => {
      expect(screen.getByText("Venue Provider")).toBeInTheDocument();
    });

    const viewContractButtons = screen.getAllByRole('button', { name: /view contract/i });
    await act(async () => {
      fireEvent.click(viewContractButtons[0]);
    });

    expect(screen.getByTestId("mock-contract-management")).toBeInTheDocument();
    expect(screen.getByText(/Contract Management for/)).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back to vendors/i });
    await act(async () => {
      fireEvent.click(backButton);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendors' })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("displays document management", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Document Management");

    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
  });

  test("handles document deletion", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Document Management");

    const editDocsButton = screen.getByRole('button', { name: /edit documents/i });
    await act(async () => {
      fireEvent.click(editDocsButton);
    });

    global.confirm.mockReturnValueOnce(true);
    const deleteButtons = screen.getAllByTitle("Delete document");
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(global.confirm).toHaveBeenCalledWith("Are you sure you want to delete this document?");
  });

  test("exports event data", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
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

  test("saves event changes", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    const editButton = screen.getByRole('button', { name: /edit details/i });
    await act(async () => {
      fireEvent.click(editButton);
    });

    const saveButton = screen.getByRole('button', { name: /save details/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/events/test-event-id"),
        expect.objectContaining({
          method: "PUT"
        })
      );
    });
  });

  test("handles empty data states", async () => {
    const emptyEventData = {
      ...mockEventData,
      schedule: [],
      documents: [],
      vendors: [],
      theme: null,
      venue: 'Empty Data Venue'
    };

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyEventData) });
      }
      if (url.includes("/api/guests/test-event-id")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Guest Management");

    await waitFor(() => {
      expect(screen.getByText("No guests have been added yet.")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles no user session", async () => {
    const { supabase } = require("../client");
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("navigates back", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    const backButton = screen.getByRole('button', { name: /back$/i });
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockedNavigate).toHaveBeenCalledWith(-1);
  });

  test("handles vendor card click", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();
    await switchToView("Vendor Management");

    const editVendorsButton = screen.getByRole('button', { name: /edit vendors/i });
    await act(async () => {
        fireEvent.click(editVendorsButton);
    });
    
    // Find the main vendor selection container to scope our search
    const vendorSelectionContainer = await screen.findByLabelText("Vendor Selection");

    // Now, find the specific vendor card *within* that container
    const vendorCard = within(vendorSelectionContainer).getByText("Vendor One").closest('.vendor-card');
    expect(vendorCard).not.toBeNull();
    
    const cardContent = vendorCard.querySelector('.vendor-card-content');
    await act(async () => {
        if(cardContent) fireEvent.click(cardContent);
    });

    expect(mockedNavigate).toHaveBeenCalledWith("/vendors/vendor1/services?readonly=true");
  });

  test("handles error when fetching event data", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitForComponentToLoad();

    expect(screen.getByText("Event Not Found")).toBeInTheDocument();
  });
});