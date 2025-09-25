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
jest.mock("react-calendar", () => () => <div>Mock Calendar</div>);

// Mock Navbar
jest.mock("../components/Navbar", () => () => <div>Mock Navbar</div>);

// Mock ChatUI
jest.mock("../components/ChatUI", () => ({
  listTitle,
  vendors,
  onSendMessage,
  onSelectVendor,
  messages,
  unreadCount,
}) => (
  <div data-testid="chat-ui">Mock ChatUI - Title: {listTitle} - Unread: {unreadCount}</div>
));

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
  ];

  const mockPlannerData = {
    name: "Test Planner",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock supabase.auth.getUser and updateUser
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockSession.user } });
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

    // Mock supabase.from
    supabase.from.mockImplementation((table) => {
      console.log("supabase.from called with table:", table);
      return {
        select: jest.fn(() => {
          console.log("supabase.from().select called");
          return {
            eq: jest.fn(() => {
              console.log("supabase.from().select().eq called");
              return {
                single: jest.fn(() => {
                  console.log("supabase.from().select().eq().single called");
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
      console.log("supabase.channel called with:", channelName);
      return {
        on: jest.fn(() => {
          console.log("supabase.channel().on called");
          return {
            subscribe: jest.fn(() => {
              console.log("supabase.channel().on().subscribe called");
              return {
                unsubscribe: jest.fn(() => {
                  console.log("subscription.unsubscribe called");
                }),
              };
            }),
          };
        }),
      };
    });

    // Mock fetch
    global.fetch.mockImplementation((url) => {
      console.log("fetch called with URL:", url);
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequestsData),
        });
      }
      if (url.includes("/api/planners/test-planner-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlannerData),
        });
      }
      if (url.includes("/api/vendor-requests/1")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    // Mock console methods
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation((...args) => console.info(...args));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error.mockReset();
    console.log.mockReset();
  });

  test("renders loading state initially", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/vendor-requests/test-vendor-id")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: () => Promise.resolve(mockRequestsData) }), 100)
        );
      }
      if (url.includes("/api/planners/test-planner-id")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlannerData),
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

    expect(screen.getByText(/Loading your dashboard.../i)).toBeInTheDocument();
    expect(document.body.classList.contains("dashboard-loading")).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      console.log("Checking for Pending Requests in DOM:", screen.queryByText(/Pending Requests/i));
      expect(screen.getByText(/Pending Requests/i)).toBeInTheDocument();
      expect(document.body.classList.contains("dashboard-loading")).toBe(false);
    }, { timeout: 5000 });
  });

  test("fetches and displays vendor data", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Checking vendor name in DOM:", screen.queryByText(/Test Vendor/i));
      expect(screen.getByText(/Test Vendor/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("fetches and displays pending requests", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Checking pending request in DOM:", screen.queryByText("Test Event"));
      expect(screen.getByText("Test Event")).toBeInTheDocument();
      expect(screen.getByText("Accept")).toBeInTheDocument();
      expect(screen.getByText("Reject")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("fetches and displays accepted events", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Checking accepted event in DOM:", screen.queryByText("Accepted Event"));
      expect(screen.getByText("Accepted Event")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("handles accept request", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Checking pending request in DOM:", screen.queryByText("Test Event"));
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    }, { timeout: 5000 });

    const acceptButton = screen.getByText("Accept");

    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      console.log("Checking fetch call for accept request");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/vendor-requests/1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "accepted" }),
          headers: expect.any(Object),
        })
      );
    }, { timeout: 5000 });
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
      console.log("Checking pending request in DOM:", screen.queryByText("Test Event"));
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    }, { timeout: 5000 });

    const rejectButton = screen.getByText("Reject");

    await act(async () => {
      fireEvent.click(rejectButton);
    });

    await waitFor(() => {
      console.log("Checking fetch call for reject request");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/vendor-requests/1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "rejected" }),
          headers: expect.any(Object),
        })
      );
    }, { timeout: 5000 });
  });

  test("handles no session", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={null} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Checking for vendor name absence in DOM:", screen.queryByText(/Test Vendor/i));
      expect(screen.queryByText(/Test Vendor/i)).not.toBeInTheDocument();
      const pendingHeaders = screen.getAllByText(/Pending Requests/i);
      expect(pendingHeaders).toHaveLength(2); // Expect both h2 and p
      expect(pendingHeaders[0].tagName).toBe("H2"); // Verify h2 tag
    }, { timeout: 5000 });
  });

  test("renders ChatUI component", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VendorDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Checking ChatUI in DOM:", screen.queryByTestId("chat-ui"));
      expect(screen.getByTestId("chat-ui")).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});