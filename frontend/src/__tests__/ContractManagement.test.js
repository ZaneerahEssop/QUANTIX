import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContractManagement from '../components/ContractManagement';

// Mock dependencies
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

const mockJsPDF = jest.fn().mockImplementation(() => ({
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  text: jest.fn(),
  addImage: jest.fn(),
  save: jest.fn(),
  internal: {
    pageSize: {
      getWidth: jest.fn().mockReturnValue(595.28),
      getHeight: jest.fn().mockReturnValue(841.89),
    }
  }
}));

jest.mock('jspdf', () => ({
  __esModule: true,
  default: mockJsPDF
}));

const mockHtml2Canvas = jest.fn().mockResolvedValue({
  toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mocked')
});

jest.mock('html2canvas', () => mockHtml2Canvas);

jest.mock('react-markdown', () => {
  return {
    __esModule: true,
    default: ({ children }) => <div data-testid="react-markdown">{children}</div>,
  };
});

jest.mock('react-icons/fa', () => ({
  FaSignature: () => <span data-testid="fa-signature">✍️</span>,
  FaExclamationTriangle: () => <span data-testid="fa-exclamation">⚠️</span>,
  FaCheckCircle: () => <span data-testid="fa-check">✓</span>,
  FaEdit: () => <span data-testid="fa-edit">✏️</span>,
  FaFileDownload: () => <span data-testid="fa-download">📥</span>,
  FaTimes: () => <span data-testid="fa-times">×</span>,
  FaSave: () => <span data-testid="fa-save">💾</span>,
  FaPlus: () => <span data-testid="fa-plus">+</span>,
  FaTrash: () => <span data-testid="fa-trash">🗑️</span>,
  FaClock: () => <span data-testid="fa-clock">⏰</span>,
}));

global.fetch = jest.fn();
global.alert = jest.fn();
process.env.REACT_APP_API_URL = 'http://localhost:5000';
jest.mock('../styling/eventDetails.css', () => ({}));

describe('ContractManagement', () => {
  const mockEventData = {
    event_id: 'event-123',
    name: 'Test Wedding',
    start_time: '2025-10-01T14:00:00Z',
    planner_name: 'Test Planner'
  };

  const mockVendor = {
    vendor_id: 'vendor-123',
    business_name: 'Test Vendor',
    service_type: 'photography'
  };

  const mockCurrentUserPlanner = { id: 'user-123', name: 'Test Planner', role: 'planner' };
  const mockCurrentUserVendor = { id: 'vendor-123', name: 'Test Vendor', role: 'vendor' };

  const mockContract = {
    id: 'contract-123',
    content: '# Service Agreement\n**Event:** Test Wedding\n**Date:** 10/1/2025\n- **Hours of Coverage:** 8 hours\n- **Total Fee:** R15000',
    status: 'pending_planner_signature',
    planner_signature: null,
    vendor_signature: null,
    revisions: []
  };

  const mockSignedContract = { ...mockContract, status: 'active', planner_signature: 'Test Planner', vendor_signature: 'Test Vendor', planner_signed_at: '2025-01-01T00:00:00Z', vendor_signed_at: '2025-01-01T00:00:00Z' };
  const mockPlannerSignedContract = { ...mockContract, status: 'pending_vendor_signature', planner_signature: 'Test Planner', planner_signed_at: '2025-01-01T00:00:00Z' };
  const mockContractWithRevisions = { ...mockContract, revisions: [{ requested_by: 'Test Planner', comment: 'Please clarify payment terms', timestamp: '2025-01-01T10:00:00Z' }] };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockContract) }));
  });

  const renderContractManagement = (props = {}) => {
    const defaultProps = {
      eventData: mockEventData,
      currentUser: mockCurrentUserPlanner,
      vendor: mockVendor,
      isVendorAccepted: true,
      onBack: jest.fn(),
      ...props
    };
    return render(<ContractManagement {...defaultProps} />);
  };

  test('renders loading state initially', async () => { /* ... */ });
  test('displays contract content when loaded', async () => { /* ... */ });
  test('handles back button click', async () => { /* ... */ });
  test('shows edit button for vendor when contract is editable', async () => { /* ... */ });
  test('does not show edit button for planner', async () => { /* ... */ });

  test('enters edit mode when edit button is clicked', async () => {
    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserVendor });
    });
    await waitFor(() => {
      expect(screen.getByText('Edit Contract')).toBeInTheDocument();
    });
    const editButton = screen.getByText('Edit Contract');
    await act(async () => {
      fireEvent.click(editButton);
    });
    expect(screen.getByText('Edit Contract Details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15000')).toBeInTheDocument(); 
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Contract')).toBeInTheDocument();
  });

  test('handles field changes in edit mode', async () => {
    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserVendor });
    });
    await waitFor(() => {
      expect(screen.getByText('Edit Contract')).toBeInTheDocument();
    });
    const editButton = screen.getByText('Edit Contract');
    await act(async () => {
      fireEvent.click(editButton);
    });
    const totalFeeInput = screen.getByDisplayValue('15000');
    await act(async () => {
      fireEvent.change(totalFeeInput, { target: { value: '20000' } });
    });
    expect(totalFeeInput.value).toBe('20000');
  });

  describe('Contract Form Validation', () => {
    beforeEach(async () => {
      await act(async () => {
        renderContractManagement({ currentUser: mockCurrentUserVendor });
      });
      await waitFor(() => {
        expect(screen.getByText('Edit Contract')).toBeInTheDocument();
      });
      const editButton = screen.getByText('Edit Contract');
      await act(async () => {
        fireEvent.click(editButton);
      });
    });

    test('only allows numbers in Total Fee field', async () => {
      const totalFeeInput = screen.getByPlaceholderText('e.g., 15000');
      
      await act(async () => {
        fireEvent.change(totalFeeInput, { target: { value: 'abc' } });
      });
      expect(totalFeeInput.value).toBe('');

      await act(async () => {
        fireEvent.change(totalFeeInput, { target: { value: '123' } });
      });
      expect(totalFeeInput.value).toBe('123');

      await act(async () => {
        fireEvent.change(totalFeeInput, { target: { value: '123xyz' } });
      });
      expect(totalFeeInput.value).toBe('123');
    });

    test('does not allow Total Fee over 1,000,000', async () => {
      const totalFeeInput = screen.getByPlaceholderText('e.g., 15000');
      
      await act(async () => {
        fireEvent.change(totalFeeInput, { target: { value: '999999' } });
      });
      expect(totalFeeInput.value).toBe('999999');

      await act(async () => {
        fireEvent.change(totalFeeInput, { target: { value: '1000001' } });
      });
      expect(totalFeeInput.value).toBe('999999');
    });

    test('only allows numbers in Hours of Coverage field', async () => {
        const hoursInput = screen.getByPlaceholderText('e.g., 8');

        await act(async () => {
            fireEvent.change(hoursInput, { target: { value: 'abc' } });
        });
        expect(hoursInput.value).toBe('');
  
        await act(async () => {
            fireEvent.change(hoursInput, { target: { value: '12' } });
        });
        expect(hoursInput.value).toBe('12');
  
        await act(async () => {
            fireEvent.change(hoursInput, { target: { value: '12xyz' } });
        });
        expect(hoursInput.value).toBe('12');
    });

    test('does not allow Hours of Coverage over 48', async () => {
        const hoursInput = screen.getByPlaceholderText('e.g., 8');

        await act(async () => {
            fireEvent.change(hoursInput, { target: { value: '48' } });
        });
        expect(hoursInput.value).toBe('48');
  
        await act(async () => {
            fireEvent.change(hoursInput, { target: { value: '49' } });
        });
        expect(hoursInput.value).toBe('48');
    });
  });
  
  test('handles custom field operations', async () => { /* ... */ });
  test('saves contract successfully', async () => { /* ... */ });
  test('handles contract signing for planner', async () => { /* ... */ });
  test('shows alert when signing without name', async () => { /* ... */ });
  test('handles revision requests', async () => { /* ... */ });
  test('does not show revision form for planner after they have signed', async () => { /* ... */ });
  test('displays revision history', async () => { /* ... */ });
  test('shows status banners correctly', async () => { /* ... */ });
  test('handles fetch errors gracefully', async () => { /* ... */ });
  test('cancels edit mode', async () => { /* ... */ });
  test('displays different service type fields', async () => { /* ... */ });
  test('handles empty contract state', async () => { /* ... */ });
});