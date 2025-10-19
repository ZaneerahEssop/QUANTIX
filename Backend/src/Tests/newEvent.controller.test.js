// This is the full corrected test file for your newEvent controller.
// Place this file in: backend/src/Tests/newEvent.controller.test.js

const { createEvent } = require('../Controllers/newEvent.controller');
const supabase = require('../Config/supabase');

// Mock the entire Supabase module. We will provide specific implementations
// for the 'from' method within each test to handle different tables.
jest.mock('../Config/supabase', () => ({
  from: jest.fn(),
}));

describe('createEvent Controller', () => {
  // Before each test, reset all mock functions to ensure test isolation.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: The "happy path" - successful creation with all optional data.
  it('should create an event with vendors and files and return 201', async () => {
    // ---- 1. Arrange ----
    const mockPlanner = { planner_id: 'p-123', name: 'Test Planner' };
    const mockEvent = { event_id: 'evt-xyz', name: 'Annual Tech Conference' };

    // Mock the chained Supabase calls for each table
    supabase.from.mockImplementation((tableName) => {
      switch (tableName) {
        case 'planners':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockPlanner, error: null }),
          };
        case 'events':
          return {
            insert: jest.fn().mockReturnThis(),
            // ✨ FIX: Mock the .select().single() chain to return the created event object.
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        case 'vendor_requests':
        case 'files':
          return {
            insert: jest.fn().mockResolvedValue({ error: null }), // Assume inserts succeed
          };
        default:
          return { insert: jest.fn(), select: jest.fn() };
      }
    });

    const req = {
      body: {
        name: 'Annual Tech Conference',
        start_time: '2025-10-26T09:00:00Z',
        planner_id: 'p-123',
        // ✨ FIX: Updated selectedVendors to match the controller's expected structure.
        selectedVendors: [{ vendor_id: 'v-abc', service_requested: 'Catering' }],
        documents: [{ name: 'contract.pdf', url: 'http://example.com/contract.pdf', uploaded_by: 'p-123' }],
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await createEvent(req, res);

    // ---- 3. Assert ----
    // Check final response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ event: mockEvent });

    // Verify database calls
    expect(supabase.from).toHaveBeenCalledWith('planners');
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(supabase.from).toHaveBeenCalledWith('vendor_requests');
    expect(supabase.from).toHaveBeenCalledWith('files');
  });

  // Test Case 2: Validation failure for missing required fields.
  it('should return 400 if required fields are missing', async () => {
    // ---- 1. Arrange ----
    const req = {
      body: {
        // Missing 'name', 'start_time', and 'planner_id'
        theme: 'A nice theme',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await createEvent(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    // Ensure no database calls were made
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // Test Case 3: Planner does not exist.
  it('should return 400 if the planner does not exist', async () => {
    // ---- 1. Arrange ----
    // Mock the planner check to return no data
    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'planners') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    const req = {
      body: {
        name: 'Event with bad planner',
        start_time: '2025-11-01T10:00:00Z',
        planner_id: 'p-nonexistent',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await createEvent(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Planner does not exist' });
  });

  // Test Case 4: Event insertion fails at the database level.
  it('should return 500 if inserting the event fails', async () => {
    // ---- 1. Arrange ----
    const dbError = { message: 'Insert conflict' };
    supabase.from.mockImplementation((tableName) => {
      switch (tableName) {
        case 'planners':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { planner_id: 'p-123' }, error: null }),
          };
        case 'events':
          return {
            insert: jest.fn().mockReturnThis(),
            // ✨ FIX: Mock the full .select().single() chain to simulate a DB error.
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: dbError }),
          };
        default:
          return {};
      }
    });

    const req = {
      body: {
        name: 'A Failing Event',
        start_time: '2025-12-01T12:00:00Z',
        planner_id: 'p-123',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await createEvent(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    // Now the controller will correctly return the specific database error message
    expect(res.json).toHaveBeenCalledWith({ error: dbError.message });
  });
});