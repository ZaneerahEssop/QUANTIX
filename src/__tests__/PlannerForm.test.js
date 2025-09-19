import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlannerForm from "../pages/PlannerForm";
import { MemoryRouter } from "react-router-dom";
import { supabase } from '../client';

//to silence the console warnings: 
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

// Mock useNavigate
const mockedNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
}));

describe("PlannerForm Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the planner form with inputs and button", () => {
    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Profile/i })).toBeInTheDocument();
  });

  test("shows warning for invalid phone number", async () => {
    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123" } }); //invalid phone nr.
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Phone number must be exactly 10 digits/i)).toBeInTheDocument();
  });

  test("submits form successfully and navigates to planner dashboard", async () => {
    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });


  /*test is checking that the Planner Form shows the "User not authenticated" warning 
  if Supabase doesn’t return a user. this is an integration test*/
  test("shows warning when Supabase returns no user", async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/User not authenticated/i)).toBeInTheDocument();
  });

  test("updates existing profile instead of insert", async () => {
    supabase.from().single.mockResolvedValueOnce({ data: { planner_id: "test-user-id" }, error: null });

    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Bio" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  //to do: write tests for upload feature
});
