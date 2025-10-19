import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EditPlannerProfile from "../pages/EditPlannerProfile";

// Mock the entire supabase module
jest.mock('../client', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    auth: {
      updateUser: jest.fn(),
    },
  },
}));

// Import the mocked supabase
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

describe("EditPlannerProfile Testing", () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  };

  const mockPlannerData = {
    name: 'John Doe',
    email: 'test@example.com',
    contact_number: '1234567890',
    bio: 'Test bio',
    profile_picture: 'test-profile-pic-url',
    planner_id: 'test-user-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock supabase.from chain
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
        single: jest.fn(() => Promise.resolve({ data: mockPlannerData, error: null })),
      };
      return builder;
    });

    // Mock supabase.storage.from chain
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn(() => Promise.resolve({ error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } })),
    }));

    // Mock supabase.auth.updateUser
    supabase.auth.updateUser.mockImplementation(() => Promise.resolve({ error: null }));

    // Mock console methods
    jest.spyOn(global.console, 'error').mockImplementation(() => {});
    jest.spyOn(global.console, 'warn').mockImplementation(() => {});
    jest.spyOn(global.console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error.mockRestore();
    console.warn.mockRestore();
    console.log.mockRestore();
  });

  test("renders loading state initially", async () => {
    let resolveFetch;
    supabase.from.mockImplementationOnce(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => new Promise(resolve => {
            resolveFetch = resolve; // Capture resolve to control timing
          })),
        })),
      })),
    }));

    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Loading your profile...')).toBeInTheDocument();

    // Resolve the fetch to clean up
    await act(async () => {
      resolveFetch({ data: mockPlannerData, error: null });
    });
  });

  test("fetches and displays planner data", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
  });

  test("shows warning for invalid phone number", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('1234567890'), { target: { value: 'invalid' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid 10-digit phone number/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("shows warning when name is empty", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('John Doe'), { target: { value: '' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter your name')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("shows warning for invalid email format", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('test@example.com'), { target: { value: 'invalid-email' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles profile picture upload", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    const input = document.getElementById('profilePic'); // Use direct DOM query since input is hidden

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Change/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('profile-pictures');
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles profile picture upload error", async () => {
    supabase.storage.from.mockImplementationOnce(() => ({
      upload: jest.fn(() => Promise.resolve({ error: new Error('Upload error') })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } })),
    }));

    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    const input = document.getElementById('profilePic'); // Use direct DOM query since input is hidden

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles auth update error", async () => {
    supabase.auth.updateUser.mockImplementationOnce(() => Promise.resolve({ error: new Error('Auth update error') }));

    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles cancel button click", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    });

    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("handles back button click", async () => {
    const mockBack = jest.fn();
    jest.spyOn(window.history, 'back').mockImplementation(mockBack);

    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    });

    expect(mockBack).toHaveBeenCalled();
  });

  test("handles form submission successfully", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('test@example.com'), { target: { value: 'test@example.com' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Simulate closing the success modal
    await act(async () => {
      const closeButton = screen.getByRole('button', { name: /×/i });
      fireEvent.click(closeButton);
    });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 10000 });
  });

  test("handles error when fetching planner data", async () => {
    supabase.from.mockImplementationOnce(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: new Error('Fetch error') 
          })),
        })),
      })),
    }));

    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  test("handles form submission error", async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockPlannerData, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          error: new Error('Update error') 
        })),
      })),
    }));

    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('test@example.com'), { target: { value: 'test@example.com' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Update error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles no session user", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={{}} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  test("cleans up success timer on unmount", async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = await act(async () => {
      return render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      unmount();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test("handles empty bio submission", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('Test bio'), { target: { value: '' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("handles maximum input length for bio", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const longBio = 'A'.repeat(1000);
    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('Test bio'), { target: { value: longBio } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test("dismisses warning modal", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <EditPlannerProfile session={mockSession} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading your profile...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('John Doe'), { target: { value: '' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Update Profile/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter your name')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      const closeButton = screen.getByRole('button', { name: /×/i });
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Please enter your name')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});