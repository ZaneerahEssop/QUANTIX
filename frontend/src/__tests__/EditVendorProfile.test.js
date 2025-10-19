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
class MockFileReader {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }
  readAsDataURL() {
    this.result = 'data:image/jpeg;base64,mocked';
    if (this.onloadend) this.onloadend();
  }
}
global.FileReader = MockFileReader;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');

// Mock window.history.back
const mockHistoryBack = jest.fn();
Object.defineProperty(window, 'history', {
  value: {
    back: mockHistoryBack
  }
});

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

  const mockVendorWithVenue = {
    ...mockVendorData,
    service_type: 'venue,catering',
    venue_names: ['Venue 1', 'Venue 2']
  };

  const mockVendorNoProfilePic = {
    ...mockVendorData,
    profile_picture: null
  };

  const mockVendorNoCategories = {
    ...mockVendorData,
    service_type: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedNavigate.mockClear();
    mockHistoryBack.mockClear();
    
    supabase.auth = {
      updateUser: jest.fn(() => Promise.resolve({ error: null })),
    };

    supabase.storage = {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mocked-public-url' } }))
      }))
    };

    supabase.from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
      order: jest.fn().mockReturnThis(),
    }));

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

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Business')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
  });

  test("handles vendor with venue data", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorWithVenue, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Venue Names')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Venue 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Venue 2')).toBeInTheDocument();
  });

  test("handles vendor with no profile picture", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorNoProfilePic, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Change Photo')).toBeInTheDocument();
  });

  test("handles profile picture upload", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const fileInput = screen.getByLabelText((content, element) => {
      return element.tagName.toLowerCase() === 'input' && element.type === 'file';
    });
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(fileInput.files[0]).toBe(file);
    });
  });

  test("handles category selection and deselection", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const photographyLabel = screen.getByText('Photography');
    const photographyCheckbox = photographyLabel.querySelector('input[type="checkbox"]');
    
    expect(photographyCheckbox.checked).toBeTruthy();
    
    fireEvent.click(photographyLabel);
    expect(photographyCheckbox.checked).toBeFalsy();

    fireEvent.click(photographyLabel);
    expect(photographyCheckbox.checked).toBeTruthy();
  });

  test("handles venue name operations", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorWithVenue, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByDisplayValue('Venue 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Venue 2')).toBeInTheDocument();

    const addButton = screen.getByText('Add Another Venue');
    fireEvent.click(addButton);

    const venueInputs = screen.getAllByDisplayValue('');
    expect(venueInputs.length).toBeGreaterThan(0);

    const removeButtons = screen.getAllByText('×').filter(button => 
      button.getAttribute('title') === 'Remove venue'
    );
    if (removeButtons.length > 0) {
      const initialVenueCount = screen.getAllByDisplayValue(/Venue/).length;
      fireEvent.click(removeButtons[0]);
      
      await waitFor(() => {
        const newVenueCount = screen.getAllByDisplayValue(/Venue/).length;
        expect(newVenueCount).toBeLessThan(initialVenueCount);
      });
    }
  });

  test("shows warning for invalid phone number", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const phoneInput = screen.getByDisplayValue('1234567890');
    fireEvent.change(phoneInput, { target: { value: "0123" } });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    expect(await screen.findByText(/Please enter 10 digits for the phone number/i)).toBeInTheDocument();
  });

  test("handles form submission with new vendor creation", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = document.querySelector('input[name="name"]');
    const businessInput = document.querySelector('input[name="businessName"]');

    fireEvent.change(nameInput, { target: { value: 'New Vendor' } });
    fireEvent.change(businessInput, { target: { value: 'New Business' } });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles form submission with existing vendor update", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("handles form submission with profile picture upload", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const fileInput = screen.getByLabelText((content, element) => {
      return element.tagName.toLowerCase() === 'input' && element.type === 'file';
    });
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('profile-pictures');
    });
  });

  test("handles cancel button click", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(mockedNavigate).toHaveBeenCalledWith(-1);
  });

  test("handles error when fetching vendor data", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ 
        data: null, 
        error: new Error('Fetch error') 
      })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load vendor profile. Please try again./i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("handles form submission error during create", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => Promise.resolve({ 
        error: new Error('Failed to create vendor profile') 
      })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const emptyInputs = screen.getAllByDisplayValue('');
    const nameInput = emptyInputs.find(input => 
      input.getAttribute('name') === 'name'
    );
    
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'New Vendor' } });
    }

    const businessInput = emptyInputs.find(input => 
      input.getAttribute('name') === 'businessName'
    );
    
    if (businessInput) {
      fireEvent.change(businessInput, { target: { value: 'New Business' } });
    }

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to create vendor profile/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles profile picture upload error", async () => {
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn(() => Promise.resolve({ error: new Error('Upload error') })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mocked-public-url' } }))
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const fileInput = screen.getByLabelText((content, element) => {
      return element.tagName.toLowerCase() === 'input' && element.type === 'file';
    });
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Upload error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles no session user", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={null} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByText(/User not authenticated/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("handles success modal close and navigation", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/vendor-dashboard');
  });

  test("handles warning modal close", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const phoneInput = screen.getByDisplayValue('1234567890');
    fireEvent.change(phoneInput, { target: { value: "0123" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please enter 10 digits for the phone number/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Please enter 10 digits for the phone number/i)).not.toBeInTheDocument();
    });
  });

  test("handles form field changes", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    expect(nameInput.value).toBe('Jane Smith');

    const businessInput = screen.getByDisplayValue('Test Business');
    fireEvent.change(businessInput, { target: { value: 'New Business' } });
    expect(businessInput.value).toBe('New Business');

    const descriptionInput = screen.getByDisplayValue('Test description');
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });
    expect(descriptionInput.value).toBe('New description');

    const phoneInput = screen.getByDisplayValue('1234567890');
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });
    expect(phoneInput.value).toBe('0987654321');
  });

  test("handles venue category selection and venue name management", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const venueLabel = screen.getByText('Venue');
    fireEvent.click(venueLabel);

    await waitFor(() => {
      expect(screen.getByText('Venue Names')).toBeInTheDocument();
    });

    const venueSection = screen.getByText('Venue Names').closest('div');
    const venueNameInputs = venueSection.querySelectorAll('input');
    
    if (venueNameInputs.length > 0) {
      fireEvent.change(venueNameInputs[0], { target: { value: 'New Venue' } });
      expect(venueNameInputs[0].value).toBe('New Venue');
    }
  });

  test("correctly initializes categories from vendor data", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const cateringLabel = screen.getByText('Catering');
    const cateringCheckbox = cateringLabel.querySelector('input[type="checkbox"]');
    expect(cateringCheckbox.checked).toBeTruthy();

    const photographyLabel = screen.getByText('Photography');
    const photographyCheckbox = photographyLabel.querySelector('input[type="checkbox"]');
    expect(photographyCheckbox.checked).toBeTruthy();

    const venueLabel = screen.getByText('Venue');
    const venueCheckbox = venueLabel.querySelector('input[type="checkbox"]');
    expect(venueCheckbox.checked).toBeFalsy();
  });

  test("handles form submission with empty required fields", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: '' } });

    const businessInput = screen.getByDisplayValue('Test Business');
    fireEvent.change(businessInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    expect(screen.queryByText(/Profile updated successfully!/i)).not.toBeInTheDocument();
  });

  test("handles form submission with no categories selected", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorNoCategories, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = document.querySelector('input[name="name"]');
    const businessInput = document.querySelector('input[name="businessName"]');

    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    }

    if (businessInput) {
      fireEvent.change(businessInput, { target: { value: 'Test Business' } });
    }

    const cateringLabel = screen.getByText('Catering');
    fireEvent.click(cateringLabel);
    const photographyLabel = screen.getByText('Photography');
    fireEvent.click(photographyLabel);

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles venue names with only whitespace", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorWithVenue, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const venueInputs = screen.getAllByDisplayValue(/Venue/);
    fireEvent.change(venueInputs[0], { target: { value: '   ' } });

    const nameInput = document.querySelector('input[name="name"]');
    const businessInput = document.querySelector('input[name="businessName"]');

    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    }

    if (businessInput) {
      fireEvent.change(businessInput, { target: { value: 'Test Business' } });
    }

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles profile picture change with no file selected", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const fileInput = screen.getByLabelText((content, element) => {
      return element.tagName.toLowerCase() === 'input' && element.type === 'file';
    });
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(fileInput.files.length).toBe(0);
  });

  test("handles useEffect cleanup for success timer", async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  test("handles unexpected Supabase data structure", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const nameInput = document.querySelector('input[name="name"]');
    expect(nameInput.value).toBe('');

    const businessInput = document.querySelector('input[name="businessName"]');
    expect(businessInput.value).toBe('');
  });

  test("handles partial form update (only description)", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const descriptionInput = screen.getByDisplayValue('Test description');
    fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test("handles back button click", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const backButton = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backButton);

    expect(mockHistoryBack).toHaveBeenCalled();
  });
});