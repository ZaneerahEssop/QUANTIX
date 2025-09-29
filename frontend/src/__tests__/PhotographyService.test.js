import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotographyService from '../components/services/PhotographyService';
import { supabase } from '../client';

// Mock dependencies
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          maybeSingle: jest.fn(),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        list: jest.fn(),
        remove: jest.fn(),
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

jest.mock('react-icons/fa', () => ({
  FaCheckCircle: () => <div data-testid="check-icon">✓</div>,
  FaTimesCircle: () => <div data-testid="times-icon">×</div>,
  FaInfoCircle: () => <div data-testid="info-icon">i</div>,
}));

// Mock CSS import
jest.mock('./PhotographyService.css', () => ({}));

describe('PhotographyService', () => {
  const mockVendorId = 'vendor-123';
  const mockUserId = 'user-123';

  const mockServiceData = {
    id: 'service-123',
    vendor_id: mockVendorId,
    service_type: 'photography',
    service_description: 'Professional photography services',
    camera_specs: 'Canon EOS R5, 50mm f/1.8',
    base_rate: '$100 per hour',
    additional_rates: 'Additional $50 for prints',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockPhotos = [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
    'https://example.com/photo3.jpg',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mocks
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockServiceData, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockServiceData, error: null }),
      insert: jest.fn().mockResolvedValue({ data: [mockServiceData], error: null }),
      update: jest.fn().mockResolvedValue({ data: [mockServiceData], error: null }),
    });

    // Fix the storage mock structure with proper URL generation
    const storageMock = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockImplementation((filePath) => ({
        data: { 
          publicUrl: `https://xkwmdmsdshdplryqydue.supabase.co/storage/v1/object/public/portfolio-photos/${filePath}?t=${Date.now()}`
        }
      })),
      list: jest.fn().mockResolvedValue({ 
        data: [
          { name: 'photo1.jpg' },
          { name: 'photo2.jpg' },
        ], 
        error: null 
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };

    supabase.storage.from.mockReturnValue(storageMock);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Initial Loading and Setup', () => {
    it('shows loading state initially', () => {
      render(<PhotographyService vendorId={mockVendorId} />);
      expect(screen.getByText('Loading photography services...')).toBeInTheDocument();
    });

    it('fetches data on mount', async () => {
      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('vendor_services');
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
    });

    it('handles no existing service data', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue({ code: 'PGRST116' }),
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Read-only Mode', () => {
    beforeEach(async () => {
      render(<PhotographyService vendorId={mockVendorId} isReadOnly={true} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
    });

    it('displays service information in read-only mode', () => {
      expect(screen.getByText('Photography Services')).toBeInTheDocument();
      expect(screen.getByText('Service Description')).toBeInTheDocument();
      expect(screen.getByText('Camera Equipment & Specifications')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    it('does not show edit button in read-only mode', () => {
      expect(screen.queryByText('Edit Services')).not.toBeInTheDocument();
    });

    it('displays ReactMarkdown for formatted content', () => {
      const markdownElements = screen.getAllByTestId('react-markdown');
      expect(markdownElements.length).toBeGreaterThan(0);
    });

    it('shows portfolio gallery', () => {
      expect(screen.getByText('Portfolio Gallery')).toBeInTheDocument();
    });

    it('shows "No portfolio photos" when empty', async () => {
      supabase.storage.from().list.mockResolvedValue({ data: [], error: null });
      
      render(<PhotographyService vendorId={mockVendorId} isReadOnly={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('No portfolio photos added yet')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    beforeEach(async () => {
      render(<PhotographyService vendorId={mockVendorId} isReadOnly={false} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Edit Services'));
    });

    it('enters edit mode when edit button is clicked', () => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('displays SimpleTextEditor components in edit mode', () => {
      const textareas = document.querySelectorAll('.simple-textarea');
      expect(textareas.length).toBe(4); // service_description, camera_specs, base_rate, additional_rates
    });

    it('handles form input changes', () => {
      const textareas = document.querySelectorAll('.simple-textarea');
      fireEvent.change(textareas[0], { target: { value: 'New description' } });
      expect(textareas[0].value).toBe('New description');
    });

    it('cancels editing and reverts changes', async () => {
      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Edit Services')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      render(<PhotographyService vendorId={mockVendorId} isReadOnly={false} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Edit Services'));
    });

    it('submits form successfully with update', async () => {
      const form = document.getElementById('service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(supabase.from().update).toHaveBeenCalled();
      });
    });

    it('submits form successfully with insert when no existing data', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        insert: jest.fn().mockResolvedValue({ data: [mockServiceData], error: null }),
      });

      const form = document.getElementById('service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(supabase.from().insert).toHaveBeenCalled();
      });
    });

    it('handles form submission errors', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockServiceData, error: null }),
        update: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      const form = document.getElementById('service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save changes/)).toBeInTheDocument();
      });
    });
  });

  describe('Photo Management', () => {
    beforeEach(async () => {
      // Mock successful photo loading with proper file structure
      supabase.storage.from().list.mockResolvedValue({ 
        data: [
          { name: 'photo1.jpg' },
          { name: 'photo2.jpg' },
        ], 
        error: null 
      });

      render(<PhotographyService vendorId={mockVendorId} isReadOnly={false} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Edit Services'));
    });

    it('handles photo upload', async () => {
      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(supabase.storage.from().upload).toHaveBeenCalled();
      });
    });

    it('shows error for non-image file upload', async () => {
      const file = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Please upload an image file')).toBeInTheDocument();
      });
    });

    it('handles photo upload errors', async () => {
      supabase.storage.from().upload.mockResolvedValueOnce({ 
        error: { message: 'Upload failed' } 
      });

      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Error uploading photo/)).toBeInTheDocument();
      });
    });

    it('handles photo deletion', async () => {
      // Mock confirm to return true
      window.confirm = jest.fn(() => true);

      // Wait for photos to load
      await waitFor(() => {
        expect(screen.getAllByAltText(/Portfolio/).length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByLabelText('Delete photo');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(supabase.storage.from().remove).toHaveBeenCalledWith(['user-123/photo1.jpg']);
      });
    });

    it('cancels photo deletion when user declines confirmation', async () => {
      window.confirm = jest.fn(() => false);

      await waitFor(() => {
        expect(screen.getAllByAltText(/Portfolio/).length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByLabelText('Delete photo');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(supabase.storage.from().remove).not.toHaveBeenCalled();
    });

    it('handles photo deletion errors', async () => {
      window.confirm = jest.fn(() => true);
      supabase.storage.from().remove.mockResolvedValueOnce({ 
        error: { message: 'Delete failed' } 
      });

      await waitFor(() => {
        expect(screen.getAllByAltText(/Portfolio/).length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByLabelText('Delete photo');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText(/Error deleting photo/)).toBeInTheDocument();
      });
    });
  });

  describe('Toast Notifications', () => {
    beforeEach(async () => {
      render(<PhotographyService vendorId={mockVendorId} isReadOnly={false} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
    });

    it('shows and auto-hides toast notifications', async () => {
      // Trigger a toast by submitting with error
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockServiceData, error: null }),
        update: jest.fn().mockResolvedValue({ data: null, error: { message: 'Test error' } }),
      });

      fireEvent.click(screen.getByText('Edit Services'));
      const form = document.getElementById('service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save changes/)).toBeInTheDocument();
      });

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.queryByText(/Failed to save changes/)).not.toBeInTheDocument();
    });

    it('allows manual toast dismissal', async () => {
      // Trigger a toast
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockServiceData, error: null }),
        update: jest.fn().mockResolvedValue({ data: null, error: { message: 'Test error' } }),
      });

      fireEvent.click(screen.getByText('Edit Services'));
      const form = document.getElementById('service-form');
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save changes/)).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close notification');
      fireEvent.click(closeButton);

      expect(screen.queryByText(/Failed to save changes/)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Fetch error')),
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(screen.getByText(/Error fetching photography data/)).toBeInTheDocument();
      });
    });

    it('handles no user authenticated for photos', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({ 
        data: { user: null }, 
        error: null 
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
    });

    it('handles photo fetch errors', async () => {
      supabase.storage.from().list.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Storage error' } 
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
    });
  });

  describe('SimpleTextEditor Component', () => {
    let textareas;
    let formatButtons;

    beforeEach(async () => {
      render(<PhotographyService vendorId={mockVendorId} isReadOnly={false} />);
      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Edit Services'));
      
      // Get the first textarea and its corresponding buttons
      textareas = document.querySelectorAll('.simple-textarea');
      formatButtons = document.querySelectorAll('.format-button');
    });

    it('applies bold formatting', () => {
      // Use the first textarea and bold button
      const textarea = textareas[0];
      const boldButton = formatButtons[0]; // First button is bold
      
      // Set some text and select it
      fireEvent.change(textarea, { target: { value: 'Test text' } });
      textarea.setSelectionRange(0, 4);
      fireEvent.click(boldButton);
      
      expect(textarea.value).toContain('**');
    });

    it('applies bullet list formatting', () => {
      const textarea = textareas[0];
      const bulletButton = formatButtons[1]; // Second button is bullet
      
      fireEvent.click(bulletButton);
      
      expect(textarea.value).toContain('- ');
    });

    it('applies numbered list formatting', () => {
      const textarea = textareas[0];
      const numberButton = formatButtons[2]; // Third button is numbered
      
      fireEvent.click(numberButton);
      
      expect(textarea.value).toContain('1. ');
    });

    it('handles tab key for indentation', () => {
      const textarea = textareas[0];
      
      // Clear the textarea first and set cursor position
      fireEvent.change(textarea, { target: { value: '' } });
      
      // Simulate tab key press at the beginning of empty text
      fireEvent.keyDown(textarea, { 
        key: 'Tab', 
        preventDefault: jest.fn()
      });
      
      // Should add spaces for indentation to empty textarea
      expect(textarea.value).toBe('  ');
    });

    it('handles shift+tab for outdentation', () => {
      const textarea = textareas[0];
      
      // First add some indentation
      fireEvent.change(textarea, { target: { value: '  Test' } });
      textarea.setSelectionRange(2, 2);
      fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true });
    });

    it('handles Ctrl+B keyboard shortcut', () => {
      const textarea = textareas[0];
      
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty form data', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue({ code: 'PGRST116' }),
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });

      // Should display default empty state messages
      expect(screen.getByText('No description provided')).toBeInTheDocument();
      expect(screen.getByText('No camera specifications provided')).toBeInTheDocument();
      expect(screen.getByText('No base rate specified.')).toBeInTheDocument();
    });

    it('handles null or undefined values in form data', async () => {
      const emptyServiceData = {
        ...mockServiceData,
        service_description: null,
        camera_specs: undefined,
        base_rate: '',
        additional_rates: null,
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: emptyServiceData, error: null }),
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });
    });

    it('handles image loading errors', async () => {
      // Mock photos to load successfully
      supabase.storage.from().list.mockResolvedValue({ 
        data: [{ name: 'photo1.jpg' }], 
        error: null 
      });

      render(<PhotographyService vendorId={mockVendorId} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading photography services...')).not.toBeInTheDocument();
      });

      const images = screen.getAllByAltText(/Portfolio/);
      fireEvent.error(images[0]);
    });

    it('cleans up timeouts on unmount', () => {
      const { unmount } = render(<PhotographyService vendorId={mockVendorId} />);
      
      unmount();

      // Should not throw any errors
      expect(() => {
        act(() => {
          jest.runOnlyPendingTimers();
        });
      }).not.toThrow();
    });
  });

  describe('Photo Storage Pagination', () => {
    it('handles pagination when fetching photos', async () => {
      // Mock multiple pages of photos
      let callCount = 0;
      supabase.storage.from().list.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: Array.from({ length: 100 }, (_, i) => ({ name: `photo${i}.jpg` })),
            error: null,
          });
        } else {
          return Promise.resolve({
            data: Array.from({ length: 50 }, (_, i) => ({ name: `photo${i + 100}.jpg` })),
            error: null,
          });
        }
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        expect(supabase.storage.from().list).toHaveBeenCalledTimes(2);
      });
    });

    it('stops pagination when no more files', async () => {
      supabase.storage.from().list.mockResolvedValue({
        data: Array.from({ length: 50 }, (_, i) => ({ name: `photo${i}.jpg` })),
        error: null,
      });

      render(<PhotographyService vendorId={mockVendorId} />);

      await waitFor(() => {
        // Should only be called once since we got fewer than limit
        expect(supabase.storage.from().list).toHaveBeenCalledTimes(1);
      });
    });
  });
});