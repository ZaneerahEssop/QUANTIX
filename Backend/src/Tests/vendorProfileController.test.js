// This is the corrected test file for your vendorProfile controller.
// The paths to the Supabase client have been fixed.

const { getVendorProfile } = require('../Controllers/vendorProfileController');
// Path corrected to match your other files
const supabase = require('../Config/supabase');

// Path corrected to match your other files
jest.mock('../Config/supabase', () => ({
  from: jest.fn(),
}));

describe('getVendorProfile Controller', () => {
  // Before each test, reset mock function calls to ensure a clean slate.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: The "happy path" - successfully fetching a profile with services.
  it('should return a combined vendor profile with a 200 status code', async () => {
    // ---- 1. Arrange ----
    const mockProfile = { vendor_id: 'user-123', business_name: 'Top Tier Events' };
    const mockServices = [{ service_type: 'Catering' }, { service_type: 'Music' }];

    // Mock the implementation of supabase.from to handle two different table names
    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'vendors') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (tableName === 'vendor_services') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockServices, error: null }),
        };
      }
    });

    const req = { params: { userId: 'user-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getVendorProfile(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(200);
    // Check that the final JSON has the profile data AND the combined services string
    expect(res.json).toHaveBeenCalledWith({
      ...mockProfile,
      service_type: 'Catering,Music', // Verifies the .join(',') logic
    });
    // Ensure both tables were queried
    expect(supabase.from).toHaveBeenCalledWith('vendors');
    expect(supabase.from).toHaveBeenCalledWith('vendor_services');
  });

  // Test Case 2: Vendor exists but has no services listed.
  it('should return the profile with an empty service_type string if no services are found', async () => {
    // ---- 1. Arrange ----
    const mockProfile = { vendor_id: 'user-456', business_name: 'Solo Artist' };
    // This time, the services query returns an empty array
    const mockServices = [];

    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'vendors') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (tableName === 'vendor_services') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockServices, error: null }),
        };
      }
    });

    const req = { params: { userId: 'user-456' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getVendorProfile(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...mockProfile,
      service_type: '', // An empty array joined results in an empty string
    });
  });

  // Test Case 3: Vendor profile is not found (testing specific PGRST116 error code).
  it('should return a 404 error if the vendor profile is not found', async () => {
    // ---- 1. Arrange ----
    const notFoundError = { code: 'PGRST116', message: 'Not Found' };
    supabase.from.mockImplementation((tableName) => {
      if (tableName === 'vendors') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: notFoundError }),
        };
      }
    });

    const req = { params: { userId: 'user-nonexistent' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getVendorProfile(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Vendor profile not found.' });
    // Verify the second database call was never made
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).not.toHaveBeenCalledWith('vendor_services');
  });

  // Test Case 4: Request is missing the user ID.
  it('should return a 400 error if userId is missing', async () => {
    // ---- 1. Arrange ----
    const req = { params: {} }; // No userId
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getVendorProfile(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'User ID is required.' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // Test Case 5: A generic database error occurs.
  it('should return a 500 error on a generic database failure', async () => {
    // ---- 1. Arrange ----
    const genericError = new Error('Database connection failed');
    supabase.from.mockImplementation(() => {
      // Make the first call fail
      throw genericError;
    });

    const req = { params: { userId: 'user-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // ---- 2. Act ----
    await getVendorProfile(req, res);

    // ---- 3. Assert ----
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve vendor profile.' });
  });
});