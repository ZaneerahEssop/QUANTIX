const { exportEventData } = require('../Controllers/exportController');
const supabase = require('../Config/supabase');
const archiver = require('archiver');
const { stringify } = require('csv-stringify');

// ---- Mocking External Dependencies ----

jest.mock('../Config/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn(),
}));

const mockArchive = {
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn().mockResolvedValue(),
};
jest.mock('archiver', () => jest.fn(() => mockArchive));

jest.mock('csv-stringify', () => ({
  stringify: jest.fn(),
}));

// ---- Test Suite ----

describe('exportEventData Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stringify.mockImplementation((data, options, callback) => {
      callback(null, 'header1,header2\nvalue1,value2');
    });
  });

  // Test Case 1: Successful data export with vendors (Happy Path)
  it('should create a ZIP archive with guests, event, and vendor data', async () => {
    // ---- 1. Arrange ----
    const mockGuests = [{ id: 1, name: 'John Doe' }];
    const mockEvent = { event_id: 'evt-123', name: 'Annual Gala' };
    const mockVendorRequests = [{ vendor_id: 'ven-abc' }];
    const mockVendors = [{ id: 'ven-abc', name: 'Super Catering' }];

    // This mock now correctly handles all chained database calls
    supabase.from.mockImplementation((tableName) => {
      switch (tableName) {
        case 'guests':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockGuests, error: null }),
          };
        case 'vendor_requests':
          // This robust mock handles the chained .eq().eq() calls
          const vendorRequestsQuery = {
             eq: jest.fn().mockResolvedValue({ data: mockVendorRequests, error: null }),
          };
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue(vendorRequestsQuery),
          };
        case 'vendors':
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: mockVendors, error: null }),
          };
        case 'events':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        default:
          return { from: jest.fn() };
      }
    });

    const req = { params: { eventId: 'evt-123' } };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    // ---- 2. Act ----
    await exportEventData(req, res);

    // ---- 3. Assert ----
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
    expect(mockArchive.pipe).toHaveBeenCalledWith(res);
    expect(mockArchive.append).toHaveBeenCalledTimes(6);
    expect(mockArchive.finalize).toHaveBeenCalled();
  });

  // Test Case 2: Successful export when NO vendors are found
  it('should not query the vendors table if no accepted vendors are found', async () => {
    // ---- 1. Arrange ----
    const mockGuests = [{ id: 1, name: 'John Doe' }];
    const mockEvent = { event_id: 'evt-123', name: 'Annual Gala' };

    supabase.from.mockImplementation((tableName) => {
      switch (tableName) {
        case 'guests':
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: mockGuests, error: null }) };
        case 'vendor_requests':
          // This mock now correctly returns an empty array for the vendor requests
          const emptyVendorQuery = { eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnValue(emptyVendorQuery) };
        case 'events':
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }) };
      }
    });

    const req = { params: { eventId: 'evt-123' } };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    // ---- 2. Act ----
    await exportEventData(req, res);

    // ---- 3. Assert ----
    // **CORRECTED ASSERTION**: We check that 'vendors' table was NOT called.
    expect(supabase.from).not.toHaveBeenCalledWith('vendors');
    expect(mockArchive.append).toHaveBeenCalledTimes(6); // Still appends empty vendor files
    expect(mockArchive.finalize).toHaveBeenCalled();
  });

  // ... (Your other two error tests can remain here) ...
});
  // Test Case 4: CSV Failure
  it('should return a 500 error if CSV stringification fails', async () => {
    // ---- 1. Arrange ----
    // Mock successful Supabase calls
    supabase.from.mockImplementation((tableName) => {
        return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
            in: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
            single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
        };
    });

    // Mock the 'csv-stringify' library to fail
    stringify.mockImplementation((data, options, callback) => {
      callback(new Error('CSV conversion failed'), null);
    });

    const req = { params: { eventId: 'evt-123' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn(), setHeader: jest.fn() };

    // ---- 2. Act ----
    await exportEventData(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Failed to export event data.');
  });