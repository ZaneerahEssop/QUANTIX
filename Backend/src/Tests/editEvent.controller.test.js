// This is the full, updated test file for your editEvent controller.
// It includes the original tests plus new ones for branch coverage.

const { editEvent } = require('../Controllers/editEvent.controller');
const supabase = require('../Config/supabase');

// Mock the Supabase client and its chained methods.
jest.mock('../Config/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
}));

describe('editEvent Controller', () => {
  // Before each test, reset mock function calls for a clean slate.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Standard successful update (Happy Path)
  it('should update an event and return 200 on success', async () => {
    // ---- Arrange ----
    const mockUpdatedEvent = { event_id: "123", name: "New Awesome Event" };
    supabase.single.mockResolvedValue({ data: mockUpdatedEvent, error: null });

    const req = {
      params: { id: "123" },
      body: {
        name: "New Awesome Event",
        venue: "Online",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await editEvent(req, res);

    // ---- Assert ----
    expect(supabase.from).toHaveBeenCalledWith("events");
    expect(supabase.update).toHaveBeenCalledWith({
      name: "New Awesome Event",
      venue: "Online",
    });
    expect(supabase.eq).toHaveBeenCalledWith("event_id", "123");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      event: mockUpdatedEvent,
    });
  });

  // ** NEW TEST FOR BRANCH COVERAGE 1 **
  // Covers the branch where both date and time are provided.
  it('should correctly format start_time when both date and start_time are provided', async () => {
    // ---- Arrange ----
    const mockUpdatedEvent = { event_id: "123", name: "Updated Event" };
    supabase.single.mockResolvedValue({ data: mockUpdatedEvent, error: null });

    const req = {
        params: { id: "123" },
        body: {
            name: "Updated Event",
            date: "2025-11-20",
            // Assumes you've fixed the bug in your controller to use 'start_time' instead of 'time'
            start_time: "15:30", 
        },
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    // ---- Act ----
    await editEvent(req, res);

    // ---- Assert ----
    // Checks that the update payload includes the correctly combined date and time.
    expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
            start_time: "2025-11-20T15:30:00",
        })
    );
    expect(res.json).toHaveBeenCalledWith({
        success: true,
        event: mockUpdatedEvent,
    });
  });

  // ** NEW TEST FOR BRANCH COVERAGE 2 **
  // Covers the branch where only the date is provided.
  it('should correctly format start_time with a default time when only date is provided', async () => {
    // ---- Arrange ----
    const mockUpdatedEvent = { event_id: "456", name: "Another Event" };
    supabase.single.mockResolvedValue({ data: mockUpdatedEvent, error: null });

    const req = {
        params: { id: "456" },
        body: {
            name: "Another Event",
            date: "2025-12-10",
            // No start_time is provided in this request.
        },
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    // ---- Act ----
    await editEvent(req, res);

    // ---- Assert ----
    // Checks that the update payload includes the date with the default time.
    expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
            start_time: "2025-12-10T00:00:00",
        })
    );
    expect(res.json).toHaveBeenCalledWith({
        success: true,
        event: mockUpdatedEvent,
    });
  });

  // Test Case 4: Supabase returns an error object (tests the `if (error)` block)
  it('should return 500 if supabase returns an error', async () => {
    // ---- Arrange ----
    const mockError = { message: "Update failed" };
    supabase.single.mockResolvedValue({ data: null, error: mockError });

    const req = {
      params: { id: "456" },
      body: { name: "Another Event" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await editEvent(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Update failed" });
  });

  // Test Case 5: An unexpected error occurs (tests the `catch` block)
  it('should return 500 if a non-supabase error occurs', async () => {
    // ---- Arrange ----
    // Force the 'update' method to throw an error to trigger the main catch block.
    supabase.update.mockImplementation(() => {
      throw new Error("Something went wrong");
    });

    const req = {
        params: { id: "789" },
        body: { name: "Problematic Event" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
  
      // ---- Act ----
      await editEvent(req, res);
  
      // ---- Assert ----
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update event" });
  });
});