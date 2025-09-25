import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlannerDashboard from "../pages/PlannerDashboard";
import { supabase } from "../client";
import chatService from "../services/chatService";

// Mock supabase
jest.mock("../client", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
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
  getUnreadCount: jest.fn(() => Promise.resolve(0)),
  getOrCreateConversation: jest.fn(() => Promise.resolve({ conversation_id: "test-conv" })),
  joinConversation: jest.fn(),
  getConversationMessages: jest.fn(() => Promise.resolve([])),
  sendMessage: jest.fn(),
  sendMessageAPI: jest.fn(),
  markMessagesAsRead: jest.fn(),
}));

// Mock ChatUI
jest.mock("../components/ChatUI", () => ({
  __esModule: true,
  default: ({ onSendMessage, onSelectVendor, messages, unreadCount }) => (
    <div data-testid="chat-ui">Mock ChatUI - Unread: {unreadCount}</div>
  ),
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, "location", {
  value: { hostname: "localhost" },
  writable: true,
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

describe("PlannerDashboard Testing", () => {
  const mockSession = {
    user: {
      id: "test-user-id",
      email: "test@example.com",
    },
  };

  const mockPlannerData = {
    name: "Test Planner",
    profile_picture: "test-pic.jpg",
  };

  const mockEventsData = [
    {
      event_id: "1",
      name: "Test Event",
      start_time: "2025-10-01T14:00:00",
      venue: "Test Venue",
    },
  ];

  const mockTasksData = [
    {
      task_id: "1",
      item: "Test Task",
      completed: false,
      created_at: "2025-09-24T09:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    supabase.auth.getUser.mockResolvedValue({ data: { user: mockSession.user } });

    global.fetch.mockImplementation((url) => {
      console.log("Fetch called with URL:", url);
      if (url.includes("/api/planners/test-user-id")) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve(mockPlannerData),
        });
      }
      if (url.includes("/api/events?planner_id=test-user-id")) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve(mockEventsData),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    supabase.from.mockImplementation((table) => {
      console.log("Supabase table:", table);
      console.log("Supabase mock called for tasks with data:", mockTasksData);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({ data: table === "tasks" ? mockTasksData : [], error: null })
            ),
          })),
        })),
        insert: jest.fn(() =>
          Promise.resolve({ data: [{ task_id: "2", item: "New Task", completed: false }], error: null })
        ),
        update: jest.fn(() => Promise.resolve({ error: null })),
        delete: jest.fn(() => Promise.resolve({ error: null })),
      };
    });

    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation((...args) => console.info(...args));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error.mockRestore();
    console.log.mockRestore();
  });

  test("renders loading state initially", async () => {
    global.fetch.mockImplementationOnce((url) => {
      if (url.includes("/api/planners/test-user-id")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, headers: { get: () => "application/json" }, json: () => Promise.resolve(mockPlannerData) }), 100)
        );
      }
      return Promise.resolve({ ok: true, headers: { get: () => "application/json" }, json: () => Promise.resolve([]) });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/My To-Do List/i)).toBeInTheDocument();
    expect(document.body.classList.contains("dashboard-loading")).toBe(true);
  });

  test("fetches and displays user data", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Checking user data in DOM:", screen.debug());
      expect(screen.getByText(/Welcome back, Test Planner/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("fetches and displays events", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Events in DOM:", screen.queryByText("Test Event"));
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("fetches and displays tasks", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Tasks in DOM:", screen.queryByText("Test Task"));
      console.log("Full DOM for tasks:", screen.debug());
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("adds a new task", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/My To-Do List/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    const input = screen.getByPlaceholderText("Add a new task...");
    const addButton = screen.getByRole("button", { name: /Add$/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "New Task" } });
      console.log("Input value set to:", input.value);
      fireEvent.click(addButton);
      console.log("Add button clicked");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      console.log("New task in DOM:", screen.queryByText("New Task"));
      console.log("Full DOM:", screen.debug());
      expect(screen.getByText("New Task")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("toggles task completion", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Tasks in DOM for toggle:", screen.queryByText("Test Task"));
      console.log("Toggle button:", screen.queryByTestId("toggle-task-1"));
      console.log("Full DOM:", screen.debug());
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    }, { timeout: 5000 });

    const toggleButton = screen.getByTestId("toggle-task-1");

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(toggleButton).toHaveStyle({ backgroundColor: "#4caf50" });
    }, { timeout: 5000 });
  });

  test("deletes a task", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("Tasks in DOM for delete:", screen.queryByText("Test Task"));
      console.log("Delete button:", screen.queryByTestId("delete-task-1"));
      console.log("Full DOM:", screen.debug());
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    }, { timeout: 5000 });

    const deleteButton = screen.getByTestId("delete-task-1");

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(screen.queryByText("Test Task")).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("handles no session", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={null} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/My To-Do List/i)).toBeInTheDocument();
      expect(screen.queryByText(/Welcome back, Test Planner/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("renders ChatUI component", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      console.log("ChatUI in DOM:", screen.queryByTestId("chat-ui"));
      expect(screen.getByTestId("chat-ui")).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});