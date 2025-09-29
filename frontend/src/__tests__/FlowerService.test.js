import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlowerService from '../components/services/FlowerService';
import { supabase } from '../client';
import ReactMarkdown from 'react-markdown';

// Mock dependencies
jest.mock('../client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn(),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            then: jest.fn(cb => cb({ error: null }))
          }))
        }))
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'http://example.com/photo.jpg' }
        })),
        remove: jest.fn()
      }))
    },
    auth: {
      getUser: jest.fn()
    }
  }
}));

jest.mock('react-markdown', () => jest.fn(({ children }) => <div data-testid="react-markdown">{children}</div>));
jest.mock('react-icons/fa', () => ({
  FaCheckCircle: () => <div data-testid="check-icon">✓</div>,
  FaTimesCircle: () => <div data-testid="times-icon">×</div>,
  FaInfoCircle: () => <div data-testid="info-icon">i</div>
}));

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('FlowerService', () => {
  const mockVendorId = 'test-vendor-123';
  const defaultProps = {
    vendorId: mockVendorId,
    isReadOnly: false
  };

  const mockFlowerData = {
    service_description: 'Test flower service description',
    arrangement_types: 'Bouquets, Centerpieces',
    flower_sourcing: 'Local, Seasonal',
    event_types: 'Weddings, Corporate',
    base_rate: 'R250 starting',
    additional_rates: 'Packages available',
    photos: [
      { url: 'http://example.com/photo1.jpg', path: 'path1' },
      { url: 'http://example.com/photo2.jpg', path: 'path2' }
    ]
  };

  let mockSingle;
  let mockUpsert;
  let mockUpload;
  let mockRemove;
  let mockGetUser;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockConfirm.mockReturnValue(true);
    
    // Setup fresh mocks for each test
    mockSingle = jest.fn();
    mockUpsert = jest.fn();
    mockUpload = jest.fn();
    mockRemove = jest.fn();
    mockGetUser = jest.fn();

    supabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle
          }))
        }))
      })),
      upsert: mockUpsert,
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            then: jest.fn(cb => cb({ error: null }))
          }))
        }))
      }))
    });

    supabase.storage.from.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: 'http://example.com/new-photo.jpg' }
      })),
      remove: mockRemove
    });

    supabase.auth.getUser = mockGetUser;
  });

  // Helper function to render component and wait for initial load
  const renderComponent = async (props = defaultProps) => {
    let utils;
    await act(async () => {
      utils = render(<FlowerService {...props} />);
    });
    return utils;
  };

  // Helper to wait for loading to complete
  const waitForLoadingComplete = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading flower services...')).not.toBeInTheDocument();
    });
  };

  describe('Component Rendering', () => {
    it('renders loading state initially', () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null
      });

      render(<FlowerService {...defaultProps} />);
      expect(screen.getByText('Loading flower services...')).toBeInTheDocument();
    });

    it('renders with data in view mode', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();

      await waitForLoadingComplete();

      expect(screen.getByText('Flower Service')).toBeInTheDocument();
      expect(screen.getByText('Edit Service')).toBeInTheDocument();
      expect(screen.getByText('Service Description')).toBeInTheDocument();
      expect(screen.getByText('Arrangement Types & Specialties')).toBeInTheDocument();
      expect(screen.getByText('Flower Sourcing & Availability')).toBeInTheDocument();
      expect(screen.getByText('Event Types')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      
      const markdownElements = screen.getAllByTestId('react-markdown');
      expect(markdownElements[0]).toHaveTextContent(mockFlowerData.service_description);
    });

    it('renders in read-only mode without edit button', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent({ ...defaultProps, isReadOnly: true });

      await waitForLoadingComplete();

      expect(screen.queryByText('Edit Service')).not.toBeInTheDocument();
    });

    it('renders empty state when no data', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      await renderComponent();

      await waitForLoadingComplete();

      expect(screen.getByText('No description provided.')).toBeInTheDocument();
      expect(screen.getByText('No specialties listed.')).toBeInTheDocument();
      expect(screen.getByText('No sourcing information provided.')).toBeInTheDocument();
      expect(screen.getByText('No event types specified.')).toBeInTheDocument();
      expect(screen.getByText('No base rate specified.')).toBeInTheDocument();
    });

    it('renders additional rates section only when data exists', async () => {
      const dataWithoutAdditionalRates = {
        ...mockFlowerData,
        additional_rates: ''
      };
      
      mockSingle.mockResolvedValue({
        data: dataWithoutAdditionalRates,
        error: null
      });

      await renderComponent();

      await waitForLoadingComplete();

      expect(screen.queryByText('Additional Rates & Packages')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    beforeEach(async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });
    });

    it('enters edit mode when edit button is clicked', () => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe your floral design services...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Bouquets, Centerpieces, Installations...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Local, Seasonal, Imported...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Weddings, Corporate Events...')).toBeInTheDocument();
    });

    it('exits edit mode when cancel is clicked', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Cancel'));
      });

      await waitFor(() => {
        expect(screen.getByText('Edit Service')).toBeInTheDocument();
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      });
    });

    it('refetches data when cancel is clicked', async () => {
      mockSingle.mockClear(); // Clear initial fetch call

      await act(async () => {
        fireEvent.click(screen.getByText('Cancel'));
      });

      await waitFor(() => {
        expect(mockSingle).toHaveBeenCalledTimes(1); // Should refetch data
      });
    });

    it('updates form data when text is changed', async () => {
      const descriptionTextarea = screen.getByPlaceholderText('Describe your floral design services...');
      
      await act(async () => {
        fireEvent.change(descriptionTextarea, { 
          target: { value: 'Updated flower description' } 
        });
      });

      expect(descriptionTextarea.value).toBe('Updated flower description');
    });

    it('updates arrangement types when text is changed', async () => {
      const arrangementTextarea = screen.getByPlaceholderText('e.g., Bouquets, Centerpieces, Installations...');
      
      await act(async () => {
        fireEvent.change(arrangementTextarea, { 
          target: { value: 'Updated arrangements' } 
        });
      });

      expect(arrangementTextarea.value).toBe('Updated arrangements');
    });
  });

  describe('SimpleTextEditor Integration', () => {
    it('handles formatting buttons in flower service context', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const boldButtons = screen.getAllByText('B');
      const italicButtons = screen.getAllByText('I');
      const bulletButtons = screen.getAllByText('•');
      const numberButtons = screen.getAllByText('1.');

      expect(boldButtons.length).toBeGreaterThan(0);
      expect(italicButtons.length).toBeGreaterThan(0);
      expect(bulletButtons.length).toBeGreaterThan(0);
      expect(numberButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Operations', () => {
    it('fetches flower data on mount with correct parameters', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('vendor_services');
        expect(mockSingle).toHaveBeenCalled();
      });
    });

    it('handles fetch error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' }
      });

      await renderComponent();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching flower data:', expect.any(Object));
      });

      consoleSpy.mockRestore();
    });

    it('saves form data successfully with flower service type', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpsert.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const form = document.getElementById('service-form');
      
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            service_type: 'flowers',
            vendor_id: mockVendorId
          }),
          { onConflict: 'vendor_id, service_type' }
        );
      });
    });

    it('handles save error and shows appropriate message', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpsert.mockResolvedValue({ 
        error: { message: 'Save failed' } 
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const form = document.getElementById('service-form');
      
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error saving flower service:', expect.any(Object));
      });

      consoleSpy.mockRestore();
    });

    it('refetches data after successful save', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpsert.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const form = document.getElementById('service-form');
      
      mockSingle.mockClear(); // Clear initial fetch
      
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockSingle).toHaveBeenCalledTimes(1); // Should refetch after save
      });
    });
  });

  describe('Photo Management', () => {
    it('disphotos flower arrangement photos in gallery', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      const images = screen.getAllByAltText('Floral arrangement');
      expect(images).toHaveLength(2);
    });

    it('shows no photos message when empty', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockFlowerData, photos: [] },
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      expect(screen.getByText('No arrangement photos added yet')).toBeInTheDocument();
    });

    it('handles flower photo upload with correct file path', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user123' } }
      });

      mockUpload.mockResolvedValue({ error: null });
      mockUpsert.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const file = new File(['dummy content'], 'flower-arrangement.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(
          expect.stringContaining('user123/flowers/'),
          file
        );
      });
    });

    it('handles flower photo upload error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpload.mockResolvedValue({
        error: { message: 'Upload failed' }
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error uploading photo:', expect.any(Object));
      });

      consoleSpy.mockRestore();
    });

    it('handles flower photo deletion', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockRemove.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const deleteButtons = screen.getAllByText('×');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(mockRemove).toHaveBeenCalledWith(['path1']);
      });
    });

    it('cancels flower photo deletion when user declines confirmation', async () => {
      mockConfirm.mockReturnValue(false);
      
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const deleteButtons = screen.getAllByText('×');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('shows uploading state during photo upload', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user123' } }
      });

      // Don't resolve upload immediately to test loading state
      mockUpload.mockImplementation(() => new Promise(() => {}));

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  describe('Toast Notifications', () => {
    it('shows success toast on flower service save', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpsert.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });
      
      const form = document.getElementById('service-form');

      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText('Flower service saved successfully!')).toBeInTheDocument();
      });
    });

    it('shows error toast on save failure', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpsert.mockResolvedValue({ 
        error: { message: 'Database error' } 
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });
      
      const form = document.getElementById('service-form');

      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to save flower service: Database error')).toBeInTheDocument();
      });
    });

    it('closes toast when close button is clicked', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpsert.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });
      
      const form = document.getElementById('service-form');

      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        const closeButton = screen.getByText('×').closest('button');
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Flower service saved successfully!')).not.toBeInTheDocument();
      });
    });

    it('auto-closes toast after timeout', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockUpsert.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });
      
      const form = document.getElementById('service-form');

      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText('Flower service saved successfully!')).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Flower service saved successfully!')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles file validation errors for large flower photos', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large-flower.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('File size too large. Maximum is 5MB.')).toBeInTheDocument();
      });
    });

    it('handles invalid file type for flower photos', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const invalidFile = new File(['dummy'], 'flower-arrangement.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Please upload an image file')).toBeInTheDocument();
      });
    });

    it('handles photo deletion error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockRemove.mockResolvedValue({
        error: { message: 'Delete failed' }
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const deleteButtons = screen.getAllByText('×');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error deleting photo:', expect.any(Object));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Form Validation and Submission', () => {
    it('submits form with all flower service fields', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      mockUpsert.mockResolvedValue({ error: null });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const form = document.getElementById('service-form');
      
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            service_type: 'flowers',
            vendor_id: mockVendorId,
            service_description: '',
            arrangement_types: '',
            flower_sourcing: '',
            event_types: '',
            base_rate: '',
            additional_rates: ''
          }),
          { onConflict: 'vendor_id, service_type' }
        );
      });
    });

    it('handles photo upload without user authentication', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      mockGetUser.mockResolvedValue({
        data: { user: null }
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to upload photo. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('cleans up toast timeout on unmount', async () => {
      mockSingle.mockResolvedValue({
        data: mockFlowerData,
        error: null
      });

      const { unmount } = await renderComponent();
      await waitForLoadingComplete();

      unmount();

      // Should not throw errors related to cleanup
      expect(() => {
        jest.advanceTimersByTime(10000);
      }).not.toThrow();
    });
  });
});