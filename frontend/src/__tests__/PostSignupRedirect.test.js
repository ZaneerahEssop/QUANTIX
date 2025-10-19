import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PostSignupRedirect from "../pages/PostSignupRedirect";
import { supabase } from "../client";

// Mock supabase with proper method chain
jest.mock("../client", () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(),
      })),
    })),
    upsert: jest.fn(),
  }));

  return {
    supabase: {
      auth: {
        getSession: jest.fn(),
        signOut: jest.fn(),
      },
      from: mockFrom,
    },
  };
});

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock window.location
const mockLocation = {
  href: "",
  origin: "http://localhost:3000",
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  store: {},
  getItem: jest.fn((key) => mockSessionStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockSessionStorage.store[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete mockSessionStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockSessionStorage.store = {};
  }),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe("PostSignupRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    window.location.href = "";

    // Spy console
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
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
    // Setup mock chain for this specific test
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }));

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
    
    mockSessionStorage.store["signupRole"] = "planner";

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(maybeSingleMock).toHaveBeenCalled();
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
    });
  });

  test("inserts new user and redirects to /vendor-form for vendor role", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }));

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
    mockSessionStorage.store["signupRole"] = "vendor";

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost:3000/vendor-form");
    });
  });

  test("redirects to / for unrecognized role", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }));

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
    mockSessionStorage.store["signupRole"] = "unknown";

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost:3000/");
    });
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
    const maybeSingleMock = jest.fn().mockResolvedValue({ 
      data: { 
        user_id: "test-user-id",
        user_role: "planner" 
      }, 
      error: null 
    });
    const upsertMock = jest.fn();
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }));

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
    mockSessionStorage.store["signupRole"] = "planner";

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
    });
  });

  test("logs error if user insertion fails", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const upsertMock = jest.fn().mockResolvedValue({ error: { message: "Insert failed" } });
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }));

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
    mockSessionStorage.store["signupRole"] = "planner";

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
    });
  });

  test("handles role conflict by redirecting to signup with params", async () => {
    // Mock that user exists with different role
    const maybeSingleMock = jest.fn().mockResolvedValue({ 
      data: { 
        user_id: "test-user-id",
        user_role: "vendor" // Existing role is vendor
      }, 
      error: null 
    });
    const upsertMock = jest.fn();
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }));

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
    mockSessionStorage.store["signupRole"] = "planner"; // Intended role is planner

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        "/signup?conflict=1&existingRole=vendor&intendedRole=planner",
        { replace: true }
      );
    });
  });


  test("renders loading state", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }));

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
    mockSessionStorage.store["signupRole"] = "planner";

    await act(async () => {
      render(
        <MemoryRouter>
          <PostSignupRedirect />
        </MemoryRouter>
      );
    });

    // Loading state should be visible initially
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    
    // Wait for the redirect to complete
    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost:3000/planner-form");
    });
  });


});