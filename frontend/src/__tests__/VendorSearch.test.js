// src/components/__tests__/VendorSearch.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VendorSearch from '../components/VendorSearch';
import { supabase } from '../client';

// --- MOCKS ---

// Mock Supabase client
jest.mock('../client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// CORRECTED Mock for styled-components
jest.mock('styled-components', () => {
  const styled = (Component) => () => (props) => <Component {...props} />;
  styled.div = () => (props) => <div {...props} />;
  styled.input = () => (props) => <input {...props} />;
  return styled;
});

// Mock global fetch
global.fetch = jest.fn();

// --- MOCK DATA ---
const mockSession = {
  data: {
    session: {
      access_token: 'mock-token',
      user: { id: 'mock-user-id' },
    },
  },
};

const mockVendors = [
  { vendor_id: 1, business_name: 'The Venue Collective', service_type: 'Venue' },
  { vendor_id: 2, business_name: 'Gourmet Delights', service_type: 'Catering' },
  { vendor_id: 3, business_name: 'Blooms & Petals', service_type: 'Florist' },
];

describe('VendorSearch Component', () => {
  let mockOnSelectVendor;

  beforeEach(() => {
    // Enable fake timers to control debounce `setTimeout`
    jest.useFakeTimers();

    // Reset mocks before each test
    jest.clearAllMocks();
    mockOnSelectVendor = jest.fn();

    // Default successful mock implementations
    supabase.auth.getSession.mockResolvedValue(mockSession);
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockVendors,
    });
  });

  afterEach(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  // --- TESTS ---

  test('renders the search input and fetches vendors on mount', async () => {
    render(<VendorSearch onSelectVendor={mockOnSelectVendor} />);
    
    // Check for the input field
    expect(screen.getByPlaceholderText('Search vendors...')).toBeInTheDocument();
    
    // Verify that the component attempts to fetch vendors
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/vendors'), expect.any(Object));
    });
  });

  test('searches and displays matching vendors after debounce', async () => {
    render(<VendorSearch onSelectVendor={mockOnSelectVendor} />);
    
    // Wait for initial fetch to resolve so `allVendors` is populated
    await act(async () => {
      await Promise.resolve();
    });

    const searchInput = screen.getByPlaceholderText('Search vendors...');
    fireEvent.change(searchInput, { target: { value: 'Venue' } });

    // Fast-forward time by 300ms to trigger the debounced search
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Check for the correct result
    expect(await screen.findByText('The Venue Collective')).toBeInTheDocument();
    expect(screen.getByText('Venue')).toBeInTheDocument();
    
    // Ensure non-matching results are not shown
    expect(screen.queryByText('Gourmet Delights')).not.toBeInTheDocument();
  });

  test('shows "No vendors found" message for non-matching queries', async () => {
    render(<VendorSearch onSelectVendor={mockOnSelectVendor} />);
    
    await act(async () => {
      await Promise.resolve();
    });

    const searchInput = screen.getByPlaceholderText('Search vendors...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-service' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(await screen.findByText(/No vendors found/i)).toBeInTheDocument();
  });

  test('calls onSelectVendor and updates input when a result is clicked', async () => {
    render(<VendorSearch onSelectVendor={mockOnSelectVendor} />);
    
    await act(async () => {
      await Promise.resolve();
    });

    const searchInput = screen.getByPlaceholderText('Search vendors...');
    fireEvent.change(searchInput, { target: { value: 'Gourmet' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    const resultItem = await screen.findByText('Gourmet Delights');
    fireEvent.click(resultItem);

    // Check if the callback was called with the correct vendor data
    expect(mockOnSelectVendor).toHaveBeenCalledWith({
      id: 2,
      name: 'Gourmet Delights',
      category: 'Catering',
    });
    
    // Check if the input value was updated
    expect(searchInput.value).toBe('Gourmet Delights');
    
    // The results list should disappear after selection
    expect(screen.queryByText('Blooms & Petals')).not.toBeInTheDocument();
  });

  test('clears search input and calls onSelectVendor with null when clear button is clicked', async () => {
    render(<VendorSearch onSelectVendor={mockOnSelectVendor} />);
    
    const searchInput = screen.getByPlaceholderText('Search vendors...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // The clear button should now be visible
    const clearButton = await screen.findByText('×');
    fireEvent.click(clearButton);
    
    // Input should be empty
    expect(searchInput.value).toBe('');
    
    // Callback should be called with null to indicate deselection
    expect(mockOnSelectVendor).toHaveBeenCalledWith(null);
  });

  test('handles API fetch error gracefully', async () => {
    // Mock a failed fetch
    fetch.mockRejectedValue(new Error('API is down'));
    
    render(<VendorSearch onSelectVendor={mockOnSelectVendor} />);
    
    // The component should still render the input field without crashing
    expect(screen.getByPlaceholderText('Search vendors...')).toBeInTheDocument();
    
    // No results should be shown if a search is attempted
    const searchInput = screen.getByPlaceholderText('Search vendors...');
    fireEvent.change(searchInput, { target: { value: 'Venue' } });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(await screen.findByText(/No vendors found/i)).toBeInTheDocument();
  });
});