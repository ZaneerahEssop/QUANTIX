import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PostSignupRedirect from "../pages/PostSignupRedirect";
import { supabase } from "../client";

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

// Mock window.location.href
const mockLocationAssign = jest.fn();
Object.defineProperty(window, "location", {
  value: {
    href: "",
    origin: "http://localhost:3000",
  },
  writable: true,
});
Object.defineProperty(window.location, "assign", {
  value: mockLocationAssign,
  writable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  store: {},
  getItem: jest.fn((key) => mockSessionStorage.store[key] || null),
  setItem: jest.fn((key, value) => (mockSessionStorage.store[key] = value)),
  removeItem: jest.fn((key) => delete mockSessionStorage.store[key]),
  clear: jest.fn(() => (mockSessionStorage.store = {})),
};
Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

describe("PostSignupRedirect", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    jest.useFakeTimers();
    const { useNavigate } = require("react-router-dom");
    useNavigate.mockReturnValue(mockNavigate);
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation((...args) => console.info(...args));

    // Updated supabase mock
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
                  return { data: null };
                }),
              };
            }),
          };
        }),
        upsert: jest.fn(() => {
          console.log("supabase.from().upsert called");
          return { error: null };
        }),
      };
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error.mockRestore();
    console.log.mockRestore();
  });

  test("redirects to /login if no session or user", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(
      <MemoryRouter>
        <PostSignupRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      console.log("Checking navigate to /login");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    }, { timeout: 5000 });

    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  test("inserts new user and redirects to /planner-form for planner role", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            user_metadata: { name: "Test User" },
          },
        },
      },
    });
    mockSessionStorage.setItem("signupRole", "planner");

    render(
      <MemoryRouter>
        <PostSignupRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      console.log("Checking supabase calls for planner role");
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(supabase.from().select).toHaveBeenCalled();
      expect(supabase.from().upsert).toHaveBeenCalledWith([
        {
          user_id: "test-user-id",
          name: "Test User",
          user_role: "planner",
          is_admin: false,
          created_at: expect.any(String),
        },
      ]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(mockLocationAssign).toHaveBeenCalledWith("http://localhost:3000/planner-form");
    }, { timeout: 10000 });
  });

  test("inserts new user and redirects to /vendor-form for vendor role", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            user_metadata: { name: "Test User" },
          },
        },
      },
    });
    mockSessionStorage.setItem("signupRole", "vendor");

    render(
      <MemoryRouter>
        <PostSignupRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      console.log("Checking supabase calls for vendor role");
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(supabase.from().select).toHaveBeenCalled();
      expect(supabase.from().upsert).toHaveBeenCalledWith([
        {
          user_id: "test-user-id",
          name: "Test User",
          user_role: "vendor",
          is_admin: false,
          created_at: expect.any(String),
        },
      ]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(mockLocationAssign).toHaveBeenCalledWith("http://localhost:3000/vendor-form");
    }, { timeout: 10000 });
  });

  test("redirects to / for unrecognized role", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            user_metadata: { name: "Test User" },
          },
        },
      },
    });
    mockSessionStorage.setItem("signupRole", "unknown");

    render(
      <MemoryRouter>
        <PostSignupRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      console.log("Checking supabase calls for unrecognized role");
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(supabase.from().select).toHaveBeenCalled();
      expect(supabase.from().upsert).toHaveBeenCalledWith([
        {
          user_id: "test-user-id",
          name: "Test User",
          user_role: "unknown",
          is_admin: false,
          created_at: expect.any(String),
        },
      ]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(mockLocationAssign).toHaveBeenCalledWith("http://localhost:3000/");
    }, { timeout: 10000 });
  });

  test("redirects to /dashboard if no role in sessionStorage", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            user_metadata: { name: "Test User" },
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <PostSignupRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      console.log("Checking navigate to /dashboard");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      expect(supabase.from).not.toHaveBeenCalled();
      expect(mockSessionStorage.removeItem).not.toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  test("does not insert user if already exists", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            user_metadata: { name: "Test User" },
          },
        },
      },
    });
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
                  return { data: { user_id: "test-user-id" } };
                }),
              };
            }),
          };
        }),
        upsert: jest.fn(() => {
          console.log("supabase.from().upsert called");
          return { error: null };
        }),
      };
    });
    mockSessionStorage.setItem("signupRole", "planner");

    render(
      <MemoryRouter>
        <PostSignupRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      console.log("Checking supabase calls for existing user");
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(supabase.from().select).toHaveBeenCalled();
      expect(supabase.from().upsert).not.toHaveBeenCalled();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(mockLocationAssign).toHaveBeenCalledWith("http://localhost:3000/planner-form");
    }, { timeout: 10000 });
  });

  test("logs error if user insertion fails", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            user_metadata: { name: "Test User" },
          },
        },
      },
    });
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
                  return { data: null };
                }),
              };
            }),
          };
        }),
        upsert: jest.fn(() => {
          console.log("supabase.from().upsert called");
          return { error: { message: "Insert failed" } };
        }),
      };
    });
    mockSessionStorage.setItem("signupRole", "planner");

    render(
      <MemoryRouter>
        <PostSignupRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      console.log("Checking supabase calls for insertion error");
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(supabase.from().select).toHaveBeenCalled();
      expect(supabase.from().upsert).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("Error inserting user:", "Insert failed");
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("signupRole");
      expect(mockLocationAssign).toHaveBeenCalledWith("http://localhost:3000/planner-form");
    }, { timeout: 10000 });
  });
});