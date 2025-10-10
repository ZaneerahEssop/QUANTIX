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

// Mock global fetch
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, "location", {
  value: { hostname: "localhost" },
  writable: true,
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

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
      id: "1",
      item: "Test Task",
      completed: false,
      created_at: "2025-09-24T09:00:00Z",
    },
  ];

  let mockInsert;
  let mockUpdate;
  let mockDelete;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    // Create individual mock functions
    mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [{ 
          task_id: "2", 
          id: "2",
          item: "New Task", 
          completed: false,
          created_at: new Date().toISOString()
        }], 
        error: null 
      })
    });

    mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [{ ...mockTasksData[0], completed: true }], 
        error: null 
      })
    });

    mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [], 
        error: null 
      })
    });

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockTasksData,
          error: null
        })
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

    supabase.auth.getUser.mockResolvedValue({ data: { user: mockSession.user } });

    // Mock fetch for API calls
    global.fetch.mockImplementation((url) => {
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

    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
  });

  // Helper function to wait for dashboard to load
  const waitForDashboardLoad = async () => {
    await waitFor(() => {
      expect(screen.getByText(/My To-Do List/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  };

  test("renders loading state initially", async () => {
    global.fetch.mockImplementationOnce((url) => {
      if (url.includes("/api/planners/test-user-id")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ 
            ok: true, 
            headers: { get: () => "application/json" }, 
            json: () => Promise.resolve(mockPlannerData) 
          }), 100)
        );
      }
      return Promise.resolve({ 
        ok: true, 
        headers: { get: () => "application/json" }, 
        json: () => Promise.resolve([]) 
      });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

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

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test.skip("adds a new task - debug version", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PlannerDashboard session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitForDashboardLoad();

    // Debug: Let's see what's actually in the DOM
    console.log("=== DEBUG: Checking DOM ===");
    
    // Check all forms
    const forms = screen.queryAllByRole('form');
    console.log("Forms found:", forms.length);
    forms.forEach((form, i) => {
      console.log(`Form ${i}:`, form.innerHTML);
    });

    // Check all inputs
    const inputs = screen.queryAllByRole('textbox');
    console.log("Inputs found:", inputs.length);
    inputs.forEach((input, i) => {
      console.log(`Input ${i}:`, {
        placeholder: input.placeholder,
        value: input.value,
        type: input.type
      });
    });

    // Check all buttons
    const buttons = screen.queryAllByRole('button');
    console.log("Buttons found:", buttons.length);
    buttons.forEach((button, i) => {
      console.log(`Button ${i}:`, {
        text: button.textContent,
        type: button.type
      });
    });

    // Find the task input specifically
    const taskInput = screen.getByPlaceholderText("Add a new task...");
    expect(taskInput).toBeInTheDocument();

    // Find the add button - look for button with text "Add"
    const addButtons = buttons.filter(button => 
      button.textContent?.trim() === 'Add' || 
      button.textContent?.includes('Add')
    );
    
    expect(addButtons.length).toBeGreaterThan(0);
    const addButton = addButtons[0];

    // Fill the input
    await act(async () => {
      fireEvent.change(taskInput, { target: { value: "New Task" } });
    });

    // Verify input value was set
    expect(taskInput.value).toBe("New Task");

    // Submit the form
    await act(async () => {
      // Try to find the form that contains the input
      const form = taskInput.closest('form');
      if (form) {
        console.log("Submitting form directly");
        fireEvent.submit(form);
      } else {
        console.log("No form found, clicking button directly");
        fireEvent.click(addButton);
      }
    });

    // Wait for any async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    // Debug: Check if mock was called
    console.log("Mock insert call count:", mockInsert.mock.calls.length);
    console.log("Mock insert calls:", mockInsert.mock.calls);

    // Check if Supabase insert was called
    expect(mockInsert).toHaveBeenCalled();
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

    // Find the task
    const taskText = screen.getByText("Test Task");
    expect(taskText).toBeInTheDocument();

    // Find the toggle button (first button in the task item)
    const taskItem = taskText.closest('li');
    const buttons = taskItem.querySelectorAll('button');
    const toggleButton = buttons[0];
    
    expect(toggleButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Check if Supabase update was called
    expect(mockUpdate).toHaveBeenCalled();
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

    // Find the task
    const taskText = screen.getByText("Test Task");
    expect(taskText).toBeInTheDocument();

    // Find the delete button (last button in the task item)
    const taskItem = taskText.closest('li');
    const buttons = taskItem.querySelectorAll('button');
    const deleteButton = buttons[buttons.length - 1];
    
    expect(deleteButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Check if Supabase delete was called
    expect(mockDelete).toHaveBeenCalled();
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
});