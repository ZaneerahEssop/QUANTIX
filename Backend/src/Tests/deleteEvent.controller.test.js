// backend/src/Tests/deleteEvent.controller.test.js

const { deleteEvents } = require('../Controllers/deleteEvent.controller');
const supabase = require('../Config/supabase');

// ✨ FIX: A more robust and chainable mock setup.
// This mock ensures that all Supabase methods return a mock object,
// allowing for deep chaining. The final method in the chain (like .single() or .eq())
// will be mocked specifically within each test.
jest.mock('../Config/supabase', () => {
    const mock = {
      from: jest.fn(),
      select: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
    };

    // Make all methods chainable by returning the mock object itself
    mock.from.mockReturnThis();
    mock.select.mockReturnThis();
    mock.delete.mockReturnThis();
    
    return mock;
});

describe('deleteEvents Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: The "happy path" - successful deletion
  it('should delete an event and return 200 if the event exists', async () => {
    const eventId = 'evt-123';
    
    // Arrange:
    // 1. Mock the find operation to succeed by returning data from .single()
    supabase.eq.mockImplementation((column, value) => {
        if (column === 'event_id' && value === eventId) {
            // This first call is from the .select() chain
            return { single: jest.fn().mockResolvedValue({ data: { event_id: eventId }, error: null }) };
        }
        // This second call is from the .delete() chain
        return Promise.resolve({ error: null });
    });

    const req = { params: { event_id: eventId } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Act
    await deleteEvents(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Event deleted successfully',
      event_id: eventId,
    });
  });

  // Test Case 2: Validation - event_id is missing
  it('should return 400 if event_id is not provided', async () => {
    const req = { params: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await deleteEvents(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'event_id is required' });
  });

  // Test Case 3: Event not found (select returns no data)
  it('should return 404 if the event to be deleted is not found', async () => {
    // Arrange: Mock the find operation to return no data
    supabase.eq.mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: null }) });

    const req = { params: { event_id: 'evt-nonexistent' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Act
    await deleteEvents(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Event not found' });
  });
  
  // Test Case 4: Database error during the initial find operation
  it('should return 404 if there is a database error when finding the event', async () => {
    const dbError = { message: 'Connection error' };
    // Arrange: Mock the find operation to return an error
    supabase.eq.mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: dbError }) });
    
    const req = { params: { event_id: 'evt-123' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
    // Act
    await deleteEvents(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Event not found', details: dbError.message });
  });

  // Test Case 5: Database error during the delete operation
  it('should return 500 if the delete operation fails', async () => {
    const eventId = 'evt-123';
    const dbError = { message: 'Foreign key constraint failed' };
    
    // Arrange:
    // 1. Mock the find operation to succeed
    supabase.eq.mockImplementationOnce(() => ({
        single: jest.fn().mockResolvedValue({ data: { event_id: eventId }, error: null })
    }));
    // 2. Mock the delete operation to fail
    supabase.eq.mockImplementationOnce(() => Promise.resolve({ error: dbError }));

    const req = { params: { event_id: eventId } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Act
    await deleteEvents(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to delete event',
      details: dbError.message,
    });
  });
});