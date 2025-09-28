// This is the full test file for your getEvent controller.
// Place this file in: backend/src/Tests/getEvent.controller.test.js

const { getEvents, getEventById } = require('../Controllers/getEvent.controller');
const supabase = require('../Config/supabase');

// Mock the Supabase client and its chained methods.
jest.mock('../Config/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn(), // We'll mock the final resolved value in each test
  single: jest.fn(), // We'll mock the final resolved value in each test
}));

// A describe block for the getEvents function
describe('getEvents Controller', () => {
  // Reset mocks before each test to ensure a clean state
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of events for a valid planner_id', async () => {
    // ---- Arrange ----
    const mockEventsData = [
      { event_id: '1', name: 'Summer Festival', planner_id: 'p-123' },
      { event_id: '2', name: 'Winter Gala', planner_id: 'p-123' },
    ];
    // Mock the final method in the chain to return our fake data
    supabase.order.mockResolvedValue({ data: mockEventsData, error: null });

    const req = { query: { planner_id: 'p-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getEvents(req, res);

    // ---- Assert ----
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(supabase.eq).toHaveBeenCalledWith('planner_id', 'p-123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEventsData);
  });

  it('should return a 400 error if planner_id is not provided', async () => {
    // ---- Arrange ----
    const req = { query: {} }; // No planner_id
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getEvents(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'planner_id is required' });
  });

  it('should return a 500 error if Supabase throws an error', async () => {
    // ---- Arrange ----
    const dbError = new Error('Database connection lost');
    supabase.order.mockRejectedValue(dbError); // Simulate a failed promise

    const req = { query: { planner_id: 'p-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getEvents(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch events' });
  });
});

// A separate describe block for the getEventById function
describe('getEventById Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a single event for a valid event_id', async () => {
    // ---- Arrange ----
    const mockEventData = { event_id: 'evt-456', name: 'Corporate Summit' };
    supabase.single.mockResolvedValue({ data: mockEventData, error: null });

    const req = { params: { event_id: 'evt-456' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getEventById(req, res);

    // ---- Assert ----
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(supabase.eq).toHaveBeenCalledWith('event_id', 'evt-456');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEventData);
  });

  it('should return a 404 error if the event is not found', async () => {
    // ---- Arrange ----
    // Supabase returns no data and no error when a single item is not found
    supabase.single.mockResolvedValue({ data: null, error: null });

    const req = { params: { event_id: 'evt-nonexistent' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getEventById(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Event not found' });
  });

  it('should return a 500 error for unexpected database failures', async () => {
    // ---- Arrange ----
    const unexpectedError = new Error('Unexpected query failure');
    supabase.single.mockRejectedValue(unexpectedError);

    const req = { params: { event_id: 'evt-abc' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getEventById(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch event' });
  });
});