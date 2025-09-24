import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VendorForm from "../pages/VendorForm";
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

describe("VendorForm Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });

    supabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    supabase.storage.from().upload.mockResolvedValue({ error: null });
  });

  test("renders the vendor form with inputs and button", () => {
    render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Business Name")).toBeInTheDocument();
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(screen.getByText("Service Category")).toBeInTheDocument();
    expect(screen.getByText("Description of Services")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Profile/i })).toBeInTheDocument();
  });

  test("shows warning for invalid phone number", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Phone number must be exactly 10 digits/i)).toBeInTheDocument();
  });

  test("shows warning for missing venue name in venue category", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "venue" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Venue services" } });
    // Leave venue name empty (default is [""])

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Please fill in all venue name fields or remove empty ones/i)).toBeInTheDocument();
  });

  test("shows warning for empty venue name fields in venue category", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "venue" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Venue services" } });

    // Add an empty venue name
    fireEvent.click(screen.getByText(/Add Another Venue/i));
    // The second venue name is empty

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Please fill in all venue name fields or remove empty ones/i)).toBeInTheDocument();
  });

  test("submits form successfully for non-venue category and navigates to pending-approval", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('vendors');
      expect(supabase.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            vendor_id: 'user123',
            name: 'Jane Doe',
            business_name: "Jane's Events",
            contact_number: '0123456789',
            service_type: 'catering',
            description: 'Catering services',
            venue_names: [],
          })
        ])
      );
      expect(mockedNavigate).toHaveBeenCalledWith("/pending-approval");
    }, { timeout: 2000 });
  });

  test("submits form successfully for venue category with venue names", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "venue" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Venue services" } });

    // Fill the first venue name
    fireEvent.change(container.querySelector('.venue-names-container input[type="text"][required]'), { target: { value: "Venue One" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('vendors');
      expect(supabase.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            vendor_id: 'user123',
            name: 'Jane Doe',
            business_name: "Jane's Events",
            contact_number: '0123456789',
            service_type: 'venue',
            description: 'Venue services',
            venue_names: ['Venue One'],
          })
        ])
      );
      expect(mockedNavigate).toHaveBeenCalledWith("/pending-approval");
    }, { timeout: 2000 });
  });

  test("shows warning when Supabase returns no user", async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/User not authenticated/i)).toBeInTheDocument();
  });

  test("handles profile picture upload and preview", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'image.png', { type: 'image/png' });
    const input = container.querySelector('#profilePic');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Change/i)).toBeInTheDocument();
    });

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.storage.from().upload).toHaveBeenCalled();
      expect(mockedNavigate).toHaveBeenCalledWith("/pending-approval");
    });
  });

  test("shows warning on failed profile picture upload", async () => {
    supabase.storage.from().upload.mockResolvedValueOnce({ error: { message: 'Upload failed' } });

    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'image.png', { type: 'image/png' });
    const input = container.querySelector('#profilePic');
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error uploading profile picture/i)).toBeInTheDocument();
    });
  });
});