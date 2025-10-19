import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SignUpPage from "../pages/SignUpPage";
import { MemoryRouter } from "react-router-dom";
import { supabase } from '../client'; // This import will now get the mock

//to silence the console warnings: 
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore()); 

// Mock useNavigate
const mockedNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
  Link: ({ children }) => <span>{children}</span>,
}));

jest.mock('react-icons/fa', () => ({
  FaArrowLeft: () => <i data-testid="fa-arrow-left-icon" />,
}));

jest.mock('../client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

// Mock window.location.origin
const originalLocation = window.location;
beforeAll(() => {
  delete window.location;
  window.location = {
    ...originalLocation,
    origin: 'http://localhost:3000',
    search: '', // Add search property
  };
});
afterAll(() => {
  window.location = originalLocation;
});


describe("SignUpPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.location.search
    window.location.search = '';
  });

  test("renders headings, role cards, and sign-up button", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    // Check main heading
    expect(
      screen.getByRole("heading", { name: /Event-ually Perfect/i })
    ).toBeInTheDocument();

    // Check role cards
    expect(screen.getByRole("heading", { name: "Event Planner" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vendor" })).toBeInTheDocument();

    // Check sign-up button
    expect(screen.getByRole("button", { name: /Sign Up with Google/i })).toBeInTheDocument();

    // Check login link text
    expect(screen.getByText(/Login here/i)).toBeInTheDocument();
  });

  test("shows warning if trying to sign up without selecting a role", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /Sign Up with Google/i });
    fireEvent.click(button);

    // Warning should appear
    expect(screen.getByText(/Please select a role first!/i)).toBeInTheDocument();
  });

  test("selecting a role allows sign-up", async () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const plannerCard = screen.getByRole("heading", { name: "Event Planner" }).closest("div");
    const button = screen.getByRole("button", { name: /Sign Up with Google/i });

    // Select role
    fireEvent.click(plannerCard);

    // Click sign-up button
    fireEvent.click(button);

    // Expect Supabase OAuth to be called
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/loading',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  });

  test("stores selected role in sessionStorage before OAuth", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const vendorCard = screen.getByRole("heading", { name: "Vendor" }).closest("div");
    const button = screen.getByRole("button", { name: /Sign Up with Google/i });

    fireEvent.click(vendorCard);
    fireEvent.click(button);

    expect(sessionStorage.getItem("signupRole")).toBe("vendor");
  });

  test("handles error from Supabase OAuth gracefully", async () => {
    supabase.auth.signInWithOAuth.mockRejectedValueOnce(new Error("OAuth failed"));

    // Mock console.error to check for error logging
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const plannerCard = screen.getByRole("heading", { name: "Event Planner" }).closest("div");
    const button = screen.getByRole("button", { name: /Sign Up with Google/i });

    fireEvent.click(plannerCard);
    await act(async () => {
      fireEvent.click(button);
    });

    //No crash 
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error with Google sign-up:', 'OAuth failed');
    
    consoleErrorSpy.mockRestore();     // Check that the error was logged
  });

});


describe("Component & integratrion tests(more)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    window.location.search = '';
  });

  test("handles back to landing navigation", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const backButton = screen.getByText(/Back to Home/i);
    fireEvent.click(backButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/');
  });

  test("shows role conflict modal when URL has conflict parameters", () => {
    // Mock URL with conflict parameters
    window.location.search = '?conflict=1&existingRole=vendor&intendedRole=planner';
    
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Role Conflict/i)).toBeInTheDocument();
    expect(screen.getByText(/This email is already registered as a vendor. To sign up as a planner, please use a different email./i)).toBeInTheDocument();
    expect(screen.getByText(/Tip: Use a different Google account or create a new email for your second role./i)).toBeInTheDocument();
  });

  test("closes role conflict modal when clicking close button", () => {
    window.location.search = '?conflict=1&existingRole=vendor&intendedRole=planner';
    
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(screen.queryByText(/Role Conflict/i)).not.toBeInTheDocument();
  });

  test("closes role conflict modal when clicking okay button", () => {
    window.location.search = '?conflict=1&existingRole=vendor&intendedRole=planner';
    
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const okayButton = screen.getByText(/Okay, got it/i);
    fireEvent.click(okayButton);

    expect(screen.queryByText(/Role Conflict/i)).not.toBeInTheDocument();
  });

  test("closes role conflict modal when clicking outside", () => {
    window.location.search = '?conflict=1&existingRole=vendor&intendedRole=planner';
    
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const modalOverlay = screen.getByText(/Role Conflict/i).closest('.role-warning-modal');
    fireEvent.click(modalOverlay);

    expect(screen.queryByText(/Role Conflict/i)).not.toBeInTheDocument();
  });

  test("closes role warning modal when clicking close", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    // Trigger role warning
    const signUpButton = screen.getByRole("button", { name: /Sign Up with Google/i });
    fireEvent.click(signUpButton);

    // Close the warning
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(screen.queryByText(/Please select a role first!/i)).not.toBeInTheDocument();
  });

  test("toggles role selection correctly", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    const plannerCard = screen.getByRole("heading", { name: "Event Planner" }).closest("div");
    const vendorCard = screen.getByRole("heading", { name: "Vendor" }).closest("div");

    // Select planner
    fireEvent.click(plannerCard);
    expect(plannerCard).toHaveClass('selected');
    expect(vendorCard).not.toHaveClass('selected');

    // Switch to vendor
    fireEvent.click(vendorCard);
    expect(vendorCard).toHaveClass('selected');
    expect(plannerCard).not.toHaveClass('selected');
  });

  test("clears sessionStorage signupRole after successful role selection and navigation", async () => {
    // Mock a session to trigger the navigation effect
    const mockSession = { user: { id: '123' } };
    
    // Mock the environment to not be test so the effect runs
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    // Mock supabase auth methods
    supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: mockSession } });
    supabase.auth.onAuthStateChange = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });

    // Set a role in sessionStorage to simulate coming from OAuth
    sessionStorage.setItem('signupRole', 'planner');

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    // Wait for effects to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should navigate and clear sessionStorage
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(sessionStorage.getItem('signupRole')).toBeNull();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("navigates vendor to pending-approval page", async () => {
    const mockSession = { user: { id: '123' } };
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: mockSession } });
    supabase.auth.onAuthStateChange = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });

    sessionStorage.setItem('signupRole', 'vendor');

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockedNavigate).toHaveBeenCalledWith('/pending-approval', { replace: true });
    expect(sessionStorage.getItem('signupRole')).toBeNull();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test("handles empty session state correctly", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should not navigate when there's no session
    expect(mockedNavigate).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test("unsubscribes from auth state change on unmount", async () => {
    const unsubscribeMock = jest.fn();
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    supabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } }
    });

    const { unmount } = render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test("does not call Supabase auth methods in test environment", async () => {
    expect(process.env.NODE_ENV).toBe('test');

    const getSessionSpy = jest.spyOn(supabase.auth, 'getSession');
    const onAuthStateChangeSpy = jest.spyOn(supabase.auth, 'onAuthStateChange');

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should not call Supabase methods in test environment
    expect(getSessionSpy).not.toHaveBeenCalled();
    expect(onAuthStateChangeSpy).not.toHaveBeenCalled();

    getSessionSpy.mockRestore();
    onAuthStateChangeSpy.mockRestore();
  });

  test("handles OAuth with correct parameters for both roles", async () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    // Test planner role
    const plannerCard = screen.getByRole("heading", { name: "Event Planner" }).closest("div");
    fireEvent.click(plannerCard);
    
    const signUpButton = screen.getByRole("button", { name: /Sign Up with Google/i });
    await act(async () => {
      fireEvent.click(signUpButton);
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/loading',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    expect(sessionStorage.getItem('signupRole')).toBe('planner');

    // Clear mocks and test vendor role
    jest.clearAllMocks();
    sessionStorage.clear();

    const vendorCard = screen.getByRole("heading", { name: "Vendor" }).closest("div");
    fireEvent.click(vendorCard);
    
    await act(async () => {
      fireEvent.click(signUpButton);
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/loading',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    expect(sessionStorage.getItem('signupRole')).toBe('vendor');
  });

  test("renders all UI elements correctly", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    // Check all headings and text content
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    expect(screen.getByText(/Select your role to get started with a tailored experience./i)).toBeInTheDocument();
    expect(screen.getByText(/Organize events, find vendors, and manage your projects all in one place./i)).toBeInTheDocument();
    expect(screen.getByText(/Showcase your services, connect with planners, and grow your business./i)).toBeInTheDocument();
    expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument();
    
    // Check icons are rendered
    expect(screen.getByTestId('fa-arrow-left-icon')).toBeInTheDocument();
    expect(screen.getByText('🗒️')).toBeInTheDocument(); // Planner icon
    expect(screen.getByText('🏪')).toBeInTheDocument(); // Vendor icon
  });
});