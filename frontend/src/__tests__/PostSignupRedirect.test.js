import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PostSignupRedirect from "../pages/PostSignupRedirect";
import { supabase } from "../client";

// Silence console warnings
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

// Mock supabase
jest.mock("../client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

// Mock window.location
const originalLocation = window.location;

beforeAll(() => {
  delete window.location;
  window.location = {
    ...originalLocation,
    href: "",
    origin: "http://localhost:3000",
  };
});

afterAll(() => {
  window.location = originalLocation;
});

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe("PostSignupRedirect", () => {
  const mockNavigate = jest.fn();
  let selectMock, eqMock, singleMock, upsertMock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    window.location.href = "";

    const { useNavigate } = require("react-router-dom");
    useNavigate.mockReturnValue(mockNavigate);

    // Spy console
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Setup Supabase mock chain
    selectMock = jest.fn().mockReturnThis();
    eqMock = jest.fn().mockReturnThis();
    singleMock = jest.fn();
    upsertMock = jest.fn();

    supabase.from.mockImplementation(() => ({
      select: selectMock,
      eq: eqMock,
      single: singleMock,
      upsert: upsertMock,
    }));
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
  });

  test("redirects to /login if no session or user", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("inserts new user and redirects to /planner-form for planner role", async () => {
    // Mock the user check - user doesn't exist
    singleMock.mockResolvedValue({ data: null, error: null });
    // Mock successful user insertion
    upsertMock.mockResolvedValue({ error: null });
    
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { 
          user: { 
            id: "test-user-id", 
            user_metadata: { name: "Test User" },
            email: "test@example.com" 
          } 
        },
      },
    });
    
    mockSessionStorage.setItem("signupRole", "planner");

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(selectMock).toHaveBeenCalledWith("user_id");
      expect(eqMock).toHaveBeenCalledWith("user_id", "test-user-id");
      expect(singleMock).toHaveBeenCalled();
      expect(upsertMock).toHaveBeenCalledWith([
        {
          user_id: "test-user-id",
          name: "Test User",
          user_role: "planner",
          is_admin: false,
          created_at: expect.any(String),
        },
      ]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(window.location.href).toBe("http://localhost:3000/planner-form");
    }, { timeout: 3000 });
  });

  test("inserts new user and redirects to /vendor-form for vendor role", async () => {
    singleMock.mockResolvedValue({ data: null, error: null });
    upsertMock.mockResolvedValue({ error: null });
    
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { 
          user: { 
            id: "test-user-id", 
            user_metadata: { name: "Test User" } 
          } 
        },
      },
    });
    mockSessionStorage.setItem("signupRole", "vendor");

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost:3000/vendor-form");
    }, { timeout: 3000 });
  });

  test("redirects to / for unrecognized role", async () => {
    singleMock.mockResolvedValue({ data: null, error: null });
    upsertMock.mockResolvedValue({ error: null });
    
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { 
          user: { 
            id: "test-user-id", 
            user_metadata: { name: "Test User" } 
          } 
        },
      },
    });
    mockSessionStorage.setItem("signupRole", "unknown");

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost:3000/");
    }, { timeout: 3000 });
  });

  test("redirects to /dashboard if no role in sessionStorage", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { 
          user: { 
            id: "test-user-id", 
            user_metadata: { name: "Test User" } 
          } 
        },
      },
    });
    // No role set in sessionStorage

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      expect(supabase.from).not.toHaveBeenCalled();
      expect(mockSessionStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  test("does not insert user if already exists", async () => {
    // Mock that user already exists
    singleMock.mockResolvedValue({ 
      data: { user_id: "test-user-id" }, 
      error: null 
    });
    
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { 
          user: { 
            id: "test-user-id", 
            user_metadata: { name: "Test User" } 
          } 
        },
      },
    });
    mockSessionStorage.setItem("signupRole", "planner");

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(upsertMock).not.toHaveBeenCalled();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(window.location.href).toBe("http://localhost:3000/planner-form");
    }, { timeout: 3000 });
  });

  test("logs error if user insertion fails", async () => {
    singleMock.mockResolvedValue({ data: null, error: null });
    upsertMock.mockResolvedValue({ error: { message: "Insert failed" } });
    
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { 
          user: { 
            id: "test-user-id", 
            user_metadata: { name: "Test User" } 
          } 
        },
      },
    });
    mockSessionStorage.setItem("signupRole", "planner");

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith("Error inserting user:", "Insert failed");
      expect(window.location.href).toBe("http://localhost:3000/planner-form");
    }, { timeout: 3000 });
  });
});