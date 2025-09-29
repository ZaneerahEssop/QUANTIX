// This is the full test file for your planner controller.
// Place this file in: backend/src/Tests/planner.controller.test.js

const { getPlannerById } = require('../Controllers/planner.controller');
const supabase = require('../Config/supabase');

// Mock the Supabase client and its chained methods.
jest.mock('../Config/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(), // The final method in the chain, which we'll configure in each test.
}));

describe('getPlannerById Controller', () => {
  // Before each test, reset mock function calls to ensure a clean slate.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: The "happy path" - successfully fetching a planner.
  it('should return a planner object and a 200 status code for a valid ID', async () => {
    // ---- 1. Arrange ----
    const mockPlannerData = {
      planner_id: 'p-123',
      name: 'John Doe',
      email: 'john.doe@example.com',
    };
    // Configure the mock's final return value for a successful query.
    supabase.single.mockResolvedValue({ data: mockPlannerData, error: null });

    const req = { params: { id: 'p-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getPlannerById(req, res);

    // ---- 3. Assert ----
    expect(supabase.from).toHaveBeenCalledWith('planners');
    expect(supabase.eq).toHaveBeenCalledWith('planner_id', 'p-123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPlannerData);
  });

  // Test Case 2: Planner is not found in the database.
  it('should return a 404 error if the planner is not found', async () => {
    // ---- 1. Arrange ----
    // Configure the mock to return null data, simulating a planner that doesn't exist.
    supabase.single.mockResolvedValue({ data: null, error: null });

    const req = { params: { id: 'p-nonexistent' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getPlannerById(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Planner not found' });
  });

  // Test Case 3: The request is missing the planner ID.
  it('should return a 400 error if the planner ID is missing from params', async () => {
    // ---- 1. Arrange ----
    const req = { params: {} }; // No 'id' provided
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getPlannerById(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Planner ID is required' });
    // Verify that we didn't waste a database call if the ID was missing.
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // Test Case 4: A database error occurs during the query.
  it('should return a 500 error if the database query fails', async () => {
    // ---- 1. Arrange ----
    const dbError = new Error('Database connection error');
    // Configure the mock to reject the promise, triggering the catch block.
    supabase.single.mockRejectedValue(dbError);

    const req = { params: { id: 'p-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getPlannerById(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch planner' });
  });
});