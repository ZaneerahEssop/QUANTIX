import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlannerDashboard from "../pages/PlannerDashboard";
import { supabase } from "../client";
import chatService from "../services/chatService";

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

// Mock ChatUI
jest.mock("../components/ChatUI", () => ({
  __esModule: true,
  default: ({ onSendMessage, onSelectVendor, messages, unreadCount }) => (
    <div data-testid="chat-ui">Mock ChatUI - Unread: {unreadCount}</div>
  ),
}));

// Mock react-calendar
jest.mock("react-calendar", () => {
  return function MockCalendar({ onChange, value }) {
    return (
      <div data-testid="mock-calendar" onClick={() => onChange(new Date('2025-10-10'))}>
        Mock Calendar - Selected: {value?.toDateString()}
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
jest.setTimeout(20000);

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

  // Create events with FUTURE dates (important!)
  const mockEventsData = [
    {
      event_id: "1",
      name: "Test Event",
      start_time: "2025-12-01T14:00:00Z", // Future date
      venue: "Test Venue",
      location: "Test Location"
    },
    {
      event_id: "2", 
      name: "Another Event",
      start_time: "2025-11-15T10:00:00Z", // Future date
      venue: "Another Venue",
      location: "Another Location"
    }
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
      limit: jest.fn().mockResolvedValue({ data: [], error: null }), // handles test query
      order: jest.fn().mockResolvedValue({ data: mockTasksData, error: null }),
    }));


    mockInsert = jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        data: [{
          task_id: "2",
          id: "2",
          item: "New Task",
          completed: false,
          created_at: new Date().toISOString(),
        }],
        error: null,
      }),
    }));


    mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null 
      })
    });

    mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null 
      })
    });

    // Mock supabase.from to return our mock methods
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
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      };
    });

    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: mockSession.user },
      error: null 
    });

    // Mock fetch for API calls
    global.fetch.mockImplementation((url) => {
      console.log('Fetch called with URL:', url);
      
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
      
      // Default response for other endpoints
      return Promise.resolve({ 
        ok: false, 
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({}) 
      });
    });

    // Mock console methods
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
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  };

  test("renders loading state initially", async () => {
    // Create a delayed promise for ALL API calls to ensure loading state is visible
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
        json: () => Promise.resolve([]) 
      });
    });

    // Also delay the Supabase tasks call
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(tasksPromise)
      })
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

    // Also check for the spinner element
    const spinner = document.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();

    // Resolve all promises to continue
    await act(async () => {
      resolvePlannerPromise({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(mockPlannerData)
      });
      resolveEventsPromise({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(mockEventsData)
      });
      resolveTasksPromise({
        data: mockTasksData,
        error: null
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

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Test Planner/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("fetches and displays events", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    // Wait for the dashboard to fully load
    await waitForDashboardLoad();

    // Debug: Check what's actually rendered
    console.log('Screen content:', screen.debug());

    // Look for the event name - use more flexible query
    await waitFor(() => {
      const eventElement = screen.getByText((content, element) => {
        // Check if the element contains "Test Event" text
        return content.includes('Test Event') || 
               (element.textContent && element.textContent.includes('Test Event'));
      });
      expect(eventElement).toBeInTheDocument();
    }, { 
      timeout: 10000,
      onTimeout: () => {
        // If timeout, show what events are actually there
        const eventElements = screen.queryAllByText(/event/i);
        console.log('Event elements found:', eventElements.map(el => el.textContent));
      }
    });

    // Also check for venue text
    await waitFor(() => {
      expect(screen.getByText("Test Venue")).toBeInTheDocument();
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

    await waitForDashboardLoad();

    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test("adds a new task", async () => {
      // Render the dashboard
      await act(async () => {
        render(
          <MemoryRouter>
            <PlannerDashboard session={mockSession} />
          </MemoryRouter>
        );
      });

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
      });

      // Find input and button
      const taskInput = screen.getByPlaceholderText("Add a new task...");
      const addButton = screen.getByTestId("add-task-btn");

      // Type the new task
      fireEvent.change(taskInput, { target: { value: "New Task" } });

      // Click the Add button
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Wait for Supabase insert to be called
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([{
          planner_id: "test-user-id",
          item: "New Task",
          completed: false,
        }]);
      }, { timeout: 5000 });

      // Check that input was cleared
      expect(taskInput.value).toBe("");
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

      // Find the task completion button
      const taskText = screen.getByText("Test Task");
      const taskItem = taskText.closest('li');
      const buttons = taskItem.querySelectorAll('button');
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
        json: () => Promise.resolve({ error: "API Error" })
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

  // Add a debug test to see what's happening
  test("DEBUG: check events rendering", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    // Wait a bit longer for events to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    console.log('=== DEBUG SCREEN ===');
    screen.debug();

    // Check if events section exists
    const upcomingEventsSection = screen.getByText('Upcoming Events');
    expect(upcomingEventsSection).toBeInTheDocument();

    // Check what's in the events section
    const eventsContainer = upcomingEventsSection.closest('div');
    const eventsText = eventsContainer?.textContent;
    console.log('Events section content:', eventsText);

    // Check if our mock events data would be considered "upcoming"
    const now = new Date();
    mockEventsData.forEach(event => {
      const eventDate = new Date(event.start_time);
      console.log(`Event "${event.name}" is future:`, eventDate > now);
    });
  });
});