import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CateringService from '../components/services/CateringService';
import { supabase } from '../client';

// --- MOCKS ---
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    remove: jest.fn(),
    getPublicUrl: jest.fn(),
  },
};
jest.mock('../client', () => ({ supabase: mockSupabase }));

jest.mock('react-markdown', () => ({ children }) => <>{children}</>);
jest.mock('react-icons/fa', () => ({
  FaCheckCircle: () => <span>Success</span>,
  FaTimesCircle: () => <span>Error</span>,
  FaInfoCircle: () => <span>Info</span>,
}));

// --- MOCK DATA ---
const mockVendorId = 'test-vendor-123';
const mockUserId = 'test-user-456';

const mockServiceData = {
  id: 1,
  vendor_id: mockVendorId,
  service_type: 'catering',
  service_description: 'Delicious food here',
  catering_types: 'Buffet',
  menu_options: 'Chicken or Fish',
  dietary_options: 'Vegan available',
  base_rate: '$50/person',
  additional_rates: 'Bar service extra',
  photos: [{ url: 'http://example.com/photo1.jpg', path: `${mockUserId}/catering/photo1.jpg` }],
};

describe('CateringService Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
    mockSupabase.storage.from.mockReturnValue(mockSupabase.storage);
    mockSupabase.storage.getPublicUrl.mockReturnValue({ data: { publicUrl: 'http://example.com/new_photo.jpg' } });
  });

  describe('View Mode', () => {
    test('shows loading state initially and then displays fetched data', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockServiceData, error: null });
      render(<CateringService vendorId={mockVendorId} isReadOnly={false} />);
      expect(screen.getByText(/Loading catering services/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Delicious food here')).toBeInTheDocument();
        expect(screen.getByText('Buffet')).toBeInTheDocument();
      });
    });

    test('displays placeholder text when no data is available', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      render(<CateringService vendorId={mockVendorId} isReadOnly={false} />);
      await waitFor(() => {
        expect(screen.getByText('No description provided.')).toBeInTheDocument();
      });
    });

    test('hides Edit Service button when isReadOnly is true', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockServiceData, error: null });
      render(<CateringService vendorId={mockVendorId} isReadOnly={true} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Edit Service/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    beforeEach(async () => {
      mockSupabase.single.mockResolvedValue({ data: mockServiceData, error: null });
      render(<CateringService vendorId={mockVendorId} isReadOnly={false} />);
      await screen.findByText('Delicious food here');
      fireEvent.click(screen.getByRole('button', { name: /Edit Service/i }));
    });

    test('switches to an editable form when Edit is clicked', () => {
      expect(screen.getByPlaceholderText(/Describe your catering service/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    test('updates form state on input change', async () => {
      const descriptionEditor = screen.getByPlaceholderText(/Describe your catering service/i);
      await userEvent.clear(descriptionEditor);
      await userEvent.type(descriptionEditor, 'Brand new text');
      expect(descriptionEditor.value).toBe('Brand new text');
    });

    test('saves updated data and shows success toast', async () => {
      // Mock the check for an existing service
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 1 }, error: null });
      // Mock the successful update call
      mockSupabase.update.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({ data: mockServiceData, error: null });

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.any(Object));
        expect(screen.getByText('Catering service saved successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Photo Management', () => {
    beforeEach(async () => {
      mockSupabase.single.mockResolvedValue({ data: mockServiceData, error: null });
      render(<CateringService vendorId={mockVendorId} isReadOnly={false} />);
      await screen.findByRole('img', { name: /Catering gallery 1/i });
      fireEvent.click(screen.getByRole('button', { name: /Edit Service/i }));
    });
    
    test('handles photo upload successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockServiceData, error: null }); 
      mockSupabase.storage.upload.mockResolvedValueOnce({ error: null });
      mockSupabase.update.mockResolvedValueOnce({ error: null });

      const file = new File(['(⌐□_□)'], 'photo.png', { type: 'image/png' });
      const uploader = screen.getByLabelText(/Add Photo to Gallery/i);
      
      await userEvent.upload(uploader, file);

      await waitFor(() => {
        expect(mockSupabase.storage.upload).toHaveBeenCalled();
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            photos: expect.arrayContaining([
              expect.objectContaining({ url: 'http://example.com/new_photo.jpg' })
            ])
          })
        );
        expect(screen.getByText('Photo uploaded successfully!')).toBeInTheDocument();
      });
    });

    test('handles photo deletion successfully', async () => {
      window.confirm = jest.fn(() => true);
      mockSupabase.single.mockResolvedValueOnce({ data: {id: 1}, error: null });
      mockSupabase.storage.remove.mockResolvedValueOnce({ data: {}, error: null });
      mockSupabase.update.mockResolvedValueOnce({ error: null });

      const deleteButton = screen.getByRole('button', { name: /Delete photo/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(mockSupabase.storage.remove).toHaveBeenCalledWith([`${mockUserId}/catering/photo1.jpg`]);
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ photos: [] }));
        expect(screen.getByText('Photo deleted successfully!')).toBeInTheDocument();
      });
    });
  });
});