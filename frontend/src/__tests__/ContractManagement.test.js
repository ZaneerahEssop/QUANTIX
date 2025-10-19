import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContractManagement from '../components/ContractManagement';

//a mock for the unsubscribe function
const mockUnsubscribe = jest.fn();


jest.mock('../client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => ({
          unsubscribe: mockUnsubscribe,
        })),
      })),
    })),
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
    mockUnsubscribe.mockClear(); // Clear the unsubscribe mock
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
      // Check for an element that exists after loading
      expect(screen.getByText('Edit Contract')).toBeInTheDocument();
    });
    const editButton = screen.getByText('Edit Contract');
    await act(async () => {
      fireEvent.click(editButton);
    });
    expect(screen.getByText('Edit Contract Details')).toBeInTheDocument();
    // The value is parsed from the mock contract
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
    // Use the placeholder text to find the input
    const totalFeeInput = screen.getByPlaceholderText('e.g., 15000');
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
      // The component logic prevents the state from updating
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
         // The component logic prevents the state from updating
        expect(hoursInput.value).toBe('48');
    });
  });

  test('handles contract field parsing for different service types', async () => {
    const cateringVendor = { ...mockVendor, service_type: 'catering' };
    
    await act(async () => {
      renderContractManagement({ vendor: cateringVendor, currentUser: mockCurrentUserVendor });
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Contract')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit Contract');
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Should show catering-specific fields
    expect(screen.getByPlaceholderText('e.g., Buffet, Plated Dinner')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 2 servers and 1 bartender')).toBeInTheDocument();
  });

  test('handles empty vendor acceptance state', async () => {
    await act(async () => {
      renderContractManagement({ isVendorAccepted: false });
    });

    // Should not show loading or contract content when vendor is not accepted
    await waitFor(() => {
      expect(screen.queryByText('Loading contract...')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit Contract')).not.toBeInTheDocument();
    });
  });

  test('handles missing event data gracefully', async () => {
    await act(async () => {
      renderContractManagement({ eventData: null });
    });

    // Should handle missing event data without crashing
    await waitFor(() => {
      expect(screen.queryByText('Loading contract...')).not.toBeInTheDocument();
    });
  });

  test('handles contract content parsing with empty values', async () => {
    const emptyContract = {
      ...mockContract,
      content: '# Service Agreement\n- **Hours of Coverage:** []\n- **Total Fee:** []'
    };

    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ ok: true, json: () => Promise.resolve(emptyContract) })
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

    // Fields should be empty when parsed from empty brackets
    const totalFeeInput = screen.getByPlaceholderText('e.g., 15000');
    expect(totalFeeInput.value).toBe('');
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

  // Verify we're in edit mode
  expect(screen.getByText('Edit Contract Details')).toBeInTheDocument();

  const totalFeeInput = screen.getByPlaceholderText('e.g., 15000');
  await act(async () => {
    fireEvent.change(totalFeeInput, { target: { value: '99999' } });
  });

  // Mocking the fetch that will be called when canceling
  global.fetch.mockImplementationOnce(() => 
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockContract) })
  );

  const cancelButton = screen.getByText('Cancel');
  await act(async () => {
    fireEvent.click(cancelButton);
  });

  // Verify we exited edit mode
  await waitFor(() => {
    expect(screen.queryByText('Edit Contract Details')).not.toBeInTheDocument();
  });

  expect(screen.getByText('Edit Contract')).toBeInTheDocument();
  });

  test('handles contract signing for planner', async () => {
    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserPlanner });
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type full name to sign')).toBeInTheDocument();
    });

    const signatureInput = screen.getByPlaceholderText('Type full name to sign');
    const signButton = screen.getByText('Sign');

    // Mock successful signature response
    const signedContract = { 
      ...mockContract, 
      planner_signature: 'Test Planner',
      planner_signed_at: '2025-01-01T00:00:00Z'
    };
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ ok: true, json: () => Promise.resolve(signedContract) })
    );

    await act(async () => {
      fireEvent.change(signatureInput, { target: { value: 'Test Planner' } });
      fireEvent.click(signButton);
    });

    // Verify API was called correctly
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:5000/api/contracts/${mockContract.id}/sign`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            role: 'planner',
            signature: 'Test Planner'
          })
        })
      );
    });

    // Verify signature is displayed
    await waitFor(() => {
      expect(screen.getByText(/Test Planner/)).toBeInTheDocument();
      expect(screen.getByText(/signed/)).toBeInTheDocument();
    });
  });

  test('does not show revision form for planner after they have signed', async () => {
    const plannerSignedContract = { 
      ...mockContract, 
      planner_signature: 'Test Planner',
      planner_signed_at: '2025-01-01T00:00:00Z'
    };

    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ ok: true, json: () => Promise.resolve(plannerSignedContract) })
    );

    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserPlanner });
    });

    await waitFor(() => {
      // Should show the signed signature
      expect(screen.getByText(/Test Planner/)).toBeInTheDocument();
    });

    // Shouldnt show revision form
    expect(screen.queryByPlaceholderText('e.g., Please clarify payment terms...')).not.toBeInTheDocument();
    expect(screen.queryByText('Submit Revision')).not.toBeInTheDocument();
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

    // Verify alert was shown
    expect(global.alert).toHaveBeenCalledWith('Please type your full name to sign.');
    
    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/sign'),
      expect.any(Object)
    );
  });

  test('handles empty contract state', async () => {
    // Mock no contract found
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ 
        status: 404,
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      })
    );

    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserVendor });
    });

    // Should handle empty state without crashing
    await waitFor(() => {
      // Should show the contract template content
      expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
    });

    // Vendor should be able to create a new contract
    expect(screen.getByText('Edit Contract')).toBeInTheDocument();
  });
  
  test('displays different service type fields', async () => {
    const serviceTypes = [
      { type: 'photography', fields: ['Hours of Coverage', 'Deliverables'] },
      { type: 'music', fields: ['Performance Time', 'Service Type', 'Equipment'] },
      { type: 'catering', fields: ['Service Style', 'Staffing'] },
      { type: 'venue', fields: ['Space(s) Provided', 'Capacity', 'Restrictions'] },
      { type: 'decor', fields: ['Scope'] },
      { type: 'flowers', fields: ['Arrangement Types'] }
    ];

    for (const { type, fields } of serviceTypes) {
      const vendorWithType = { ...mockVendor, service_type: type };
      
      const { unmount } = await act(async () => {
        return render(
          <ContractManagement 
            eventData={mockEventData}
            vendor={vendorWithType}
            currentUser={mockCurrentUserVendor}
            isVendorAccepted={true}
            onBack={jest.fn()}
          />
        );
      });

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit Contract');
        expect(editButtons.length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByText('Edit Contract');
      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      // Verify all expected fields for this service type are displayed
      for (const field of fields) {
        expect(screen.getByText(field)).toBeInTheDocument();
      }

      await act(async () => {
        unmount();
      });
    }
  });

  test('handles fetch errors gracefully', async () => {
    // Mock fetch error
    global.fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );

    await act(async () => {
      renderContractManagement();
    });

    // Should show error message in modal
    await waitFor(() => {
      expect(screen.getByText(/Could not load contract/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    const closeButton = screen.getByText('×');
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByText(/Network error/)).not.toBeInTheDocument();
  });

  test('handles revision requests', async () => {
    await act(async () => {
      renderContractManagement({ currentUser: mockCurrentUserPlanner });
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., Please clarify payment terms...')).toBeInTheDocument();
    });

    const revisionTextarea = screen.getByPlaceholderText('e.g., Please clarify payment terms...');
    const submitButton = screen.getByText('Submit Revision');

    // Mock successful revision response
    const updatedContract = { 
      ...mockContract, 
      revisions: [{ requested_by: 'Test Planner', comment: 'Test revision', timestamp: '2025-01-01T00:00:00Z' }]
    };
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ ok: true, json: () => Promise.resolve(updatedContract) })
    );

    await act(async () => {
      fireEvent.change(revisionTextarea, { target: { value: 'Test revision' } });
      fireEvent.click(submitButton);
    });

    // Verify API was called correctly 
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:5000/api/contracts/${mockContract.id}/revise`,
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test revision')
        })
      );
    });

    // Verify the request body contains the expected structure
    const revisionCall = global.fetch.mock.calls.find(call => 
      call[0].includes('/revise')
    );
    expect(revisionCall).toBeDefined();
    
    const requestBody = JSON.parse(revisionCall[1].body);
    expect(requestBody.revision.requested_by).toBe('Test Planner');
    expect(requestBody.revision.comment).toBe('Test revision');
    expect(requestBody.revision.timestamp).toBeDefined();
    expect(typeof requestBody.revision.timestamp).toBe('string');

    // Verify textarea is cleared after submission
    expect(revisionTextarea.value).toBe('');
  });

  test('displays revision history', async () => {
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockContractWithRevisions) })
    );

    await act(async () => {
      renderContractManagement();
    });

    await waitFor(() => {
      expect(screen.getByText('Revision History')).toBeInTheDocument();
    });

    // Verify revision content is displayed
    const revisionText = screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'blockquote' && 
            content.includes('Please clarify payment terms');
    });
    expect(revisionText).toBeInTheDocument();
    
    expect(screen.getByText('Test Planner')).toBeInTheDocument();
    
    // Verify timestamp is formatted
    const timestamp = new Date('2025-01-01T10:00:00Z').toLocaleString();
    expect(screen.getByText(timestamp, { exact: false })).toBeInTheDocument();
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

    // Add a custom field
    const addButton = screen.getByText('Add Custom Field');
    await act(async () => {
      fireEvent.click(addButton);
    });

    // Should show the new custom field row
    const customFieldHeaders = screen.getAllByPlaceholderText('Clause Header (e.g., Travel Fee)');
    const customFieldValues = screen.getAllByPlaceholderText('Clause Details');
    
    expect(customFieldHeaders).toHaveLength(1);
    expect(customFieldValues).toHaveLength(1);

    // Fill in the custom field
    await act(async () => {
      fireEvent.change(customFieldHeaders[0], { target: { value: 'Travel Fee' } });
      fireEvent.change(customFieldValues[0], { target: { value: 'R500 for distant locations' } });
    });

    expect(customFieldHeaders[0].value).toBe('Travel Fee');
    expect(customFieldValues[0].value).toBe('R500 for distant locations');

    // Add another custom field
    await act(async () => {
      fireEvent.click(addButton);
    });

    const updatedHeaders = screen.getAllByPlaceholderText('Clause Header (e.g., Travel Fee)');
    expect(updatedHeaders).toHaveLength(2);

    // Remove the first custom field
    const removeButtons = screen.getAllByTestId('fa-trash');
    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    const finalHeaders = screen.getAllByPlaceholderText('Clause Header (e.g., Travel Fee)');
    expect(finalHeaders).toHaveLength(1);
  });

});