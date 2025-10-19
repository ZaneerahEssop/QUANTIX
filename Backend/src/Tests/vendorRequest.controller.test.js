// This is the final, fully corrected test file.
// It uses a more robust and specific mocking strategy to handle all test cases.

const {
  createVendorRequest,
  getVendorRequestByVendorId,
  getVendorRequestByEventId,
  updateVendorRequest,
} = require('../Controllers/vendorRequest.controller');
const supabase = require('../Config/supabase');

// A general mock setup for most of our controller functions.
// We make it chainable by default.
jest.mock('../Config/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn(),
  single: jest.fn(),
}));

// --- Tests for createVendorRequest (Working Correctly) ---
describe('createVendorRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create a vendor request and return 201 on success', async () => {
    const mockRequest = { request_id: 1, event_id: 'e1', vendor_id: 'v1', requester_id: 'p1', service_requested: 'Catering', status: 'pending' };
    supabase.single.mockResolvedValue({ data: mockRequest, error: null });
    const req = { body: { event_id: 'e1', vendor_id: 'v1', requester_id: 'p1', service_requested: 'Catering' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await createVendorRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, request: mockRequest });
  });

  it('should return 400 if required fields are missing', async () => {
    const req = { body: { event_id: 'e1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await createVendorRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Event ID, Vendor ID, Requester ID, and Service Requested are required' });
  });

  it('should return 500 on database insertion error', async () => {
    const dbError = { message: 'Insert failed' };
    supabase.single.mockResolvedValue({ data: null, error: dbError });
    const req = { body: { event_id: 'e1', vendor_id: 'v1', requester_id: 'p1', service_requested: 'Catering' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await createVendorRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insert failed' });
  });
});

// --- Tests for getVendorRequestBy... (Working Correctly) ---
describe('getVendorRequestByVendorId', () => {
    beforeEach(() => jest.clearAllMocks());
  
    it('should return requests for a vendor and a 200 status', async () => {
      const mockData = [{ request_id: 1, status: 'pending', events: { name: 'Gala' } }];
      supabase.eq.mockResolvedValue({ data: mockData, error: null });
      const req = { params: { vendor_id: 'v1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await getVendorRequestByVendorId(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
    });
  
    it('should return an empty array with 200 status if no requests are found', async () => {
      supabase.eq.mockResolvedValue({ data: [], error: null });
      const req = { params: { vendor_id: 'v2' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await getVendorRequestByVendorId(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  
    it('should return 500 if Supabase returns an error object', async () => {
      const dbError = { message: 'Failed to query' };
      supabase.eq.mockResolvedValue({ data: null, error: dbError });
      const req = { params: { vendor_id: 'v1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await getVendorRequestByVendorId(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to query' });
    });
});

describe('getVendorRequestByEventId', () => {
    beforeEach(() => jest.clearAllMocks());
  
    it('should return requests for an event and a 200 status', async () => {
      const mockData = [{ request_id: 1, status: 'pending', vendor: { business_name: 'Catering Inc.' } }];
      supabase.eq.mockResolvedValue({ data: mockData, error: null });
      const req = { params: { event_id: 'e1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await getVendorRequestByEventId(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
    });
  
    it('should return 500 if Supabase returns an error object', async () => {
      const dbError = { message: 'Query failed' };
      supabase.eq.mockResolvedValue({ data: null, error: dbError });
      const req = { params: { event_id: 'e1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await getVendorRequestByEventId(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Query failed' });
    });
});

// ✨ --- CORRECTED TEST BLOCK FOR updateVendorRequest --- ✨
describe('updateVendorRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should update a request status and return the updated data', async () => {
    const updatedRequest = { request_id: 'r1', status: 'approved' };
    
    // ✨ FIX: Explicitly mock the full `.eq().select().single()` chain.
    const singleMock = jest.fn().mockResolvedValue({ data: updatedRequest, error: null });
    const selectMock = jest.fn(() => ({ single: singleMock }));
    supabase.eq.mockImplementation(() => ({ select: selectMock }));

    const req = { params: { id: 'r1' }, body: { status: 'approved' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateVendorRequest(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, request: updatedRequest });
    expect(supabase.update).toHaveBeenCalledWith({ status: 'approved' });
  });

  it('should update booking_notes and quoted_price', async () => {
    const updatePayload = { booking_notes: 'Confirmed deposit', quoted_price: 1500 };
    const updatedRequest = { request_id: 'r1', ...updatePayload };
    
    const singleMock = jest.fn().mockResolvedValue({ data: updatedRequest, error: null });
    const selectMock = jest.fn(() => ({ single: singleMock }));
    supabase.eq.mockImplementation(() => ({ select: selectMock }));
    
    const req = { params: { id: 'r1' }, body: updatePayload };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateVendorRequest(req, res);

    expect(supabase.update).toHaveBeenCalledWith(updatePayload);
    expect(res.json).toHaveBeenCalledWith({ success: true, request: updatedRequest });
  });

  it('should return 400 if no valid update fields are provided', async () => {
    const req = { params: { id: 'r1' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await updateVendorRequest(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'At least one field (status, booking_notes, quoted_price) is required' });
  });

  it('should return 500 if the database update fails', async () => {
    const dbError = { message: 'Update failed' };

    const singleMock = jest.fn().mockResolvedValue({ data: null, error: dbError });
    const selectMock = jest.fn(() => ({ single: singleMock }));
    supabase.eq.mockImplementation(() => ({ select: selectMock }));

    const req = { params: { id: 'r1' }, body: { status: 'approved' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateVendorRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: dbError.message });
  });
});