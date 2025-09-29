import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContractManagement from '../components/ContractManagement';
import { supabase } from '../client';

// Mock dependencies
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock jsPDF with proper implementation
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

// Mock html2canvas as default export
const mockHtml2Canvas = jest.fn().mockResolvedValue({
  toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mocked')
});

jest.mock('html2canvas', () => mockHtml2Canvas);

// Mock react-markdown
jest.mock('react-markdown', () => {
  return {
    __esModule: true,
    default: ({ children }) => <div data-testid="react-markdown">{children}</div>,
  };
});

// Mock react-icons
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
}));

// Mock global objects
global.fetch = jest.fn();
global.alert = jest.fn();

// Mock environment variable
process.env.REACT_APP_API_URL = 'http://localhost:5000';

// Mock CSS
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

  const mockCurrentUserPlanner = {
    id: 'user-123',
    name: 'Test Planner',
    role: 'planner'
  };

  const mockCurrentUserVendor = {
    id: 'vendor-123',
    name: 'Test Vendor',
    role: 'vendor'
  };

  const mockContract = {
    id: 'contract-123',
    content: '# Service Agreement\n**Event:** Test Wedding\n**Date:** 10/1/2025\n- **Hours of Coverage:** 8 hours\n- **Total Fee:** R15000',
    status: 'pending_planner_signature',
    planner_signature: null,
    vendor_signature: null,
    revisions: []
  };

  const mockSignedContract = {
    ...mockContract,
    status: 'active',
    planner_signature: 'Test Planner',
    vendor_signature: 'Test Vendor',
    planner_signed_at: '2025-01-01T00:00:00Z',
    vendor_signed_at: '2025-01-01T00:00:00Z'
  };

  const mockContractWithRevisions = {
    ...mockContract,
    revisions: [
      {
        requested_by: 'Test Planner',
        comment: 'Please clarify payment terms',
        timestamp: '2025-01-01T10:00:00Z'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockImplementation(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockContract) 
      })
    );
  });

  // Helper function to render component with different props
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

  test('renders loading state initially', async () => {
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = () => resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockContract) 
      });
    });

    global.fetch.mockImplementationOnce(() => fetchPromise);

    renderContractManagement();

    expect(screen.getByText('Loading contract...')).toBeInTheDocument();

    await act(async () => {
      resolveFetch();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading contract...')).not.toBeInTheDocument();
    });
  });

  test('displays contract content when loaded', async () => {
    await act(async () => {
      renderContractManagement();
    });

    await waitFor(() => {
      expect(screen.getByText('Contract: Test Vendor')).toBeInTheDocument();
    });

    expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
    
    // Use more flexible text matching for the back button
    expect(screen.getByText(/Back to Vendors/i)).toBeInTheDocument();
    expect(screen.getByText('Export as PDF')).toBeInTheDocument();
  });

  test('handles back button click', async () => {
    const mockOnBack = jest.fn();
    
    await act(async () => {
      renderContractManagement({ onBack: mockOnBack });
    });

    await waitFor(() => {
      expect(screen.getByText(/Back to Vendors/i)).toBeInTheDocument();
    });

    // Use regex to match the text with the arrow character
    const backButton = screen.getByText(/Back to Vendors/i);
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  test('shows edit button for vendor when contract is editable', async () => {
    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserVendor });
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Contract')).toBeInTheDocument();
    });
  });

  test('does not show edit button for planner', async () => {
    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserPlanner });
    });

    await waitFor(() => {
      expect(screen.getByText(/Back to Vendors/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Edit Contract')).not.toBeInTheDocument();
  });

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
    
    // Use getByDisplayValue for input fields instead of getByLabelText
    expect(screen.getByDisplayValue('R15000')).toBeInTheDocument();
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

    // Find input by display value instead of label
    const totalFeeInput = screen.getByDisplayValue('R15000');
    await act(async () => {
      fireEvent.change(totalFeeInput, { target: { value: 'R20000' } });
    });

    expect(totalFeeInput.value).toBe('R20000');
  });

  test('handles custom field operations', async () => {
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

    // Add custom field
    const addButton = screen.getByText('Add Custom Field');
    await act(async () => {
      fireEvent.click(addButton);
    });

    // Use the actual placeholder text from the component
    const customFieldHeaders = screen.getAllByPlaceholderText('Clause Header (e.g., Travel Fee)');
    const customFieldValues = screen.getAllByPlaceholderText('Clause Details');

    expect(customFieldHeaders.length).toBe(1);
    expect(customFieldValues.length).toBe(1);

    // Fill custom field
    await act(async () => {
      fireEvent.change(customFieldHeaders[0], { target: { value: 'Travel Fee' } });
      fireEvent.change(customFieldValues[0], { target: { value: 'R500 for distances over 50km' } });
    });

    expect(customFieldHeaders[0].value).toBe('Travel Fee');
    expect(customFieldValues[0].value).toBe('R500 for distances over 50km');

    // Remove custom field - find by role or test id
    const removeButton = screen.getByTestId('fa-trash').closest('button');
    await act(async () => {
      fireEvent.click(removeButton);
    });

    // Check that custom fields are removed
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Clause Header (e.g., Travel Fee)')).not.toBeInTheDocument();
    });
  });

  test('saves contract successfully', async () => {
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ ...mockContract, content: 'updated content' }) 
      })
    );

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

    const saveButton = screen.getByText('Save Contract');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/contracts',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  test('handles contract signing for planner', async () => {
    // Use the pending signature contract for this test
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockContract) // This has pending_planner_signature status
      })
    );

    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserPlanner });
    });

    await waitFor(() => {
      // The signature input should be visible when contract is pending planner signature
      expect(screen.getByPlaceholderText('Type full name to sign')).toBeInTheDocument();
    });

    const signatureInput = screen.getByPlaceholderText('Type full name to sign');
    const signButton = screen.getByText('Sign');

    // Mock the next fetch call for signing
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockSignedContract) 
      })
    );

    await act(async () => {
      fireEvent.change(signatureInput, { target: { value: 'Test Planner' } });
      fireEvent.click(signButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/contracts/contract-123/sign',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            role: 'planner',
            signature: 'Test Planner'
          })
        })
      );
    });
  });

  test('shows alert when signing without name', async () => {
    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserPlanner });
    });

    await waitFor(() => {
      expect(screen.getByText('Sign')).toBeInTheDocument();
    });

    const signButton = screen.getByText('Sign');
    await act(async () => {
      fireEvent.click(signButton);
    });

    expect(global.alert).toHaveBeenCalledWith('Please type your full name to sign.');
  });

  test('handles revision requests', async () => {
    // Mock Date for consistent timestamp
    const mockDate = new Date('2025-09-29T19:55:14.946Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockContractWithRevisions) 
      })
    );

    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserPlanner });
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., Please clarify payment terms...')).toBeInTheDocument();
    });

    const revisionTextarea = screen.getByPlaceholderText('e.g., Please clarify payment terms...');
    const submitButton = screen.getByText('Submit Revision');

    await act(async () => {
      fireEvent.change(revisionTextarea, { target: { value: 'Need more details on deliverables' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/contracts/contract-123/revise',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            revision: {
              requested_by: 'Test Planner',
              comment: 'Need more details on deliverables',
              timestamp: '2025-09-29T19:55:14.946Z'
            }
          })
        })
      );
    });

    // Restore Date
    jest.restoreAllMocks();
  });

  test('displays revision history', async () => {
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockContractWithRevisions) 
      })
    );

    await act(async () => {
      renderContractManagement();
    });

    await waitFor(() => {
      expect(screen.getByText('Revision History')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Planner')).toBeInTheDocument();
    
    // Use more flexible text matching for revision comments
    // The comment might be wrapped in quotes or other elements
    expect(screen.getByText(/Please clarify payment terms/i)).toBeInTheDocument();
  });

  test('shows status banners correctly', async () => {
    // Test revisions requested banner
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ ...mockContract, status: 'revisions_requested' }) 
      })
    );

    const { unmount } = await act(async () => {
      return renderContractManagement();
    });

    await waitFor(() => {
      expect(screen.getByText(/revisions requested/i)).toBeInTheDocument();
    });

    unmount();

    // Test active contract banner
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(mockSignedContract) 
      })
    );

    await act(async () => {
      renderContractManagement();
    });

    await waitFor(() => {
      expect(screen.getByText(/active.*signed by both parties/i)).toBeInTheDocument();
    });
  });



  test('handles fetch errors gracefully', async () => {
    console.error = jest.fn(); // Suppress error logs
    global.fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );

    await act(async () => {
      renderContractManagement();
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading contract...')).not.toBeInTheDocument();
    });

    // Should handle error without crashing
    expect(screen.getByText('Contract: Test Vendor')).toBeInTheDocument();
  });

  test('cancels edit mode', async () => {
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

    const cancelButton = screen.getByText('Cancel');
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Edit Contract Details')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Edit Contract')).toBeInTheDocument();
  });

  test('displays different service type fields', async () => {
    const venueVendor = { ...mockVendor, service_type: 'venue' };
    
    await act(async () => {
      renderContractManagement({ 
        currentUser: mockCurrentUserVendor,
        vendor: venueVendor 
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Contract')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit Contract');
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Use getByPlaceholderText instead of getByLabelText for form fields
    expect(screen.getByPlaceholderText('e.g., Grand Ballroom and Gardens')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 150 guests')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., All music must end by 11:00 PM')).toBeInTheDocument();
  });

  test('handles empty contract state', async () => {
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve(null) 
      })
    );

    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserVendor });
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading contract...')).not.toBeInTheDocument();
    });

    // Should render without contract data
    expect(screen.getByText('Contract: Test Vendor')).toBeInTheDocument();
  });
});