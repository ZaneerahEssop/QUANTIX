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
    expect(screen.getByText("Add Profile Picture")).toBeInTheDocument();
    expect(screen.getByText("Business Documents")).toBeInTheDocument();
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

    fireEvent.change(container.querySelector('.venue-names-container input[type="text"][required]'), { target: { value: "" } });

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

    fireEvent.click(screen.getByText(/Add Another Venue/i));
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
    }, { timeout: 3000 });
  });

  test("submits form successfully for venue category with multiple venue names", async () => {
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

    fireEvent.change(container.querySelector('.venue-names-container input[type="text"][required]'), { target: { value: "Venue One" } });
    fireEvent.click(screen.getByText(/Add Another Venue/i));
    const venueInputs = container.querySelectorAll('.venue-names-container input[type="text"][required]');
    fireEvent.change(venueInputs[1], { target: { value: "Venue Two" } });

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
            venue_names: ['Venue One', 'Venue Two'],
          })
        ])
      );
      expect(mockedNavigate).toHaveBeenCalledWith("/pending-approval");
    }, { timeout: 3000 });
  });

  test("removes venue name field correctly", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "venue" } });
    fireEvent.click(screen.getByText(/Add Another Venue/i));
    const venueInputs = container.querySelectorAll('.venue-names-container input[type="text"][required]');
    expect(venueInputs.length).toBe(2);

    fireEvent.click(container.querySelector('.venue-names-container button[title="Remove venue"]'));
    const updatedVenueInputs = container.querySelectorAll('.venue-names-container input[type="text"][required]');
    expect(updatedVenueInputs.length).toBe(1);
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
    }, { timeout: 3000 });
  });

  test("handles valid document upload and displays document list", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf', size: 5 * 1024 * 1024 });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024, writable: false });
    const input = container.querySelector('input[type="file"][accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/doc.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/5\.00\s*MB/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.storage.from().upload).toHaveBeenCalled();
      expect(supabase.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            documents: expect.arrayContaining([
              expect.objectContaining({
                name: 'doc.pdf',
                url: 'mock-url',
              })
            ])
          })
        ])
      );
      expect(mockedNavigate).toHaveBeenCalledWith("/pending-approval");
    }, { timeout: 3000 });
  });

  test("shows warning for invalid document type", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'doc.txt', { type: 'text/plain' });
    const input = container.querySelector('input[type="file"][accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type\. Please upload PDF, Word documents, or images only\./i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("shows warning for oversized document", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf', size: 15 * 1024 * 1024 });
    Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024, writable: false });
    const input = container.querySelector('input[type="file"][accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/File size too large\. Maximum size is 10MB per file\./i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("removes document from list correctly", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf', size: 5 * 1024 * 1024 });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024, writable: false });
    const input = container.querySelector('input[type="file"][accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/doc.pdf/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: "×" }));

    await waitFor(() => {
      expect(screen.queryByText(/doc.pdf/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("shows warning on failed document upload", async () => {
    supabase.storage.from().upload.mockResolvedValueOnce({ error: { message: 'Document upload failed' } });

    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf', size: 5 * 1024 * 1024 });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024, writable: false });
    const input = container.querySelector('input[type="file"][accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"]');
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error uploading document/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("disables inputs during upload", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf', size: 5 * 1024 * 1024 });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024, writable: false });
    const docInput = container.querySelector('input[type="file"][accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"]');
    fireEvent.change(docInput, { target: { files: [file] } });

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "catering" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Catering services" } });

    supabase.storage.from().upload.mockImplementation(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Uploading.../i })).toBeDisabled();
      expect(container.querySelector('textarea[name="description"]')).toBeDisabled();
      expect(docInput).toBeDisabled();
    }, { timeout: 3000 });
  });

  test("shows warning when required fields are missing", async () => {
    render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.from).not.toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test("closes warning modal when OK button is clicked", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Phone number must be exactly 10 digits/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /OK/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Phone number must be exactly 10 digits/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("renders venue fields only for venue category", () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Venue Names/i)).not.toBeInTheDocument();

    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "venue" } });

    rerender(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    expect(screen.getByText(/Venue Names/i)).toBeInTheDocument();
    expect(screen.getByText(/Venue Name 1/i)).toBeInTheDocument();
  });

  test("shows warning on failed Supabase insert", async () => {
    supabase.from().insert.mockResolvedValueOnce({ error: { message: 'Insert failed' } });

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
      expect(screen.getByText(/Error saving profile: Insert failed/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("adds has-value class to inputs when filled", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    const nameInput = container.querySelector('input[name="name"]');
    expect(nameInput).not.toHaveClass('has-value');

    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });

    await waitFor(() => {
      expect(nameInput).toHaveClass('has-value');
    });

    const categorySelect = container.querySelector('select[name="category"]');
    expect(categorySelect).not.toHaveClass('has-value');

    fireEvent.change(categorySelect, { target: { value: "catering" } });

    await waitFor(() => {
      expect(categorySelect).toHaveClass('has-value');
    });
  });

  test("shows warning for whitespace-only venue name", async () => {
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

    fireEvent.change(container.querySelector('.venue-names-container input[type="text"][required]'), { target: { value: "   " } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Please fill in all venue name fields or remove empty ones/i)).toBeInTheDocument();
  });

  test("handles maximum venue names", async () => {
    const { container } = render(
      <MemoryRouter>
        <VendorForm />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('select[name="category"]'), { target: { value: "venue" } });

    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText(/Add Another Venue/i));
    }

    const venueInputs = container.querySelectorAll('.venue-names-container input[type="text"][required]');
    expect(venueInputs.length).toBe(5);

    venueInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: `Venue ${index + 1}` } });
    });

    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: "Jane Doe" } });
    fireEvent.change(container.querySelector('input[name="businessName"]'), { target: { value: "Jane's Events" } });
    fireEvent.change(container.querySelector('input[name="phone"]'), { target: { value: "0123456789" } });
    fireEvent.change(container.querySelector('textarea[name="description"]'), { target: { value: "Venue services" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(supabase.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            venue_names: expect.arrayContaining(['Venue 1', 'Venue 2', 'Venue 3', 'Venue 4', 'Venue 5']),
          })
        ])
      );
      expect(mockedNavigate).toHaveBeenCalledWith("/pending-approval");
    }, { timeout: 3000 });
  });
});