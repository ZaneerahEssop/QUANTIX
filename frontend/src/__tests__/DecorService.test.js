import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DecorService from '../components/services/DecorService';
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

describe('DecorService', () => {
  const mockVendorId = 'test-vendor-123';
  const defaultProps = {
    vendorId: mockVendorId,
    isReadOnly: false
  };

  const mockDecorData = {
    service_description: 'Test service description',
    decor_styles: 'Modern, Rustic',
    services_offered: 'Full design, Setup',
    rental_inventory: 'Chairs, Tables',
    base_rate: 'R5000 starting',
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
      utils = render(<DecorService {...props} />);
    });
    return utils;
  };

  // Helper to wait for loading to complete
  const waitForLoadingComplete = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading decor services...')).not.toBeInTheDocument();
    });
  };

  describe('Component Rendering', () => {
    it('renders loading state initially', () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null
      });

      render(<DecorService {...defaultProps} />);
      expect(screen.getByText('Loading decor services...')).toBeInTheDocument();
    });

    it('renders with data in view mode', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
        error: null
      });

      await renderComponent();

      await waitForLoadingComplete();

      expect(screen.getByText('Decor Service')).toBeInTheDocument();
      expect(screen.getByText('Edit Service')).toBeInTheDocument();
      
      const markdownElements = screen.getAllByTestId('react-markdown');
      expect(markdownElements[0]).toHaveTextContent(mockDecorData.service_description);
    });

    it('renders in read-only mode without edit button', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
      expect(screen.getByText('No styles listed.')).toBeInTheDocument();
      expect(screen.getByText('No services listed.')).toBeInTheDocument();
      expect(screen.getByText('No inventory information provided.')).toBeInTheDocument();
      expect(screen.getByText('No base rate specified.')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    beforeEach(async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
      expect(screen.getByPlaceholderText('Describe your decor and styling services...')).toBeInTheDocument();
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

    it('updates form data when text is changed', async () => {
      const descriptionTextarea = screen.getByPlaceholderText('Describe your decor and styling services...');
      
      await act(async () => {
        fireEvent.change(descriptionTextarea, { 
          target: { value: 'Updated description' } 
        });
      });

      expect(descriptionTextarea.value).toBe('Updated description');
    });
  });

  describe('SimpleTextEditor', () => {
    it('handles formatting buttons', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
    it('fetches decor data on mount', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
        error: null
      });

      await renderComponent();

      await waitFor(() => {
        expect(mockSingle).toHaveBeenCalled();
      });
    });

    it('handles fetch error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' }
      });

      await renderComponent();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching decor data:', expect.any(Object));
      });

      consoleSpy.mockRestore();
    });

    it('saves form data successfully', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
        expect(mockUpsert).toHaveBeenCalled();
      });
    });

    it('handles save error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
        expect(consoleSpy).toHaveBeenCalledWith('Error saving decor service:', expect.any(Object));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Photo Management', () => {
    it('displays photos in gallery', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      const images = screen.getAllByAltText('Decor setup');
      expect(images).toHaveLength(2);
    });

    it('shows no photos message when empty', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockDecorData, photos: [] },
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      expect(screen.getByText('No decor photos added yet')).toBeInTheDocument();
    });

    it('handles photo upload', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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

      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalled();
      });
    });

    it('handles photo upload error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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

    it('handles photo deletion', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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

    it('cancels photo deletion when user declines confirmation', async () => {
      mockConfirm.mockReturnValue(false);
      
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
  });

  describe('Toast Notifications', () => {
    it('shows success toast on save', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
        expect(screen.getByText('Decor service saved successfully!')).toBeInTheDocument();
      });
    });

    it('closes toast when close button is clicked', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
        expect(screen.queryByText('Decor service saved successfully!')).not.toBeInTheDocument();
      });
    });

    it('auto-closes toast after timeout', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
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
        expect(screen.getByText('Decor service saved successfully!')).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Decor service saved successfully!')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles file validation errors for large files', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('File size too large. Maximum is 5MB.')).toBeInTheDocument();
      });
    });

    it('handles invalid file type', async () => {
      mockSingle.mockResolvedValue({
        data: mockDecorData,
        error: null
      });

      await renderComponent();
      await waitForLoadingComplete();

      await act(async () => {
        fireEvent.click(screen.getByText('Edit Service'));
      });

      const invalidFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Please upload an image file')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('submits form with all required fields', async () => {
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
        expect(mockUpsert).toHaveBeenCalled();
      });
    });
  });
});