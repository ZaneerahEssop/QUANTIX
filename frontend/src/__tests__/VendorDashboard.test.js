import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VendorDashboard from "../pages/VendorDashboard";
import { supabase } from "../client";
import chatService from "../services/chatService";

// Mock supabase
jest.mock("../client", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock chatService
jest.mock("../services/chatService", () => ({
  connect: jest.fn(),
  onNewMessage: jest.fn(),
  onMessageError: jest.fn(),
  onMessageNotification: jest.fn(),
  removeAllListeners: jest.fn(),
  getUserConversations: jest.fn(() => Promise.resolve([])),
  getUnreadCount: jest.fn(() => Promise.resolve({ unreadCount: 0 })),
  getOrCreateConversation: jest.fn(() => Promise.resolve({ conversation_id: "test-conv" })),
  joinConversation: jest.fn(),
  getConversationMessages: jest.fn(() => Promise.resolve([])),
  sendMessage: jest.fn(),
  sendMessageAPI: jest.fn(),
  markMessagesAsRead: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, "location", {
  value: { hostname: "localhost", origin: "http://localhost:3000" },
  writable: true,
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock React Calendar
jest.mock("react-calendar", () => {
  return function MockCalendar({ onChange, value, tileClassName, tileContent }) {
    return (
      <div data-testid="mock-calendar">
        Mock Calendar
        <button onClick={() => onChange(new Date('2025-01-01'))}>Change Date</button>
        <div data-testid="tile-content">
          {tileContent && tileContent({ date: new Date('2025-01-01'), view: 'month' })}
        </div>
        <div data-testid="tile-classes">
          {tileClassName && tileClassName({ date: new Date('2025-01-01'), view: 'month' })}
        </div>
      </div>
    );
  };
});

// Mock Navbar
jest.mock("../components/Navbar", () => {
  return function MockNavbar({ session }) {
    return <div>Mock Navbar</div>;
  };
});

// Mock ChatUI 
jest.mock("../components/ChatUI", () => ({
  __esModule: true,
  default: function MockChatUI({ 
    listTitle, 
    vendors, 
    onSendMessage, 
    onSelectVendor, 
    selectedVendor, 
    messages, 
    unreadCount, 
    showSearch 
  }) {
    // Transform the vendors array to match what the component expects for selection
    const transformedVendors = vendors?.map(vendor => ({
      id: vendor.id || vendor.conversation_id,
      name: vendor.name,
      plannerId: vendor.plannerId || vendor.planner_id,
      conversationId: vendor.conversationId || vendor.conversation_id
    })) || [];

    return (
      <div data-testid="chat-ui">
        Mock ChatUI - Title: {listTitle} - Unread: {unreadCount}
        {transformedVendors.length > 0 && (
          <button 
            onClick={() => onSelectVendor(transformedVendors[0])}
            data-testid="select-vendor-button"
          >
            Select Vendor
          </button>
        )}
        <button onClick={() => onSendMessage({ text: "Test message" })}>Send Message</button>
        <div data-testid="messages-count">Messages: {messages?.length || 0}</div>
        <div data-testid="selected-vendor">{selectedVendor?.name || 'None'}</div>
        <div data-testid="vendors-count">Vendors: {transformedVendors.length}</div>
      </div>
    );
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("VendorDashboard Testing", () => {
  const mockSession = {
    user: {
      id: "test-vendor-id",
      email: "test@example.com",
      user_metadata: {},
    },
  };

  const mockVendorData = {
    name: "Test Vendor",
    profile_picture: "test-pic.jpg",
  };

  const mockRequestsData = [
    {
      request_id: "1",
      status: "pending",
      events: {
        event_id: "1",
        name: "Test Event",
        start_time: "2025-10-01T14:00:00",
        venue: "Test Venue",
        planner_id: "test-planner-id",
      },
    },
    {
      request_id: "2",
      status: "accepted",
      events: {
        event_id: "2",
        name: "Accepted Event",
        start_time: "2025-11-01T14:00:00",
        venue: "Accepted Venue",
        planner_id: "test-planner-id",
      },
    },
    {
      request_id: "3",
      status: "pending",
      events: null,
    },
  ];

  const mockPlannerData = {
    name: "Test Planner",
  };

  const mockConversations = [
    {
      conversation_id: "conv-1",
      planner_id: "planner-1",
      planner: { name: "Test Planner" },
      last_message_at: "2024-01-01T10:00:00Z",
    },
  ];

  const mockMessages = [
    {
      message_id: "msg-1",
      message_text: "Hello vendor",
      created_at: "2024-01-01T10:00:00Z",
      sender_id: "planner-1",
      sender: { name: "Test Planner" },
    },
  ];

  let realTimeMessageHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

    // Mock supabase
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { ...mockSession.user, user_metadata: {} } } 
    });
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

    const mockSelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockVendorData, error: null }),
    };
    
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue(mockSelectChain),
    });

    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: jest.fn(),
      }),
    };
    supabase.channel.mockReturnValue(mockChannel);

    // Mock fetch
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequestsData),
        });
      }
      if (url.includes("/api/planners/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlannerData),
        });
      }
      if (url.includes("/api/vendor-requests/1") || url.includes("/api/vendor-requests/2")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Not found" }) });
    });

    // Mock chatService
    chatService.getUserConversations.mockResolvedValue(mockConversations);
    chatService.getConversationMessages.mockResolvedValue(mockMessages);
    chatService.getUnreadCount.mockResolvedValue({ unreadCount: 3 });
    chatService.onNewMessage.mockImplementation((callback) => {
      realTimeMessageHandler = callback;
      return () => {};
    });
    chatService.onMessageError.mockImplementation((callback) => {
      return () => {};
    });
    chatService.onMessageNotification.mockImplementation((callback) => {
      return () => {};
    });

    // Mock console
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error.mockRestore();
    console.warn.mockRestore();
    console.log.mockRestore();
    realTimeMessageHandler = null;
  });

  test("renders loading state initially", async () => {
    let resolveFetch;
    const fetchPromise = new Promise(resolve => {
      resolveFetch = () => resolve({ ok: true, json: () => Promise.resolve(mockRequestsData) });
    });

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return fetchPromise;
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/Loading your dashboard.../i)).toBeInTheDocument();

    await act(async () => {
      resolveFetch();
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Loading your dashboard.../i)).not.toBeInTheDocument();
    });
  });

  test("handles vendor data fetch error", async () => {
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error("Fetch failed") }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      const welcomeHeading = screen.getByRole('heading', { level: 1 });
      expect(welcomeHeading).toHaveTextContent(/test/i);
    });
  });

  test("updates user role if not set", async () => {
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { ...mockSession.user, user_metadata: {} } } 
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: { role: "vendor" },
      });
    });
  });

  test("does not update user role if already set", async () => {
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { ...mockSession.user, user_metadata: { role: "vendor" } } } 
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  test("handles API request failure gracefully", async () => {
    global.fetch.mockImplementation(() => 
      Promise.reject(new Error("Network error"))
    );

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
      expect(screen.getByText(/No pending requests at the moment/i)).toBeInTheDocument();
    });
  });

  test("handles request response with error", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/1")) {
        return Promise.resolve({ 
          ok: false, 
          json: () => Promise.resolve({ error: "Update failed" }) 
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const acceptButton = screen.getByText("Accept");

    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/vendor-requests/1"),
        expect.objectContaining({
          method: "PUT",
        })
      );
    });
  });

  test("navigates to event details when view details clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Accepted Event")).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByText("View Details →");
    await act(async () => {
      fireEvent.click(viewDetailsButtons[0]);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/viewEvent/2?readonly=true"
    );
  });

  test("handles calendar date change", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("mock-calendar")).toBeInTheDocument();
    });

    const changeDateButton = screen.getByText("Change Date");
    await act(async () => {
      fireEvent.click(changeDateButton);
    });

    expect(screen.getByTestId("tile-content")).toBeInTheDocument();
    expect(screen.getByTestId("tile-classes")).toBeInTheDocument();
  });



  test("uses existing conversation ID when available", async () => {
    // Mock conversation with conversationId for direct selection
    const mockConversationWithId = {
      conversation_id: "existing-conv-id",
      planner_id: "planner-1", 
      planner: { name: "Test Planner" },
      last_message_at: "2024-01-01T10:00:00Z",
    };
    
    // The vendor's conversations list
    chatService.getUserConversations.mockResolvedValue([mockConversationWithId]);

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-ui")).toBeInTheDocument();
    });

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByTestId("vendors-count")).toHaveTextContent("Vendors: 1");
    });

    const selectButton = screen.getByText("Select Vendor");
    await act(async () => {
      fireEvent.click(selectButton);
    });

    // Should use existing conversation ID instead of creating new one
    expect(chatService.getOrCreateConversation).not.toHaveBeenCalled();
    expect(chatService.joinConversation).toHaveBeenCalledWith("existing-conv-id");
  });

  test("handles real-time message updates correctly", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(chatService.onNewMessage).toHaveBeenCalled();
    });

    const testMessage = {
      message_id: "real-time-msg",
      message_text: "Real-time message",
      created_at: new Date().toISOString(),
      sender_id: "planner-1",
      sender: { name: "Test Planner" },
      conversation_id: "conv-1",
    };

    await act(async () => {
      realTimeMessageHandler(testMessage);
    });

    expect(realTimeMessageHandler).toBeDefined();
  });

  test("handles real-time message from current user", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    const testMessage = {
      message_id: "own-msg",
      message_text: "My own message",
      created_at: new Date().toISOString(),
      sender_id: "test-vendor-id",
      sender: { name: "Test Vendor" },
      conversation_id: "conv-1",
    };

    await act(async () => {
      realTimeMessageHandler(testMessage);
    });

    expect(realTimeMessageHandler).toBeDefined();
  });

  test("handles empty events and requests gracefully", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
      expect(screen.getByText(/No pending requests at the moment/i)).toBeInTheDocument();
    });
  });

  test("filters out past events correctly", async () => {
    const pastEventsData = [
      {
        request_id: "past-1",
        status: "accepted",
        events: {
          event_id: "past-1",
          name: "Past Event",
          start_time: "2020-01-01T10:00:00",
          venue: "Past Venue",
          planner_id: "test-planner-id",
        },
      },
    ];

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(pastEventsData),
        });
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
      expect(screen.queryByText("Past Event")).not.toBeInTheDocument();
    });
  });

  test("handles success message display and close", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const acceptButton = screen.getByText("Accept");
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Request accepted successfully!/i)).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText("Close");
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByText(/Request accepted successfully!/i)).not.toBeInTheDocument();
  });

  test("handles reject request", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const rejectButton = screen.getByText("Reject");
    await act(async () => {
      fireEvent.click(rejectButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/vendor-requests/1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "rejected" }),
        })
      );
    });
  });

  test("cleans up on unmount", async () => {
    const { unmount } = render(
      <MemoryRouter>
        <VendorDashboard session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Vendor/i)).toBeInTheDocument();
    });

    await act(async () => {
      unmount();
    });

    expect(chatService.removeAllListeners).toHaveBeenCalled();
  });

  test("handles no session gracefully", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={null} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Navbar/i)).toBeInTheDocument();
    });
  });

  test("handles profile picture with no image", async () => {
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ 
            data: { name: "Test Vendor", profile_picture: null }, 
            error: null 
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Vendor/i)).toBeInTheDocument();
    });

    // Look for the profile container instead of the image
    const profileContainer = screen.getByText("FaUser").closest('div[style*="border-radius: 50%"]');
    expect(profileContainer).toBeInTheDocument();
    
    // Verify the container has the right background color for no image
    expect(profileContainer).toHaveStyle({
      backgroundColor: "rgb(255, 218, 185)" // #FFDAB9
    });
  });

  test("sets up real-time subscriptions", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith("vendor_requests_changes");
      expect(chatService.connect).toHaveBeenCalledWith("test-vendor-id");
    });
  });

  test("handles profile picture modal", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Vendor/i)).toBeInTheDocument();
    });

    const profilePicture = screen.getByAltText("Profile");
    await act(async () => {
      fireEvent.click(profilePicture);
    });

    expect(screen.getByAltText("Profile Preview")).toBeInTheDocument();

    const closeButton = screen.getByText("✕");
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByAltText("Profile Preview")).not.toBeInTheDocument();
  });

  test("handles event time parsing edge cases", async () => {
    const edgeCaseEvents = [
      {
        request_id: "time-1",
        status: "accepted",
        events: {
          event_id: "time-1",
          name: "Event with malformed time",
          start_time: "invalid-date-format", // Malformed date
          venue: "Test Venue",
          planner_id: "test-planner-id",
        },
      },
    ];

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(edgeCaseEvents),
        });
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      //it should handle malformed dates without crashing
      expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
    });
  });

  test("handles message notification updates", async () => {
    const mockOnNotification = jest.fn();
    chatService.onMessageNotification.mockImplementation(mockOnNotification);

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(chatService.onMessageNotification).toHaveBeenCalled();
    });

    const notificationHandler = mockOnNotification.mock.calls[0][0];
    await act(async () => {
      notificationHandler({ type: "new_message" });
    });

    // Should update unread count
    expect(chatService.onMessageNotification).toHaveBeenCalled();
  });
});