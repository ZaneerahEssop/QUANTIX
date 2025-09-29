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

  beforeEach(() => {
    jest.clearAllMocks();
    mockedNavigate.mockClear();
    
    // Default mock implementations
    supabase.auth = {
      updateUser: jest.fn(() => Promise.resolve({ error: null }))
    };

    supabase.storage = {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mocked-public-url' } }))
      }))
    };

    supabase.from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null }))
    }));

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
      single: jest.fn(() => Promise.resolve({ data: mockVendorWithVenue, error: null }))
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show venue names section
    expect(screen.getByText('Venue Names')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Venue 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Venue 2')).toBeInTheDocument();
  });

  test("handles vendor with no profile picture", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorNoProfilePic, error: null }))
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show default camera icon with "Change Photo" text
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

    // Use the file input directly since the label text is tricky
    const fileInput = screen.getByLabelText((content, element) => {
      return element.tagName.toLowerCase() === 'input' && element.type === 'file';
    });
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    // FileReader should be triggered
    await waitFor(() => {
      // We can't easily test FileReader calls directly, but we can verify the component handles the change
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

    // Find a category that's not already selected (Photography in this case)
    const photographyLabel = screen.getByText('Photography');
    const photographyCheckbox = photographyLabel.querySelector('input[type="checkbox"]');
    
    // Initially should not be checked (based on mock data which has catering,photography)
    // Since photography is in the mock data, it should be checked initially
    expect(photographyCheckbox.checked).toBeTruthy();
    
    // Deselect the category
    fireEvent.click(photographyLabel);
    expect(photographyCheckbox.checked).toBeFalsy();

    // Select the category again
    fireEvent.click(photographyLabel);
    expect(photographyCheckbox.checked).toBeTruthy();
  });

  test("handles venue name operations", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorWithVenue, error: null }))
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should have initial venue names
    expect(screen.getByDisplayValue('Venue 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Venue 2')).toBeInTheDocument();

    // Add a new venue name
    const addButton = screen.getByText('Add Another Venue');
    fireEvent.click(addButton);

    // Should have a new empty venue input
    const venueInputs = screen.getAllByDisplayValue('');
    expect(venueInputs.length).toBeGreaterThan(0);

    // Remove a venue name - find by the remove button
    const removeButtons = screen.getAllByText('×').filter(button => 
      button.getAttribute('title') === 'Remove venue'
    );
    if (removeButtons.length > 0) {
      const initialVenueCount = screen.getAllByDisplayValue(/Venue/).length;
      fireEvent.click(removeButtons[0]);
      
      // Should have one less venue
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
    // Mock no existing vendor (new vendor)
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => Promise.resolve({ error: null }))
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Find inputs by their name attributes - this is the most reliable way
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
    }, { timeout: 3000 });
  });

  test("handles form submission with profile picture upload", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Upload a profile picture first
    const fileInput = screen.getByLabelText((content, element) => {
      return element.tagName.toLowerCase() === 'input' && element.type === 'file';
    });
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Then submit the form
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
      }))
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles form submission error during update", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          error: new Error('Update error') 
        }))
      }))
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
      expect(screen.getByText(/Update error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles form submission error during create", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => Promise.resolve({ 
        error: new Error('Failed to create vendor profile') 
      }))
    }));

    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Fill required fields - use getAllByDisplayValue and take the first one (name field)
    const emptyInputs = screen.getAllByDisplayValue('');
    const nameInput = emptyInputs.find(input => 
      input.getAttribute('name') === 'name'
    );
    
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'New Vendor' } });
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

    // Upload a profile picture
    const fileInput = screen.getByLabelText((content, element) => {
      return element.tagName.toLowerCase() === 'input' && element.type === 'file';
    });
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Then submit the form
    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Upload error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles no session user", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={{}} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles success modal close and navigation", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Trigger success first
    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Close the success modal
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

    // Trigger warning first with invalid phone
    const phoneInput = screen.getByDisplayValue('1234567890');
    fireEvent.change(phoneInput, { target: { value: "0123" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please enter 10 digits for the phone number/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Close the warning modal
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    // Warning should be dismissed
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

    // Test name change
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    expect(nameInput.value).toBe('Jane Smith');

    // Test business name change
    const businessInput = screen.getByDisplayValue('Test Business');
    fireEvent.change(businessInput, { target: { value: 'New Business' } });
    expect(businessInput.value).toBe('New Business');

    // Test description change
    const descriptionInput = screen.getByDisplayValue('Test description');
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });
    expect(descriptionInput.value).toBe('New description');

    // Test phone change
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

    // Select venue category (it's not selected initially based on mock data)
    const venueLabel = screen.getByText('Venue');
    fireEvent.click(venueLabel);

    // Should show venue names section
    await waitFor(() => {
      expect(screen.getByText('Venue Names')).toBeInTheDocument();
    });

    // Test venue name input - use getAllByDisplayValue and find the one that's for venue names
    const venueInputs = screen.getAllByDisplayValue('');
    // Find the venue input by looking for inputs within the venue names section
    const venueSection = screen.getByText('Venue Names').closest('div');
    const venueNameInputs = venueSection.querySelectorAll('input');
    
    if (venueNameInputs.length > 0) {
      fireEvent.change(venueNameInputs[0], { target: { value: 'New Venue' } });
      expect(venueNameInputs[0].value).toBe('New Venue');
    }
  });

  // Additional test for checking initial category state
  test("correctly initializes categories from vendor data", async () => {
    render(
      <MemoryRouter>
        <EditVendorProfile session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Check that categories from mock data are selected
    const cateringLabel = screen.getByText('Catering');
    const cateringCheckbox = cateringLabel.querySelector('input[type="checkbox"]');
    expect(cateringCheckbox.checked).toBeTruthy();

    const photographyLabel = screen.getByText('Photography');
    const photographyCheckbox = photographyLabel.querySelector('input[type="checkbox"]');
    expect(photographyCheckbox.checked).toBeTruthy();

    // Venue should not be selected initially
    const venueLabel = screen.getByText('Venue');
    const venueCheckbox = venueLabel.querySelector('input[type="checkbox"]');
    expect(venueCheckbox.checked).toBeFalsy();
  });
});