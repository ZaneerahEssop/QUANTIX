const {
    getOrCreateConversation,
    getUserConversations,
    getConversationMessages,
    sendMessage,
    markMessagesAsRead,
    getUnreadCount,
  } = require('../Controllers/chat.controller');
  const supabase = require('../Config/supabase');
  
  // Use a simpler base mock. We will define the specific chains inside each test.
  jest.mock('../Config/supabase', () => ({
    from: jest.fn(),
  }));
  
  describe('Chat Controller', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    // --- Tests for getOrCreateConversation ---
    describe('getOrCreateConversation', () => {
      it('should return an existing conversation if found', async () => {
        const mockConversation = { id: 1, planner_id: 'p1', vendor_id: 'v1' };
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockConversation, error: null }),
        });
        const req = { body: { plannerId: 'p1', vendorId: 'v1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getOrCreateConversation(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockConversation);
      });
  
      it('should create and return a new conversation if not found', async () => {
        const newConversation = { id: 2, planner_id: 'p2', vendor_id: 'v2' };
        const mockInsertChain = {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: newConversation, error: null }),
        };
        supabase.from.mockImplementation(tableName => {
          if (tableName === 'conversations') {
            if (supabase.from.mock.calls.length === 1) {
              return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            return {
              insert: jest.fn().mockReturnValue(mockInsertChain),
            };
          }
        });
        const req = { body: { plannerId: 'p2', vendorId: 'v2' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getOrCreateConversation(req, res);
  
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(newConversation);
      });
  
      it('should return 400 if required IDs are missing', async () => {
          const req = { body: { plannerId: 'p1' } };
          const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
          await getOrCreateConversation(req, res);
          expect(res.status).toHaveBeenCalledWith(400);
        });
    });
  
    // --- Tests for getUserConversations ---
    describe('getUserConversations', () => {
      it('should return conversations for a user', async () => {
        const mockConvos = [{ id: 1, planner: { name: 'P' }, vendor: { name: 'V' } }];
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockConvos, error: null }),
        });
        const req = { params: { userId: 'u1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getUserConversations(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockConvos);
      });
    });
  
    // --- Tests for getConversationMessages ---
    describe('getConversationMessages', () => {
      it('should return messages for a conversation', async () => {
        const mockMessages = [{ id: 1, message_text: 'Hello' }];
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
        });
        const req = { params: { conversationId: 'c1' }, query: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getConversationMessages(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockMessages);
      });
    });
  
    // --- Tests for sendMessage ---
    describe('sendMessage', () => {
      it('should send a message successfully', async () => {
          const mockConversation = { id: 'c1', planner_id: 's1' };
          const mockMessage = { id: 1, message_text: 'Test', sender: { name: 'S' } };
          const mockInsertChain = {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockMessage, error: null }),
          };
          supabase.from.mockImplementation(tableName => {
            if (tableName === 'conversations') {
              return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                or: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockConversation, error: null }),
              };
            }
            if (tableName === 'messages') {
              return {
                insert: jest.fn().mockReturnValue(mockInsertChain),
              };
            }
          });
          const req = { body: { conversationId: 'c1', senderId: 's1', messageText: 'Test' } };
          const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
          await sendMessage(req, res);
    
          expect(res.status).toHaveBeenCalledWith(201);
          expect(res.json).toHaveBeenCalledWith(mockMessage);
        });
    
        it('should return 403 if user is not in conversation', async () => {
          supabase.from.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              or: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          });
          const req = { body: { conversationId: 'c1', senderId: 's2', messageText: 'Test' } };
          const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
          await sendMessage(req, res);
    
          expect(res.status).toHaveBeenCalledWith(403);
        });
    });
  
    // --- Tests for markMessagesAsRead ---
    describe('markMessagesAsRead', () => {
      it('should mark messages as read and return success', async () => {
        // ** FIX IS HERE: This nested mock correctly represents the .eq().neq().eq() chain **
        supabase.from.mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({ // This is the first .eq()
            neq: jest.fn().mockReturnValue({ // This is the .neq()
              // The object returned by .neq() has the final .eq() that resolves
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        });
        const req = { body: { conversationId: 'c1', userId: 'u1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await markMessagesAsRead(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
      });
    });
  
    // --- Tests for getUnreadCount ---
    describe('getUnreadCount', () => {
      it('should return the unread message count', async () => {
        const mockConvos = [{ conversation_id: 'c1' }, { conversation_id: 'c2' }];
        supabase.from.mockImplementation(tableName => {
          if (tableName === 'conversations') {
            return { // Chain for first DB call
              select: jest.fn().mockReturnThis(),
              or: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: mockConvos, error: null }),
            };
          }
          if (tableName === 'messages') {
            return { // Chain for second DB call
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              neq: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
            };
          }
        });
        const req = { params: { userId: 'u1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getUnreadCount(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ unreadCount: 5 });
      });
  
      it('should return 0 if user has no conversations', async () => {
        supabase.from.mockImplementation(tableName => {
          if (tableName === 'conversations') {
            return {
              select: jest.fn().mockReturnThis(),
              or: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
        });
        const req = { params: { userId: 'u2' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getUnreadCount(req, res);
  
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ unreadCount: 0 });
      });
    });
  });