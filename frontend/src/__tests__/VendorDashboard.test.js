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
jest.mock("react-calendar", () => ({ onChange, value, tileContent }) => (
  <div data-testid="mock-calendar">
    Mock Calendar
    <button onClick={() => onChange(new Date('2025-01-01'))}>Change Date</button>
    <div data-testid="tile-content">{tileContent && tileContent({ date: new Date(), view: 'month' })}</div>
  </div>
));

// Mock Navbar
jest.mock("../components/Navbar", () => () => <div>Mock Navbar</div>);

// Mock ChatUI
jest.mock("../components/ChatUI", () => ({
  __esModule: true,
  default: ({ listTitle, vendors, onSendMessage, onSelectVendor, selectedVendor, messages, unreadCount, showSearch }) => (
    <div data-testid="chat-ui">
      Mock ChatUI - Title: {listTitle} - Unread: {unreadCount}
      <button onClick={() => onSelectVendor(vendors?.[0] || {})}>Select Vendor</button>
      <button onClick={() => onSendMessage({ text: "Test message" })}>Send Message</button>
      <div data-testid="messages-count">Messages: {messages?.length || 0}</div>
      <div data-testid="selected-vendor">{selectedVendor?.name || 'None'}</div>
    </div>
  ),
}));

describe("VendorDashboard Testing", () => {
  const mockSession = {
    user: {
      id: "test-vendor-id",
      email: "test@example.com",
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
      events: null, // Test null events case
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock supabase.auth.getUser and updateUser
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockSession.user } });
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

    // Mock supabase.from
    supabase.from.mockImplementation((table) => {
      return {
        select: jest.fn(() => {
          return {
            eq: jest.fn(() => {
              return {
                single: jest.fn(() => {
                  return Promise.resolve({ data: mockVendorData, error: null });
                }),
              };
            }),
          };
        }),
      };
    });

    // Mock supabase.channel
    supabase.channel.mockImplementation((channelName) => {
      return {
        on: jest.fn(() => {
          return {
            subscribe: jest.fn(() => {
              return {
                unsubscribe: jest.fn(),
              };
            }),
          };
        }),
      };
    });

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

    // Mock chatService methods
    chatService.getUserConversations.mockResolvedValue(mockConversations);
    chatService.getConversationMessages.mockResolvedValue(mockMessages);
    chatService.getUnreadCount.mockResolvedValue({ unreadCount: 3 });

    // Mock console methods to reduce noise
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
  });

  test("renders loading state initially", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: () => Promise.resolve(mockRequestsData) }), 100)
        );
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
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
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Pending Requests/i)).toBeInTheDocument();
    });
  });

  test("handles vendor data fetch error", async () => {
    // Mock vendor data fetch to fail
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error("Fetch failed") }),
        }),
      }),
    }));

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Should fallback to email-based vendor name - be more specific
      const welcomeHeading = screen.getByRole('heading', { level: 1 });
      expect(welcomeHeading).toHaveTextContent(/test/i);
    });
  });

  test("handles API request failure", async () => {
    global.fetch.mockImplementation(() => 
      Promise.resolve({ 
        ok: false, 
        json: () => Promise.resolve({ error: "API Error" }) 
      })
    );

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/No pending requests at the moment/i)).toBeInTheDocument();
    });
  });

  test("handles request response with error", async () => {
    // First render with successful data
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

    // Now mock the update to fail
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
        expect.any(Object)
      );
    });
  });

  test("handles profile picture click and modal", async () => {
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

    // Modal should be visible
    expect(screen.getByAltText("Profile Preview")).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText("✕");
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Modal should be closed
    expect(screen.queryByAltText("Profile Preview")).not.toBeInTheDocument();
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

    // Calendar change should be handled without errors
    expect(screen.getByTestId("mock-calendar")).toBeInTheDocument();
  });

  test("handles chat functionality", async () => {
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

    // Test selecting a planner
    const selectVendorButton = screen.getByText("Select Vendor");
    await act(async () => {
      fireEvent.click(selectVendorButton);
    });

    // Test sending a message
    const sendMessageButton = screen.getByText("Send Message");
    await act(async () => {
      fireEvent.click(sendMessageButton);
    });

    expect(chatService.sendMessage).toHaveBeenCalled();
    expect(chatService.sendMessageAPI).toHaveBeenCalled();
  });

  test("handles empty events and requests", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]), // Empty array
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
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

  test("handles event date formatting edge cases", async () => {
    const eventsWithEdgeCases = [
      {
        request_id: "4",
        status: "accepted",
        events: {
          event_id: "4",
          name: "Event with Invalid Time Format",
          start_time: "2025-12-01T14:00:00", // Valid date but will trigger time parsing warning
          venue: "Test Venue", 
          planner_id: "test-planner-id",
        },
      },
      {
        request_id: "5", 
        status: "accepted",
        events: {
          event_id: "5",
          name: "Event with No Time",
          start_time: "2025-12-02", // Date without time
          venue: "Test Venue",
          planner_id: "test-planner-id",
        },
      }
    ];

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(eventsWithEdgeCases),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Should handle the edge cases and still display the events
      expect(screen.getByText("Event with Invalid Time Format")).toBeInTheDocument();
      expect(screen.getByText("Event with No Time")).toBeInTheDocument();
    });
  });

  test("handles real-time message updates", async () => {
    const mockOnNewMessage = jest.fn();
    chatService.onNewMessage.mockImplementation(mockOnNewMessage);

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

    // Simulate receiving a real-time message
    const mockMessageHandler = mockOnNewMessage.mock.calls[0][0];
    const testMessage = {
      message_id: "real-time-msg",
      message_text: "Real-time message",
      created_at: new Date().toISOString(),
      sender_id: "planner-1",
      sender: { name: "Test Planner" },
      conversation_id: "conv-1",
    };

    await act(async () => {
      mockMessageHandler(testMessage);
    });

    // Should handle real-time message without errors
    expect(chatService.onNewMessage).toHaveBeenCalled();
  });

  test("handles conversation selection with existing conversationId", async () => {
    // Mock conversations to include one with conversationId
    const mockConversationsWithId = [{
      ...mockConversations[0],
      conversationId: "existing-conv-id"
    }];
    
    chatService.getUserConversations.mockResolvedValue(mockConversationsWithId);

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

    // Use the existing select button from our mock
    const selectButton = screen.getByText("Select Vendor");
    await act(async () => {
      fireEvent.click(selectButton);
    });

    expect(chatService.joinConversation).toHaveBeenCalled();
  });

  test("handles component unmounting", async () => {
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

    // Should clean up subscriptions and listeners
    expect(chatService.removeAllListeners).toHaveBeenCalled();
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

    // Success message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Request accepted successfully!/i)).toBeInTheDocument();
    });

    // Close success message
    const closeButton = screen.getByLabelText("Close");
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Success message should be hidden
    expect(screen.queryByText(/Request accepted successfully!/i)).not.toBeInTheDocument();
  });

  test("handles getUpcomingEvents with various date scenarios", async () => {
    const mixedEvents = [
      {
        request_id: "5",
        status: "accepted",
        events: {
          event_id: "5",
          name: "Past Event",
          start_time: "2020-01-01T10:00:00", // Past event
          venue: "Test Venue",
          planner_id: "test-planner-id",
        },
      },
      {
        request_id: "6",
        status: "accepted",
        events: {
          event_id: "6",
          name: "Future Event",
          start_time: "2030-01-01T10:00:00", // Future event
          venue: "Test Venue",
          planner_id: "test-planner-id",
        },
      },
      {
        request_id: "7",
        status: "accepted",
        events: {
          event_id: "7",
          name: "Event without date",
          start_time: null, // No date
          venue: "Test Venue",
          planner_id: "test-planner-id",
        },
      },
    ];

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mixedEvents),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Should only show future events
      expect(screen.getByText("Future Event")).toBeInTheDocument();
      expect(screen.queryByText("Past Event")).not.toBeInTheDocument();
      expect(screen.queryByText("Event without date")).not.toBeInTheDocument();
    });
  });

  // Additional test for time formatting edge cases
  test("handles time formatting with various formats", async () => {
    const eventsWithDifferentTimeFormats = [
      {
        request_id: "8",
        status: "accepted",
        events: {
          event_id: "8",
          name: "Event with proper time",
          start_time: "2025-12-01T14:30:00", // Full ISO string
          venue: "Test Venue",
          planner_id: "test-planner-id",
        },
      },
    ];

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(eventsWithDifferentTimeFormats),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Should handle the time formatting without warnings
      expect(screen.getByText("Event with proper time")).toBeInTheDocument();
    });
  });

  // Test for no session scenario
  test("handles no session gracefully", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={null} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Should render without crashing and show empty states
      expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
      expect(screen.getByText(/No pending requests at the moment/i)).toBeInTheDocument();
    });
  });
});