import React from "react";
import { render, screen, fireEvent,act } from "@testing-library/react";
import SignUpPage from "../pages/SignUpPage";
import { MemoryRouter } from "react-router-dom";
import {supabase} from '../client';

//to silence the console warnings: 
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore()); 

// Mock useNavigate
const mockedNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
  Link: ({ children }) => <span>{children}</span>, //fixing render Link as span to fix <p> nesting error
}));

describe("SignUpPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const { supabase } = require("../client");
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
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
  });
});
