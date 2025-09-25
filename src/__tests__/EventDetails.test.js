import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventDetails from "../pages/EventDetails.jsx";

// Debug import
console.log("EventDetails imported:", EventDetails);

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
      })),
    },
    from: jest.fn(() => ({
      update: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

// Mock process.env for API_BASE
process.env.REACT_APP_BASE_URL = "http://localhost:5000";

// Mock window.location for API_URL
Object.defineProperty(window, "location", {
  value: { hostname: "localhost", search: "" },
  writable: true,
});

// Mock FileReader for file uploads
global.FileReader = class {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }
  readAsDataURL() {
    this.result = "data:image/jpeg;base64,mocked";
    if (this.onloadend) this.onloadend();
  }
};

// Mock useNavigate and useParams
const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
  useParams: () => ({ id: "test-event-id" }),
}));

describe("EventDetails Testing", () => {
  const mockUser = { id: "test-user-id" };
  const mockSession = { access_token: "mock-token" };

  const mockEventData = {
    event_id: "test-event-id",
    name: "Test Event",
    start_time: "2025-10-01T14:00:00",
    venue: "Test Venue",
    theme: JSON.stringify({ name: "Test Theme", colors: ["#FF0000"], notes: "Test notes" }),
    schedule: JSON.stringify([{ time: "14:00", activity: "Welcome" }]),
    documents: JSON.stringify([{ name: "doc.pdf", url: "http://example.com/doc.pdf", uploaded_at: "2025-09-24T09:00:00Z" }]),
    vendors: ["vendor1"],
  };

  const mockGuestsData = [
    { guest_id: "guest1", name: "John Doe", email: "john@example.com", rsvp_status: "Pending", dietary_info: "Vegan" },
  ];

  const mockVendorsData = [
    { vendor_id: "vendor1", business_name: "Vendor One", service_type: "Catering", contact_number: "1234567890", description: "Catering services" },
  ];

  const mockVendorRequests = [
    { request_id: "req1", vendor_id: "vendor1", status: "pending", vendor: mockVendorsData[0] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    const { supabase } = require("../client");
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    supabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });

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
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error.mockRestore();
    console.log.mockRestore();
    delete process.env.REACT_APP_BASE_URL;
    window.location.search = "";
  });

  test("renders loading state initially", async () => {
    global.fetch.mockImplementationOnce((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => mockEventData }), 100));
      }
      return Promise.resolve({ ok: true, json: () => [] });
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

    expect(screen.getByText("Loading event details...")).toBeInTheDocument();
  });

  test("fetches and displays event data", async () => {
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
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText("Test Venue")).toBeInTheDocument();
    expect(screen.getByText("Test Theme")).toBeInTheDocument();
  });

  test("handles read-only mode", async () => {
    window.location.search = "?readonly=true";

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/events/test-event-id?readonly=true"]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByRole("button", { name: /Save Changes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit Event/i })).not.toBeInTheDocument();
  });

  test("toggles edit mode and updates form fields", async () => {
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
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const editButton = screen.getByRole("button", { name: /Edit Event/i });
    await act(async () => {
      fireEvent.click(editButton);
    });

    const venueInput = screen.getByDisplayValue("Test Venue");
    await act(async () => {
      fireEvent.change(venueInput, { target: { value: "Updated Venue" } });
    });

    expect(venueInput).toHaveValue("Updated Venue");
  });

  test("switches to guests view and adds a guest in edit mode", async () => {
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
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const guestsTab = screen.getByRole("button", { name: /Guest Management/i });
    await act(async () => {
      fireEvent.click(guestsTab);
    });

    const editButton = screen.getByRole("button", { name: /Edit Event/i });
    await act(async () => {
      fireEvent.click(editButton);
    });

    const nameInput = screen.getByPlaceholderText("Guest Name");
    const emailInput = screen.getByPlaceholderText("Email");
    const addButton = screen.getByRole("button", { name: /Add Guest/i });

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "New Guest" } });
      fireEvent.change(emailInput, { target: { value: "new@example.com" } });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText("New Guest")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("sends invite in view mode", async () => {
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
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const guestsTab = screen.getByRole("button", { name: /Guest Management/i });
    await act(async () => {
      fireEvent.click(guestsTab);
    });

    const sendButton = screen.getByRole("button", { name: /Send Invite/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("John Doe"));
  });

  test("updates RSVP in view mode", async () => {
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
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const guestsTab = screen.getByRole("button", { name: /Guest Management/i });
    await act(async () => {
      fireEvent.click(guestsTab);
    });

    const yesCheckbox = screen.getByLabelText("Yes");
    await act(async () => {
      fireEvent.click(yesCheckbox);
    });

    expect(yesCheckbox).toBeChecked();
  });

  test("handles error when fetching event data", async () => {
    global.fetch.mockImplementationOnce((url) => {
      if (url.includes("/api/events/id/test-event-id")) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: true, json: () => [] });
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

    await waitFor(() => {
      expect(screen.queryByText("Loading event details...")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText("Event Not Found")).toBeInTheDocument();
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
    }, { timeout: 3000 });
  });
});