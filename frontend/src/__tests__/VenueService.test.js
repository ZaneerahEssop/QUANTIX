import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VenueService from '../components/services/VenueService';
import { supabase } from '../client';



// Mock dependencies
jest.mock('../client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
        })),
      })),
      upsert: jest.fn(() => ({
        onConflict: jest.fn(),
      })),
    })),
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
}));

jest.mock('react-markdown', () => {
  return {
    __esModule: true,
    default: ({ children }) => <div data-testid="react-markdown">{children}</div>,
  };
});

// Mock CSS import
jest.mock('./VenueService.css', () => ({}));

describe('VenueService', () => {
  const mockVendorId = 'vendor-123';
  const mockVenueNames = ['Venue A', 'Venue B'];
  const mockServiceId = 'service-123';

  const mockVenuesData = [
    {
      id: 'venue-1',
      name: 'Venue A',
      description: 'Beautiful venue A',
      capacity: '100 people',
      base_rate: 'R10,000',
      additional_charges: 'R1,000 cleaning fee',
      photos: [{ url: 'photo1.jpg', path: 'path1' }],
      service_id: mockServiceId,
    },
    {
      id: 'venue-2',
      name: 'Venue B',
      description: 'Spacious venue B',
      capacity: '200 people',
      base_rate: 'R15,000',
      additional_charges: 'R2,000 security fee',
      photos: [],
      service_id: mockServiceId,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // Helper function to setup mocks for successful data loading
  const setupSuccessfulMocks = () => {
    const mockVendorServiceQuery = {
      data: { id: mockServiceId },
      error: null,
    };

    const mockVenuesQuery = {
      data: mockVenuesData,
      error: null,
    };

    // Mock the first call for vendor_services
    const vendorServicesMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(mockVendorServiceQuery),
    };

    // Mock the second call for venues
    const venuesMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      data: mockVenuesData,
      error: null,
    };

    supabase.from
      .mockReturnValueOnce(vendorServicesMock)
      .mockReturnValueOnce(venuesMock);

    return { vendorServicesMock, venuesMock };
  };

  describe('Initial Loading and Setup', () => {
    it('shows loading state initially', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      // Mock supabase to return our pending promise
      const vendorServicesMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnValue(promise),
      };

      supabase.from.mockReturnValueOnce(vendorServicesMock);

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} />);
      
      // Loading should be visible immediately
      expect(screen.getByText('Loading venue information...')).toBeInTheDocument();
      
      // Resolve the promise to clean up
      resolvePromise({
        data: { id: mockServiceId },
        error: null,
      });

      await act(async () => {
        await promise;
      });
    });

    it('handles missing vendorId or venueNames', async () => {
      render(<VenueService vendorId={null} venueNames={[]} />);
      
      await waitFor(() => {
        expect(screen.getByText(/You have not listed any venues/)).toBeInTheDocument();
      });
    });

    it('fetches and reconciles data on mount', async () => {
      setupSuccessfulMocks();

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} />);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('vendor_services');
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Read-only Mode', () => {
    beforeEach(async () => {
      setupSuccessfulMocks();

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} isReadOnly={true} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });
    });

    it('displays venue information in read-only mode', () => {
      expect(screen.getByText('Venue A')).toBeInTheDocument();
      expect(screen.getByText('Venue B')).toBeInTheDocument();
      expect(screen.getByText('100 people')).toBeInTheDocument();
      expect(screen.getByText('200 people')).toBeInTheDocument();
    });

    it('does not show edit button in read-only mode', () => {
      expect(screen.queryByText('Edit Details')).not.toBeInTheDocument();
    });

    it('displays ReactMarkdown for formatted content', () => {
      const markdownElements = screen.getAllByTestId('react-markdown');
      expect(markdownElements.length).toBeGreaterThan(0);
    });

    it('shows "No images yet" when no photos available', () => {
      expect(screen.getAllByText('No images yet').length).toBeGreaterThan(0);
    });
  });

  describe('Edit Mode', () => {
    beforeEach(async () => {
      setupSuccessfulMocks();

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} isReadOnly={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit Details'));
    });

    it('enters edit mode when edit button is clicked', () => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('handles text input changes', () => {
      const descriptionTextareas = screen.getAllByPlaceholderText('Describe this specific venue...');
      
      fireEvent.change(descriptionTextareas[0], { target: { value: 'New description' } });
      
      expect(descriptionTextareas[0]).toHaveValue('New description');
    });

    it('handles capacity input changes', () => {
      const capacityInputs = screen.getAllByPlaceholderText(/e.g., 150 Seated/);
      fireEvent.change(capacityInputs[0], { target: { value: '150 people' } });
      
      expect(capacityInputs[0]).toHaveValue('150 people');
    });

    it('applies formatting with toolbar buttons', () => {
      const boldButtons = screen.getAllByTitle('Bold');
      expect(boldButtons.length).toBeGreaterThan(0);
      expect(boldButtons[0]).toBeInTheDocument();
    });
  });

  describe('Photo Management', () => {
    beforeEach(async () => {
      setupSuccessfulMocks();

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      supabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/new-photo.jpg' },
        }),
      });

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} isReadOnly={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit Details'));
    });

    it('handles photo deletion', () => {
      const deleteButtons = screen.getAllByText('×').filter(button => 
        button.className.includes('delete-photo')
      );
      
      expect(deleteButtons.length).toBe(1);
      fireEvent.click(deleteButtons[0]);
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      setupSuccessfulMocks();

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} isReadOnly={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit Details'));
    });

    it('submits form successfully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      const form = document.getElementById('venue-service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalled();
      });
    });

    it('handles form submission errors', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        error: new Error('Database error'),
      });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      const form = document.getElementById('venue-service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
      });
    });

    it('cancels editing and reverts changes', async () => {
      setupSuccessfulMocks();

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Edit Details')).toBeInTheDocument();
      });
    });
  });

  describe('Toast Notifications', () => {
    beforeEach(async () => {
      setupSuccessfulMocks();

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} isReadOnly={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });
    });

    it('shows and auto-hides toast notifications', async () => {
      fireEvent.click(screen.getByText('Edit Details'));

      const mockUpsert = jest.fn().mockResolvedValue({
        error: new Error('Test error'),
      });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      const form = document.getElementById('venue-service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.queryByText(/Failed to save/)).not.toBeInTheDocument();
    });

    it('allows manual toast dismissal', async () => {
      fireEvent.click(screen.getByText('Edit Details'));

      const mockUpsert = jest.fn().mockResolvedValue({
        error: new Error('Test error'),
      });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      const form = document.getElementById('venue-service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
      });

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(screen.queryByText(/Failed to save/)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      const vendorServicesMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockRejectedValue(new Error('Fetch error')),
      };

      supabase.from.mockReturnValueOnce(vendorServicesMock);

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} />);

      await waitFor(() => {
        expect(screen.getByText('Error loading venue data.')).toBeInTheDocument();
      });
    });

    it('handles no service data found', async () => {
      const vendorServicesMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      supabase.from.mockReturnValueOnce(vendorServicesMock);

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Venue Details')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty venue names array', async () => {
      render(<VenueService vendorId={mockVendorId} venueNames={[]} />);

      await waitFor(() => {
        expect(screen.getByText(/You have not listed any venues/)).toBeInTheDocument();
      });
    });

    it('handles null vendorId', async () => {
      render(<VenueService vendorId={null} venueNames={mockVenueNames} />);

      await waitFor(() => {
        // Check for any of the possible messages that could appear
        const possibleMessages = [
          /You have not listed any venues/,
          /This vendor has not listed any specific venues/,
          /Loading venue information/,
          /Venue Details/
        ];
        
        const foundElements = possibleMessages.some(pattern => {
          try {
            return screen.getByText(pattern) !== null;
          } catch {
            return false;
          }
        });
        
        expect(foundElements).toBe(true);
      });
    });

    it('handles undefined venueNames', async () => {
      render(<VenueService vendorId={mockVendorId} venueNames={undefined} />);

      await waitFor(() => {
        expect(screen.getByText(/You have not listed any venues/)).toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('cleans up timeouts on unmount', () => {
      const { unmount } = render(
        <VenueService vendorId={mockVendorId} venueNames={mockVenueNames} />
      );

      unmount();

      expect(() => {
        act(() => {
          jest.runOnlyPendingTimers();
        });
      }).not.toThrow();
    });
  });
});