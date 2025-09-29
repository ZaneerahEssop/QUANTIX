const {
    getContract,
    upsertContract,
    addRevision,
    signContract,
    exportContract,
  } = require('../Controllers/contract.controller');
  const supabase = require('../Config/supabase');
  
  jest.mock('../Config/supabase', () => ({
    from: jest.fn(),
  }));
  
  describe('Contract Controller', () => {
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    // --- Tests for getContract --- (No changes needed)
    describe('getContract', () => {
      it('should return a contract if found', async () => {
        const mockContract = { id: 1, event_id: 'e1', vendor_id: 'v1' };
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockContract, error: null }),
        });
        const req = { params: { eventId: 'e1', vendorId: 'v1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getContract(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockContract);
      });
  
      it('should return null if contract is not found', async () => {
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        });
        const req = { params: { eventId: 'e1', vendorId: 'v1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getContract(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(null);
      });
    });
  
    // --- Tests for upsertContract --- (No changes needed)
    describe('upsertContract', () => {
      it('should create or update a contract and return 201', async () => {
        const mockContract = { event_id: 'e1', vendor_id: 'v1', content: 'Details' };
        supabase.from.mockReturnValue({
          upsert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockContract, error: null }),
        });
        const req = { body: mockContract };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await upsertContract(req, res);
  
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockContract);
      });
    });
  
    // --- Tests for addRevision ---
    describe('addRevision', () => {
      it('should add a revision and update the status', async () => {
        const initialContract = { id: 'c1', revisions: [{ comment: 'Initial' }] };
        const newRevision = { comment: 'Please change date' };
        const finalContract = { id: 'c1', revisions: [...initialContract.revisions, newRevision], status: 'revisions_requested' };
  
        // --- FIX IS HERE ---
        // 1. Create a single mock instance for .single() that is shared between DB calls.
        const singleMock = jest.fn()
          .mockResolvedValueOnce({ data: initialContract, error: null }) // For the first DB call (SELECT)
          .mockResolvedValueOnce({ data: finalContract, error: null });   // For the second DB call (UPDATE)
  
        // 2. Use that shared instance inside the mock implementation.
        supabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: singleMock, // Use the shared mock here
        }));
  
        const req = { params: { contractId: 'c1' }, body: { revision: newRevision } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await addRevision(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(finalContract);
      });
    });
  
    // --- Tests for signContract --- (No changes needed)
    describe('signContract', () => {
      it('should add the first signature without changing status to active', async () => {
        const partialContract = { id: 'c1', planner_signature: 'sig123', vendor_signature: null };
        supabase.from.mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: partialContract, error: null }),
        });
        const req = { params: { contractId: 'c1' }, body: { role: 'planner', signature: 'sig123' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await signContract(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(partialContract);
        expect(supabase.from.mock.calls.length).toBe(1);
      });
  
      it('should add the second signature and set status to active', async () => {
        const nearlyDoneContract = { id: 'c1', planner_signature: 'sig123', vendor_signature: 'sig456' };
        const finalContract = { ...nearlyDoneContract, status: 'active' };
  
        const singleMock = jest.fn()
          .mockResolvedValueOnce({ data: nearlyDoneContract, error: null })
          .mockResolvedValueOnce({ data: finalContract, error: null });
  
        supabase.from.mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: singleMock,
        });
  
        const req = { params: { contractId: 'c1' }, body: { role: 'vendor', signature: 'sig456' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await signContract(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(finalContract);
        expect(supabase.from.mock.calls.length).toBe(2);
      });
  
      it('should return 400 for an invalid role', async () => {
          const req = { params: { contractId: 'c1' }, body: { role: 'guest', signature: 'sig123' } };
          const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
          await signContract(req, res);
    
          expect(res.status).toHaveBeenCalledWith(400);
          expect(supabase.from).not.toHaveBeenCalled();
      });
    });
  
    // --- Tests for exportContract --- (No changes needed)
    describe('exportContract', () => {
      it('should return contract content as a downloadable file', async () => {
          const mockContract = { content: '# My Contract', event_id: 'e1', vendor_id: 'v1' };
          supabase.from.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockContract, error: null }),
          });
          const req = { params: { contractId: 'c1' } };
          const res = {
              setHeader: jest.fn(),
              status: jest.fn().mockReturnThis(),
              send: jest.fn(),
          };
  
          await exportContract(req, res);
  
          expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/markdown; charset=UTF-8');
          expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="contract_e1_v1.md"');
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith('# My Contract');
      });
  
      it('should return 404 if contract is not found for export', async () => {
          supabase.from.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
          });
          const req = { params: { contractId: 'c-nonexistent' } };
          const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
          await exportContract(req, res);
  
          expect(res.status).toHaveBeenCalledWith(404);
      });
    });
  });