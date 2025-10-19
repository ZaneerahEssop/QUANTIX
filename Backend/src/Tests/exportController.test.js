// backend/src/Tests/exportController.test.js

const { exportEventData } = require('../Controllers/exportController');
const supabase = require('../Config/supabase');
const archiver = require('archiver');
const { stringify } = require('csv-stringify');

// ---- Mocking External Dependencies ----

jest.mock('../Config/supabase', () => ({
  from: jest.fn(),
}));

const mockArchive = {
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn().mockResolvedValue(),
  on: jest.fn(),
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
      callback(null, 'csv,data\nvalue1,value2');
    });
    delete process.env.EXPORT_PUBLIC_TOKEN;
  });

  // Helper to create a complete mock response object for each test
  const createMockRes = () => ({
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  // Helper to mock the specific database call chains
  const mockSuccessfulDbCalls = () => {
    supabase.from.mockImplementation((tableName) => {
      switch (tableName) {
        case 'guests':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [{ name: 'John Doe' }], error: null }),
          };
        case 'vendor_requests':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ vendor_id: 'ven-abc' }], error: null }),
            }),
          };
        case 'vendors':
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [{ name: 'Super Catering' }], error: null }),
          };
        case 'events':
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { name: 'Annual Gala' }, error: null }),
          };
        default:
          return {};
      }
    });
  };

  // --- Main Success Path ---
  it('should create a ZIP archive when all data is fetched successfully', async () => {
    mockSuccessfulDbCalls();
    const req = { params: { eventId: 'evt-123' } };
    const res = createMockRes();

    await exportEventData(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
    expect(mockArchive.append).toHaveBeenCalledTimes(6);
    expect(mockArchive.finalize).toHaveBeenCalled();
  });

  // --- Token Authentication Tests ---
  describe('With Token Authentication', () => {
    beforeEach(() => {
      process.env.EXPORT_PUBLIC_TOKEN = 'secret-token';
    });

    it('should succeed if a valid token is provided in the header', async () => {
      mockSuccessfulDbCalls();
      const req = {
        params: { eventId: 'evt-123' },
        header: jest.fn().mockImplementation((key) => (key === 'x-export-token' ? 'secret-token' : undefined)),
        query: {},
      };
      const res = createMockRes();

      await exportEventData(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('should return 403 Forbidden if the token is missing', async () => {
      process.env.EXPORT_PUBLIC_TOKEN = 'secret-token';
      const req = {
        params: { eventId: 'evt-123' },
        header: jest.fn().mockImplementation((key) => undefined),
        query: {},
      };
      const res = createMockRes();

      await exportEventData(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: invalid or missing token');
    });

    it('should return 403 Forbidden if the token is invalid', async () => {
      process.env.EXPORT_PUBLIC_TOKEN = 'secret-token';
      const req = {
        params: { eventId: 'evt-123' },
        header: jest.fn().mockImplementation((key) => (key === 'x-export-token' ? 'wrong-token' : undefined)),
        query: {},
      };
      const res = createMockRes();

      await exportEventData(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: invalid or missing token');
    });
  });

  // --- CSV Stringify Failure Test ---
  it('should return a 500 error if CSV stringification fails', async () => {
    mockSuccessfulDbCalls();
    stringify.mockImplementation((data, options, callback) => {
      callback(new Error('CSV conversion failed'), null);
    });

    const req = { params: { eventId: 'evt-123' } };
    const res = createMockRes();

    await exportEventData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Failed to export event data.');
  });

  // --- Database Failure Test ---
  it('should return 500 if fetching guests fails', async () => {
    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'guests') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
    });

    const req = { params: { eventId: 'evt-123' } };
    const res = createMockRes();

    await exportEventData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Failed to export event data.');
  });
});