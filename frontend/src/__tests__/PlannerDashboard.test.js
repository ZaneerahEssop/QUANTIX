import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlannerDashboard from "../pages/PlannerDashboard";
import { supabase } from "../client";
import chatService from "../services/chatService";

// Mock canvas-confetti
jest.mock('canvas-confetti', () => jest.fn());

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

// Mock supabase
jest.mock("../client", () => {
  const mockFrom = jest.fn();
  return {
    supabase: {
      auth: {
        getUser: jest.fn(),
      },
      from: mockFrom,
    },
  };
});

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

// Mock ChatUI with proper prop handling
jest.mock("../components/ChatUI", () => ({
  __esModule: true,
  default: ({ onSendMessage, onSelectVendor, messages, unreadCount }) => (
    <div data-testid="chat-ui">
      Mock ChatUI - Unread: {unreadCount}
      <button onClick={() => onSelectVendor && onSelectVendor({ id: "vendor1", name: "Vendor 1" })}>
        Select Vendor
      </button>
      <button onClick={() => onSendMessage && onSendMessage({ text: "Hello Vendor" })}>
        Send Message
      </button>
    </div>
  ),
}));

// Mock react-calendar with enhanced tileContent support
jest.mock("react-calendar", () => {
  return function MockCalendar({ onChange, value, tileContent }) {
    const date = new Date("2025-10-10");
    const tileDate = new Date("2025-10-10");
    return (
      <div data-testid="mock-calendar">
        Mock Calendar - Selected: {value?.toDateString() || "No date selected"}
        <div
          data-testid="calendar-tile-2025-10-10"
          onClick={() => onChange && onChange(date)}
        >
          {tileContent && tileContent({ date: tileDate })}
        </div>
      </div>
    );
  };
});

// Mock global fetch
global.fetch = jest.fn();

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock environment variable
process.env.REACT_APP_API_URL = "http://localhost:3001";

// Increase timeout for all tests
jest.setTimeout(30000);

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
      start_time: "2025-12-01T14:00:00Z",
      venue: "Test Venue",
      location: "Test Location",
    },
    {
      event_id: "2",
      name: "Another Event",
      start_time: "2025-11-15T10:00:00Z",
      venue: "Another Venue",
      location: "Another Location",
    },
    {
      event_id: "3",
      name: "Calendar Event",
      start_time: "2025-10-10T14:00:00Z",
      venue: "Calendar Venue",
      location: "Calendar Location",
    },
  ];

  const mockTasksData = [
    {
      task_id: "1",
      id: "1",
      item: "Test Task",
      completed: false,
      created_at: "2025-09-24T09:00:00Z",
    },
  ];

  let mockInsert;
  let mockUpdate;
  let mockDelete;
  let mockSelect;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockSelect = jest.fn(() => ({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: mockTasksData, error: null }),
      }),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      order: jest.fn().mockResolvedValue({ data: mockTasksData, error: null }),
    }));

    mockInsert = jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        data: [
          {
            task_id: "2",
            id: "2",
            item: "New Task",
            completed: false,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      }),
    }));

    mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });

    mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });

    supabase.from.mockImplementation((table) => {
      if (table === "tasks") {
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockSession.user },
      error: null,
    });

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
      return Promise.resolve({
        ok: false,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({}),
      });
    });

    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
    console.warn.mockRestore();
  });

  // Helper function to wait for dashboard to load completely
  const waitForDashboardLoad = async () => {
    await waitFor(() => {
      const welcomeElements = screen.getAllByText(/Welcome back/i);
      expect(welcomeElements[0]).toBeInTheDocument();
    }, { timeout: 10000 });
  };

  test("renders loading state initially", async () => {
    let resolvePlannerPromise;
    let resolveEventsPromise;
    let resolveTasksPromise;

    const plannerPromise = new Promise((resolve) => {
      resolvePlannerPromise = resolve;
    });
    const eventsPromise = new Promise((resolve) => {
      resolveEventsPromise = resolve;
    });
    const tasksPromise = new Promise((resolve) => {
      resolveTasksPromise = resolve;
    });

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/planners/test-user-id")) {
        return plannerPromise;
      }
      if (url.includes("/api/events")) {
        return eventsPromise;
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([]),
      });
    });

    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(tasksPromise),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    const loadingTexts = screen.getAllByText(/Loading your dashboard/i);
    expect(loadingTexts.length).toBeGreaterThan(0);

    const spinner = document.querySelector(".spinner");
    expect(spinner).toBeInTheDocument();

    await act(async () => {
      resolvePlannerPromise({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(mockPlannerData),
      });
      resolveEventsPromise({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(mockEventsData),
      });
      resolveTasksPromise({
        data: mockTasksData,
        error: null,
      });
    });
  });

  test("fetches and displays user data", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();
    expect(screen.getByText(/Welcome back, Test Planner/i)).toBeInTheDocument();
  });

  test("fetches and displays events", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
      expect(screen.getByText("Test Venue")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("fetches and displays tasks", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("adds a new task", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    const taskInput = screen.getByPlaceholderText("Add a new task...");
    const addButton = screen.getByTestId("add-task-btn");

    fireEvent.change(taskInput, { target: { value: "New Task" } });
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith([
        {
          planner_id: "test-user-id",
          item: "New Task",
          completed: false,
        },
      ]);
      expect(taskInput.value).toBe("");
    }, { timeout: 5000 });
  });

  test("toggles task completion", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    const taskText = screen.getByText("Test Task");
    const taskItem = taskText.closest("li");
    const buttons = taskItem.querySelectorAll("button");
    const toggleButton = buttons[0];

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
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

    await waitForDashboardLoad();

    const deleteButton = screen.getByTestId("delete-task-1");

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDelete().eq).toHaveBeenCalledWith("task_id", "1");
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
    }, { timeout: 10000 });
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
      expect(screen.getByTestId("chat-ui")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("handles API errors gracefully", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ error: "API Error" }),
      })
    );

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/My To-Do List/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("displays and interacts with ConfirmationModal for event deletion", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    const eventElement = screen.getByText("Test Event");
    const eventContainer = eventElement.closest("div");
    const deleteButton = within(eventContainer).getByTitle("Delete Event");

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to delete "Test Event"/i)
      ).toBeInTheDocument();
    });

    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({}),
      })
    );

    const deleteConfirmButton = screen.getByText("Delete Event");
    await act(async () => {
      fireEvent.click(deleteConfirmButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Event deleted successfully!")).toBeInTheDocument();
    });

    const okButton = screen.getByText("OK");
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Event deleted successfully!")
      ).not.toBeInTheDocument();
    });
  });

  test("cancels event deletion in ConfirmationModal", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    const eventElement = screen.getByText("Test Event");
    const eventContainer = eventElement.closest("div");
    const deleteButton = within(eventContainer).getByTitle("Delete Event");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to delete "Test Event"/i)
      ).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to delete "Test Event"/i)
      ).not.toBeInTheDocument();
    });
  });

  test("handles event deletion API error", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ error: "Failed to delete event" }),
      })
    );

    const eventElement = screen.getByText("Test Event");
    const eventContainer = eventElement.closest("div");
    const deleteButton = within(eventContainer).getByTitle("Delete Event");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    const deleteConfirmButton = screen.getByText("Delete Event");
    await act(async () => {
      fireEvent.click(deleteConfirmButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Error deleting event: Failed to delete event/i)
      ).toBeInTheDocument();
    });
  });

  test("navigates to add event page when clicking Add Event button", async () => {
    const mockNavigate = jest.fn();
    const { useNavigate } = require("react-router-dom");
    useNavigate.mockReturnValue(mockNavigate);

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    const addEventButton = screen.getByText(/Add Event/i);
    await act(async () => {
      fireEvent.click(addEventButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/add-event");
  });

  test("displays profile picture modal and closes it", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    const profilePic = screen.getByAltText("Profile");
    await act(async () => {
      fireEvent.click(profilePic.parentElement);
    });

    await waitFor(() => {
      expect(screen.getByAltText("Profile Preview")).toBeInTheDocument();
    });

    const closeButton = screen.getByText("✕");
    await act(async () => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByAltText("Profile Preview")).not.toBeInTheDocument();
    });
  });

  test("handles past events display", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events")) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve([
              {
                event_id: "4",
                name: "Past Event",
                start_time: "2025-01-01T14:00:00Z",
                venue: "Past Venue",
                location: "Past Location",
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(mockPlannerData),
      });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    await waitFor(() => {
      expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("handles empty events state", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/events")) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(mockPlannerData),
      });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    expect(
      screen.getByText("No upcoming events. Add one to get started!")
    ).toBeInTheDocument();
  });

  test("handles chat message sending", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    jest.spyOn(chatService, "getOrCreateConversation").mockResolvedValueOnce({
      conversation_id: "test-conv",
    });

    const selectVendorButton = screen.getByText("Select Vendor");
    await act(async () => {
      fireEvent.click(selectVendorButton);
    });

    const sendMessageButton = screen.getByText("Send Message");
    await act(async () => {
      fireEvent.click(sendMessageButton);
    });

    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalledWith(
        "test-conv",
        "test-user-id",
        "Hello Vendor",
        "text"
      );
      expect(chatService.sendMessageAPI).toHaveBeenCalledWith(
        "test-conv",
        "test-user-id",
        "Hello Vendor",
        "text"
      );
    });
  });

  test("handles non-JSON API response", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "text/html" },
        json: () => Promise.resolve("<html>Error</html>"),
      })
    );

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/My To-Do List/i)).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything()
      );
    });
  });

  test("displays no tasks message when task list is empty", async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    expect(
      screen.getByText("No tasks yet. Add one above!")
    ).toBeInTheDocument();
  });

  test("handles task addition failure", async () => {
    mockInsert.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    const taskInput = screen.getByPlaceholderText("Add a new task...");
    const addButton = screen.getByTestId("add-task-btn");

    fireEvent.change(taskInput, { target: { value: "New Task" } });
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "Error adding task:",
        expect.objectContaining({ message: "Insert failed" })
      );
    });
  });

  test("DEBUG: check events rendering", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    console.log("=== DEBUG SCREEN ===");
    screen.debug();

    const upcomingEventsSection = screen.getByText("Upcoming Events");
    expect(upcomingEventsSection).toBeInTheDocument();

    const eventsContainer = upcomingEventsSection.closest("div");
    const eventsText = eventsContainer?.textContent;
    console.log("Events section content:", eventsText);

    const now = new Date();
    mockEventsData.forEach((event) => {
      const eventDate = new Date(event.start_time);
      console.log(`Event "${event.name}" is future:`, eventDate > now);
    });
  });
});