// This is the full, updated test file for your exportController.
// It includes new tests to improve branch coverage.

const { exportEventData } = require('../Controllers/exportController');
const supabase = require('../Config/supabase');
const archiver = require('archiver');
const { stringify } = require('csv-stringify');

// ---- Mocking External Dependencies ----

// 1. Mock the Supabase client
jest.mock('../Config/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}));

// 2. Mock the archiver library
const mockArchive = {
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn().mockResolvedValue(),
};
jest.mock('archiver', () => jest.fn(() => mockArchive));

// 3. Mock the csv-stringify library
jest.mock('csv-stringify', () => ({
  stringify: jest.fn(),
}));

// ---- Test Suite ----

describe('exportEventData Controller', () => {
  // Before each test, reset all mocks to ensure tests are independent.
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset stringify to a default success implementation before each test
    stringify.mockImplementation((data, options, callback) => {
        callback(null, 'header1,header2\nvalue1,value2');
    });
  });

  // Test Case 1: Successful data export (Happy Path)
  it('should create a ZIP archive with correct data on success', async () => {
    // ---- 1. Arrange ----
    const mockGuests = [{ id: 1, name: 'John Doe' }];
    const mockEvent = { event_id: 'evt-123', name: 'Annual Gala' };

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'guests') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockGuests, error: null }),
        };
      }
      if (tableName === 'events') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
        };
      }
    });

    const req = { params: { eventId: 'evt-123' } };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // ---- 2. Act ----
    await exportEventData(req, res);

    // ---- 3. Assert ----
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
    expect(mockArchive.pipe).toHaveBeenCalledWith(res);
    expect(mockArchive.append).toHaveBeenCalledTimes(4);
    expect(mockArchive.finalize).toHaveBeenCalled();
  });

  // ** NEW TEST FOR BRANCH COVERAGE 1: Database Failure **
  it('should return a 500 error if fetching event data from Supabase fails', async () => {
    // ---- 1. Arrange ----
    const dbError = new Error('Database connection failed');
    supabase.from.mockImplementation((tableName) => {
        if (tableName === 'events') {
            // Make the events query fail
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: dbError }),
            };
        }
        // Let other calls succeed
        return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
        }
    });

    const req = { params: { eventId: 'evt-404' } };
    const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
    };

    // ---- 2. Act ----
    await exportEventData(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Failed to export event data.');
  });

  // ** NEW TEST FOR BRANCH COVERAGE 2: CSV Failure **
  it('should return a 500 error if CSV stringification fails', async () => {
    // ---- 1. Arrange ----
    // Let the Supabase calls succeed
    supabase.from.mockResolvedValue({ 
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [{id: 1}], error: null }),
        single: jest.fn().mockResolvedValue({ data: {id: 1}, error: null }),
    });

    // Mock the 'csv-stringify' library to fail for this specific test
    stringify.mockImplementation((data, options, callback) => {
        callback(new Error('CSV conversion failed'), null);
    });

    const req = { params: { eventId: 'evt-123' } };
    const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        setHeader: jest.fn(),
    };

    // ---- 2. Act ----
    await exportEventData(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Failed to export event data.');
  });
});