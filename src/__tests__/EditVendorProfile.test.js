import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EditVendorProfile from "../pages/EditVendorProfile";
import { supabase } from '../client';

// Mock useNavigate
const mockedNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockedNavigate,
}));

// Mock FileReader
global.FileReader = class {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }
  readAsDataURL() {
    this.result = 'data:image/jpeg;base64,mocked';
    if (this.onloadend) this.onloadend();
  }
};

describe("EditVendorProfile Testing", () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  };

  const mockVendorData = {
    name: 'John Doe',
    business_name: 'Test Business',
    contact_number: '1234567890',
    description: 'Test description',
    service_type: 'catering,photography',
    profile_picture: 'test-profile-pic-url',
    vendor_id: 'test-user-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to default behavior
    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        insert: jest.fn(() => Promise.resolve({ error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null })), 
        })),
        delete: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        order: jest.fn(() => builder),
        single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
      };
      return builder;
    });
    
    // Mock console methods to avoid noise
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.warn.mockRestore();
    console.log.mockRestore();
  });

  test("renders loading state initially", () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading your profile...')).toBeInTheDocument();
  });

  test("fetches and displays vendor data", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Check that form fields are populated
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Business')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
  });

  test("shows warning for invalid phone number", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Enter invalid phone number
    const phoneInput = screen.getByDisplayValue('1234567890');
    fireEvent.change(phoneInput, { target: { value: "0123" } });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    expect(await screen.findByText(/Please enter 10 digits for the phone number/i)).toBeInTheDocument();
  });

  test("handles cancel button click", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(mockedNavigate).toHaveBeenCalledWith(-1);
  });

 /*test("handles form submission successfully", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  }); */

  test("handles error when fetching vendor data", async () => {
    // Mock a fetch error
    supabase.from.mockImplementationOnce(() => {
      const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        single: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: new Error('Fetch error') 
        })),
      };
      return builder;
    });

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    // Should finish loading without displaying data
    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles form submission error", async () => {
    // Mock an update error
    supabase.from.mockImplementation(() => {
      const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            error: new Error('Update error') 
          })), 
        })),
      };
      return builder;
    });

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Update error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles no session user", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={{}} />
      </MemoryRouter>
    );

    // Should finish loading without displaying data
    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});