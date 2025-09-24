import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlannerForm from "../pages/PlannerForm";
import { MemoryRouter } from "react-router-dom";
import { supabase } from '../client';

// Silence console warnings
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => console.warn.mockRestore());

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
}));

// Mock supabase
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'mock-url' } }),
      }),
    },
  },
}));

describe("PlannerForm Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user123', email: 'jane@example.com' } }, error: null });

    // Mock supabase.from to handle different tables
    supabase.from.mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockResolvedValue({ error: null }),
      };

      if (table === 'users') {
        chain.single.mockResolvedValue({ data: { user_id: 'user123' }, error: null });
      } else if (table === 'planners') {
        chain.single.mockResolvedValue({ data: null, error: null }); // Default: no existing planner
      }

      return chain;
    });

    supabase.storage.from().upload.mockResolvedValue({ error: null });
  });

  test("renders the planner form with inputs and button", () => {
    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Phone number must be exactly 10 digits/i)).toBeInTheDocument();
  });

  test("shows warning for invalid email address", async () => {
    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "invalid" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  test("submits form successfully and navigates to planner dashboard", async () => {
    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('planners');
      expect(supabase.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            planner_id: 'user123',
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone: '0123456789',
            bio: 'Events by Janiey',
          })
        ])
      );
      expect(mockedNavigate).toHaveBeenCalledWith("/dashboard");
    }, { timeout: 2000 });
  });

  test("shows warning when Supabase returns no user", async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/User not authenticated/i)).toBeInTheDocument();
    });
  });

  test("updates existing profile instead of insert", async () => {
    // Override for planners table to return existing planner
    supabase.from.mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockResolvedValue({ error: null }),
      };

      if (table === 'users') {
        chain.single.mockResolvedValue({ data: { user_id: 'user123' }, error: null });
      } else if (table === 'planners') {
        chain.single.mockResolvedValue({ data: { planner_id: 'user123' }, error: null });
      }

      return chain;
    });

    render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Bio" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('planners');
      expect(supabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane',
          email: 'jane@example.com',
          phone: '0123456789',
          bio: 'Bio',
        }),
        expect.anything()
      );
      expect(mockedNavigate).toHaveBeenCalledWith("/dashboard");
    }, { timeout: 2000 });
  });

  test("handles profile picture upload and preview", async () => {
    const { container } = render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'image.png', { type: 'image/png' });
    const input = container.querySelector('#profilePic');
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for preview to update (change overlay appears)
    await waitFor(() => {
      expect(screen.getByText(/Change/i)).toBeInTheDocument();
    });

    // Simulate form submission with file
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.storage.from().upload).toHaveBeenCalled();
      expect(mockedNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("shows warning on failed profile picture upload", async () => {
    supabase.storage.from().upload.mockResolvedValueOnce({ error: { message: 'Upload failed' } });

    const { container } = render(
      <MemoryRouter>
        <PlannerForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'image.png', { type: 'image/png' });
    const input = container.querySelector('#profilePic');
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText(/Bio/i), { target: { value: "Events by Janiey" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error uploading profile picture/i)).toBeInTheDocument();
    });
  });
});