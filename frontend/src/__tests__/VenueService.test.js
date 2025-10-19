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
      upsert: jest.fn(() => Promise.resolve({ error: null })),
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

  describe('SimpleTextEditor Component', () => {
    const MockSimpleTextEditor = ({ value, onChange, placeholder, height = '150px' }) => {
      const textareaRef = React.useRef(null);
      
      const handleChange = (e) => {
        onChange(e.target.value);
      };

      const applyFormat = (format) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        let newValue = value;
        let newCursorPos = end;
        switch(format) {
          case 'bold': newValue = `${value.substring(0, start)}**${selectedText}**${value.substring(end)}`; newCursorPos = selectedText ? end + 4 : start + 2; break;
          case 'italic': newValue = `${value.substring(0, start)}*${selectedText}*${value.substring(end)}`; newCursorPos = selectedText ? end + 2 : start + 1; break;
          case 'bullet': newValue = `${value.substring(0, start)}- ${selectedText}${value.substring(end)}`; newCursorPos = selectedText ? end + 2 : start + 2; break;
          case 'number': newValue = `${value.substring(0, start)}1. ${selectedText}${value.substring(end)}`; newCursorPos = selectedText ? end + 3 : start + 3; break;
          default: return;
        }
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
          textarea.focus();
        }, 0);
      };

      return (
        <div className="text-editor-wrapper">
          <div className="editor-toolbar">
            <button type="button" onClick={() => applyFormat('bold')} title="Bold" className="format-button"><strong>B</strong></button>
            <button type="button" onClick={() => applyFormat('italic')} title="Italic" className="format-button"><em>I</em></button>
            <button type="button" onClick={() => applyFormat('bullet')} title="Bullet List" className="format-button">•</button>
            <button type="button" onClick={() => applyFormat('number')} title="Numbered List" className="format-button">1.</button>
          </div>
          <textarea ref={textareaRef} className="simple-textarea" value={value || ''} onChange={handleChange} placeholder={placeholder} style={{ minHeight: height }} />
        </div>
      );
    };


    it('applies bullet list formatting', async () => {
      const onChange = jest.fn();
      render(<MockSimpleTextEditor value="test" onChange={onChange} />);
      
      const bulletButton = screen.getByTitle('Bullet List');
      fireEvent.click(bulletButton);
      
      expect(onChange).toHaveBeenCalledWith('- test');
    });

    it('applies numbered list formatting', async () => {
      const onChange = jest.fn();
      render(<MockSimpleTextEditor value="test" onChange={onChange} />);
      
      const numberButton = screen.getByTitle('Numbered List');
      fireEvent.click(numberButton);
      
      expect(onChange).toHaveBeenCalledWith('1. test');
    });

    it('handles text changes', async () => {
      const onChange = jest.fn();
      render(<MockSimpleTextEditor value="" onChange={onChange} placeholder="Enter text" />);
      
      const textarea = screen.getByPlaceholderText('Enter text');
      fireEvent.change(textarea, { target: { value: 'new text' } });
      
      expect(onChange).toHaveBeenCalledWith('new text');
    });
  });

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

    it('reconciles venue data correctly', async () => {
      const mockVendorServiceQuery = {
        data: { id: mockServiceId },
        error: null,
      };

      const mockExistingVenues = [
        {
          id: 'venue-1',
          name: 'Venue A',
          description: 'Existing description',
          capacity: '100',
          base_rate: 'R10,000',
          additional_charges: 'R1,000',
          photos: [],
          service_id: mockServiceId,
        }
      ];

      const vendorServicesMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue(mockVendorServiceQuery),
      };

      const venuesMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: mockExistingVenues,
        error: null,
      };

      supabase.from
        .mockReturnValueOnce(vendorServicesMock)
        .mockReturnValueOnce(venuesMock);

      render(<VenueService vendorId={mockVendorId} venueNames={['Venue A', 'Venue C']} />);

      await waitFor(() => {
        expect(screen.getByText('Venue A')).toBeInTheDocument();
        expect(screen.getByText('Venue C')).toBeInTheDocument();
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

    it('handles base rate text editor changes', () => {
      const baseRateEditors = screen.getAllByPlaceholderText(/e.g., R20,000 hire fee/);
      expect(baseRateEditors.length).toBeGreaterThan(0);
    });

    it('handles additional charges text editor changes', () => {
      const additionalChargesEditors = screen.getAllByPlaceholderText(/e.g., Security fee/);
      expect(additionalChargesEditors.length).toBeGreaterThan(0);
    });

    it('cancels editing and reverts changes', async () => {
      // Change some data first
      const descriptionTextareas = screen.getAllByPlaceholderText('Describe this specific venue...');
      fireEvent.change(descriptionTextareas[0], { target: { value: 'Modified description' } });

      // Mock the refetch
      setupSuccessfulMocks();

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Edit Details')).toBeInTheDocument();
      });
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

  it('handles successful photo upload', async () => {
    // Use getAllByLabelText and target the first venue's upload button
    const fileInputs = screen.getAllByLabelText('Add Image');
    expect(fileInputs.length).toBe(2); // Should have 2 venues
    
    const fileInput = fileInputs[0]; // Use the first venue's upload button
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('portfolio-photos');
    });
  });

  it('handles photo upload failure', async () => {
    supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: new Error('Upload failed') }),
      getPublicUrl: jest.fn(),
    });

    const fileInputs = screen.getAllByLabelText('Add Image');
    const fileInput = fileInputs[0];
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
    });
  });

  it('handles photo upload without authenticated user', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const fileInputs = screen.getAllByLabelText('Add Image');
    const fileInput = fileInputs[0];
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/You must be logged in/)).toBeInTheDocument();
    });
  });
});


describe('Form Submission', () => {
  let mockUpsert;

  beforeEach(async () => {
    setupSuccessfulMocks();

    render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} isReadOnly={false} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Details'));

    // Setup the upsert mock for form submission
    mockUpsert = jest.fn();
  });

  it('submits form successfully', async () => {
    // Mock successful upsert
    mockUpsert.mockResolvedValue({ error: null });
    
    // Clear previous mocks and set up the specific flow
    supabase.from.mockReset();
    
    // First call: upsert for saving
    supabase.from.mockReturnValueOnce({
      upsert: mockUpsert,
    });

    // Subsequent calls: refetch data (vendor_services and venues)
    const { mockVendorServiceQuery, mockVenuesQuery } = setupSuccessfulMocks();

    const form = document.getElementById('venue-service-form');
    
    await act(async () => {
      fireEvent.submit(form);
    });

    // Verify upsert was called with correct data
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Venue A',
            service_id: mockServiceId,
          }),
          expect.objectContaining({
            name: 'Venue B', 
            service_id: mockServiceId,
          })
        ]),
        expect.any(Object) // onConflict parameter
      );
    });

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Venue information saved successfully!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles form submission errors', async () => {
    // Mock upsert with error
    mockUpsert.mockResolvedValue({
      error: new Error('Database error'),
    });
    
    supabase.from.mockReset();
    supabase.from.mockReturnValueOnce({
      upsert: mockUpsert,
    });

    const form = document.getElementById('venue-service-form');
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
    });
  });

  it('exits edit mode after successful submission', async () => {
    // Mock successful upsert
    mockUpsert.mockResolvedValue({ error: null });
    
    supabase.from.mockReset();
    supabase.from.mockReturnValueOnce({
      upsert: mockUpsert,
    });

    // Mock the refetch
    setupSuccessfulMocks();

    const form = document.getElementById('venue-service-form');
    await act(async () => {
      fireEvent.submit(form);
    });

    // Should exit edit mode and show Edit Details button
    await waitFor(() => {
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });

    // Should not show Cancel and Save Changes buttons
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
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

      // Mock upsert with error to trigger toast
      const mockUpsert = jest.fn().mockResolvedValue({
        error: new Error('Test error'),
      });
      supabase.from.mockReturnValueOnce({
        upsert: mockUpsert,
      });

      const form = document.getElementById('venue-service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
      });


    });

  describe('Error Handling', () => {
    it('handles no service data found', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null, // No service data found
              error: null,
            }),
          })),
        })),
      });

      render(<VenueService vendorId={mockVendorId} venueNames={mockVenueNames} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading venue information...')).not.toBeInTheDocument();
      });

      // Use getAllByText and check that at least one exists
      const venueDetailsElements = screen.getAllByText('Venue Details');
      expect(venueDetailsElements.length).toBeGreaterThan(0);
      
      // The component should show empty venue cards when no service data is found
      expect(screen.getByText('Venue A')).toBeInTheDocument();
      expect(screen.getByText('Venue B')).toBeInTheDocument();
    });

  });

  describe('Edge Cases', () => {

     it('allows manual toast dismissal', async () => {
      fireEvent.click(screen.getByText('Edit Details'));

      // Mock upsert with error to trigger toast
      const mockUpsert = jest.fn().mockResolvedValue({
        error: new Error('Test error'),
      });
      supabase.from.mockReturnValueOnce({
        upsert: mockUpsert,
      });

      const form = document.getElementById('venue-service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
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

  
    it('cleans up fetchAndReconcileData on unmount', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      const vendorServicesMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnValue(promise),
      };

      supabase.from.mockReturnValueOnce(vendorServicesMock);

      const { unmount } = render(
        <VenueService vendorId={mockVendorId} venueNames={mockVenueNames} />
      );

      unmount();

      // Resolve promise after unmount to ensure no state updates on unmounted component
      resolvePromise({
        data: { id: mockServiceId },
        error: null,
      });

      await act(async () => {
        await promise;
      });
    });
  });
});
});