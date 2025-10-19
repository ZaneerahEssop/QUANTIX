import { renderHook } from '@testing-library/react';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { supabase } from '../client';

// Mock the entire client module
jest.mock('../client', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

describe('useRealtimeUpdates Hook', () => {
  // Create mock objects for the channel chaining
  const mockOn = jest.fn();
  const mockSubscribe = jest.fn();
  const mockChannel = {
    on: mockOn.mockReturnThis(), // .on() returns the channel object for chaining
    subscribe: mockSubscribe,
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Ensure supabase.channel returns our mock channel object
    supabase.channel.mockReturnValue(mockChannel);
    // --- FIX: Ensure .subscribe() returns the channel so it's not undefined in the hook's cleanup function ---
    mockSubscribe.mockReturnValue(mockChannel);
  });

  it('should subscribe to the correct channel, table, and filter', () => {
    const mockTable = 'events';
    const mockFilter = 'planner_id=eq.123';
    const mockCallback = jest.fn();

    // Render the hook with test data
    renderHook(() => useRealtimeUpdates(mockTable, mockFilter, mockCallback));

    // 1. Verify that a channel was created
    expect(supabase.channel).toHaveBeenCalledWith('schema-db-changes');

    // 2. Verify that it subscribed to the correct postgres changes
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: mockTable,
        filter: mockFilter,
      },
      expect.any(Function) // The callback function
    );

    // 3. Verify that subscribe was called
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('should call the callback function when a payload is received', () => {
    const mockCallback = jest.fn();
    const mockPayload = { new: { id: 1, name: 'New Event' } };

    renderHook(() => useRealtimeUpdates('events', 'planner_id=eq.123', mockCallback));

    // Extract the callback function passed to .on()
    const onCallback = mockOn.mock.calls[0][2];

    // Simulate a payload being received from Supabase
    onCallback(mockPayload);

    // Verify our hook's callback was executed with the payload
    expect(mockCallback).toHaveBeenCalledWith(mockPayload);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should clean up and remove the channel on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtimeUpdates('events', 'planner_id=eq.123', jest.fn())
    );

    // Ensure subscription was set up
    expect(supabase.channel).toHaveBeenCalledTimes(1);

    // Unmount the component
    unmount();

    // Verify that the cleanup function was called
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
  });
});

