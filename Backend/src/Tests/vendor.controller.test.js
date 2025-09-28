// This is the full test file for your vendor controller.
// Place this file in: backend/src/Tests/vendor.controller.test.js

const { getVendorById, getAllVendors } = require('../Controllers/vendor.controller');
const supabase = require('../Config/supabase');

// Mock the Supabase client and its chained methods.
jest.mock('../Config/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn(),    // Mocked for getAllVendors
  single: jest.fn(),   // Mocked for getVendorById
}));

// A describe block for the getVendorById function
describe('getVendorById Controller', () => {
  // Before each test, reset mock function calls to ensure a clean state.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a vendor object and a 200 status for a valid ID', async () => {
    // ---- Arrange ----
    const mockVendorData = { vendor_id: 'v-123', business_name: 'Starlight Catering' };
    supabase.single.mockResolvedValue({ data: mockVendorData, error: null });

    const req = { params: { id: 'v-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getVendorById(req, res);

    // ---- Assert ----
    expect(supabase.from).toHaveBeenCalledWith('vendors');
    expect(supabase.eq).toHaveBeenCalledWith('vendor_id', 'v-123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockVendorData);
  });

  it('should return a 404 error if the vendor is not found', async () => {
    // ---- Arrange ----
    supabase.single.mockResolvedValue({ data: null, error: null });

    const req = { params: { id: 'v-nonexistent' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getVendorById(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Vendor not found' });
  });

  it('should return a 400 error if the vendor ID is missing', async () => {
    // ---- Arrange ----
    const req = { params: {} }; // No 'id' in params
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getVendorById(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Vendor ID is required' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should return a 500 error if the database query fails', async () => {
    // ---- Arrange ----
    const dbError = new Error('Connection failed');
    supabase.single.mockRejectedValue(dbError);

    const req = { params: { id: 'v-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getVendorById(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch vendor' });
  });
});

// A describe block for the getAllVendors function
describe('getAllVendors Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of all vendors and a 200 status', async () => {
    // ---- Arrange ----
    const mockVendorsData = [
      { vendor_id: 'v-1', business_name: 'A+ Venues' },
      { vendor_id: 'v-2', business_name: 'Zesty Catering' },
    ];
    supabase.order.mockResolvedValue({ data: mockVendorsData, error: null });

    const req = {}; // No params needed
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getAllVendors(req, res);

    // ---- Assert ----
    expect(supabase.from).toHaveBeenCalledWith('vendors');
    expect(supabase.order).toHaveBeenCalledWith('business_name', { ascending: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockVendorsData);
  });

  it('should return a 500 error if the database query fails', async () => {
    // ---- Arrange ----
    const dbError = new Error('Failed to execute query');
    supabase.order.mockRejectedValue(dbError);

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- Act ----
    await getAllVendors(req, res);

    // ---- Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch vendors' });
  });
});