// This is the full, updated test file for your vendorRequest controller.
// It includes new tests to improve code coverage.

const {
    createVendorRequest,
    getVendorRequestByVendorId,
    getVendorRequestByEventId,
    updateVendorRequest,
  } = require('../Controllers/vendorRequest.controller');
  const supabase = require('../Config/supabase');
  
  // Mock the Supabase client and its chained methods.
  jest.mock('../Config/supabase', () => ({
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn(),
    single: jest.fn(),
  }));
  
  // A describe block for the createVendorRequest function
  describe('createVendorRequest', () => {
    beforeEach(() => jest.clearAllMocks());
  
    it('should create a vendor request and return 201 on success', async () => {
      // Arrange
      const mockRequest = { request_id: 1, event_id: 'e1', vendor_id: 'v1', requester_id: 'p1', status: 'pending' };
      supabase.single.mockResolvedValue({ data: mockRequest, error: null });
  
      const req = { body: { event_id: 'e1', vendor_id: 'v1', requester_id: 'p1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      // Act
      await createVendorRequest(req, res);
  
      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, request: mockRequest });
      expect(supabase.from).toHaveBeenCalledWith('vendor_requests');
      expect(supabase.insert).toHaveBeenCalledWith([{ event_id: 'e1', vendor_id: 'v1', requester_id: 'p1', status: 'pending' }]);
    });
  
    it('should return 400 if required fields are missing', async () => {
      // Arrange
      const req = { body: { event_id: 'e1' } }; // Missing vendor_id and requester_id
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      // Act
      await createVendorRequest(req, res);
  
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Event ID and Vendor ID and Requester ID are required' });
      expect(supabase.from).not.toHaveBeenCalled();
    });
  
    it('should return 500 on database insertion error', async () => {
      // Arrange
      supabase.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      const req = { body: { event_id: 'e1', vendor_id: 'v1', requester_id: 'p1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      
      // Act
      await createVendorRequest(req, res);
  
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insert failed' });
    });
  });
  
  // A describe block for getVendorRequestByVendorId
  describe('getVendorRequestByVendorId', () => {
    beforeEach(() => jest.clearAllMocks());
  
    it('should return requests for a vendor and a 200 status', async () => {
      // Arrange
      const mockData = [{ request_id: 1, status: 'pending', events: { name: 'Gala' } }];
      supabase.eq.mockResolvedValue({ data: mockData, error: null });
      const req = { params: { vendor_id: 'v1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      
      // Act
      await getVendorRequestByVendorId(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
      expect(supabase.eq).toHaveBeenCalledWith('vendor_id', 'v1');
    });
  
    it('should return an empty array with 200 status if no requests are found', async () => {
      // Arrange
      supabase.eq.mockResolvedValue({ data: [], error: null });
      const req = { params: { vendor_id: 'v2' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      // Act
      await getVendorRequestByVendorId(req, res);
  
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  
    // ** NEW TEST FOR COVERAGE **
    it('should return 500 if Supabase returns an error object', async () => {
      // Arrange
      const dbError = { message: 'Failed to query' };
      // Use mockResolvedValue to test the 'if (error)' block
      supabase.eq.mockResolvedValue({ data: null, error: dbError });
    
      const req = { params: { vendor_id: 'v1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
      // Act
      await getVendorRequestByVendorId(req, res);
    
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to query' });
    });
  });
  
  // A describe block for getVendorRequestByEventId
  describe('getVendorRequestByEventId', () => {
    beforeEach(() => jest.clearAllMocks());
  
    it('should return requests for an event and a 200 status', async () => {
      // Arrange
      const mockData = [{ request_id: 1, status: 'pending', vendor: { business_name: 'Catering Inc.' } }];
      supabase.eq.mockResolvedValue({ data: mockData, error: null });
      const req = { params: { event_id: 'e1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      // Act
      await getVendorRequestByEventId(req, res);
  
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
      expect(supabase.eq).toHaveBeenCalledWith('event_id', 'e1');
    });
  
    // ** NEW TEST FOR COVERAGE **
    it('should return 500 if Supabase returns an error object', async () => {
      // Arrange
      const dbError = { message: 'Query failed' };
      supabase.eq.mockResolvedValue({ data: null, error: dbError });
      const req = { params: { event_id: 'e1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      // Act
      await getVendorRequestByEventId(req, res);
  
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Query failed' });
    });
  });
  
  // A describe block for updateVendorRequest
  describe('updateVendorRequest', () => {
    beforeEach(() => jest.clearAllMocks());
  
    it('should update a request and return the updated data', async () => {
      // Arrange
      const updatedRequest = { request_id: 'r1', status: 'approved' };
      supabase.eq.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: updatedRequest, error: null }),
        }),
      });
  
      const req = { params: { id: 'r1' }, body: { status: 'approved' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      // Act
      await updateVendorRequest(req, res);
  
      // Assert
      expect(res.json).toHaveBeenCalledWith({ success: true, request: updatedRequest });
      expect(supabase.update).toHaveBeenCalledWith({ status: 'approved', event_id: undefined, vendor_id: undefined });
      expect(supabase.eq).toHaveBeenCalledWith('request_id', 'r1');
    });
  
    it('should return 500 if the database update fails', async () => {
      // Arrange
      supabase.eq.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error('Update failed')),
        }),
      });
  
      const req = { params: { id: 'r1' }, body: { status: 'approved' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      // Act
      await updateVendorRequest(req, res);
  
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update vendor request' });
    });
  });