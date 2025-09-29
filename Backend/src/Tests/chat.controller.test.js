const {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
} = require('../Controllers/chat.controller');
const supabase = require('../Config/supabase');
const axios = require('axios'); // Import axios to mock it

// Mock the external dependencies
jest.mock('../Config/supabase', () => ({
  from: jest.fn(),
}));
jest.mock('axios');

describe('Chat Controller', () => {
  // Mock environment variables used in the controller
  const OLD_ENV = process.env;
  beforeAll(() => {
    process.env.MODERATION_API_URL = 'http://fake-api.com';
    process.env.MODERATION_API_KEY = 'fake-key';
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Also clear axios mocks
    axios.post.mockClear();
  });

  // --- Tests for getOrCreateConversation ---
  describe('getOrCreateConversation', () => {
    it('should return an existing conversation if found', async () => {
      const mockConversation = { id: 1, planner_id: 'p1', vendor_id: 'v1' };
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        // Update to reflect the use of maybeSingle()
        maybeSingle: jest.fn().mockResolvedValue({ data: mockConversation, error: null }),
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
      
      const mockSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      
      supabase.from
        .mockImplementationOnce(() => mockSelectChain) // For the SELECT call
        .mockImplementationOnce(() => ({ // For the INSERT call
          insert: jest.fn().mockReturnValue(mockInsertChain),
        }));
      
      const req = { body: { plannerId: 'p2', vendorId: 'v2' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      
      await getOrCreateConversation(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newConversation);
    });
    
    it('should return 500 if creating a conversation fails', async () => {
        const dbError = { message: 'Insert failed' };
        
        const mockSelectChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
        const mockInsertChain = {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: dbError }),
        };

        supabase.from
        .mockImplementationOnce(() => mockSelectChain)
        .mockImplementationOnce(() => ({
            insert: jest.fn().mockReturnValue(mockInsertChain),
        }));

        const req = { body: { plannerId: 'p2', vendorId: 'v2' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
        await getOrCreateConversation(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create conversation' });
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
    
    it('should return 500 if Supabase returns an error', async () => {
      const dbError = { message: 'Query failed' };
      supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: null, error: dbError }),
      });
      const req = { params: { userId: 'u1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await getUserConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch conversations' });
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

    it('should return 500 on a generic error', async () => {
      supabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockRejectedValue(new Error('Generic DB Error')),
      });
      const req = { params: { conversationId: 'c1' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      await getConversationMessages(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // --- UPDATED Tests for sendMessage ---
  describe('sendMessage', () => {
    const mockConversation = { id: 'c1', planner_id: 's1' };
    const mockMessage = { id: 1, sender: { name: 'S' } };
    let req, res;
  
    beforeEach(() => {
      req = { body: { conversationId: 'c1', senderId: 's1', messageText: 'This is a bad word' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });
  
    it('should send a censored message successfully after moderation', async () => {
      const censoredText = 'This is a *** word';
      // Mock a successful moderation API call
      axios.post.mockResolvedValue({ data: { censored_text: censoredText } });
  
      const mockInsertChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { ...mockMessage, message_text: censoredText }, error: null }),
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
          return { insert: jest.fn().mockReturnValue(mockInsertChain) };
        }
      });
  
      await sendMessage(req, res);
  
      expect(axios.post).toHaveBeenCalledWith(
        `${process.env.MODERATION_API_URL}/api/v1/check`,
        { text: req.body.messageText },
        expect.any(Object)
      );
  
      const messagesMock = supabase.from.mock.results[1].value;
      expect(messagesMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        message_text: censoredText,
      }));
  
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ...mockMessage, message_text: censoredText });
    });
  
    it('should send the original message if moderation API fails', async () => {
      axios.post.mockRejectedValue(new Error('API is down'));
  
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
      const mockInsertChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { ...mockMessage, message_text: req.body.messageText }, error: null }),
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
          return { insert: jest.fn().mockReturnValue(mockInsertChain) };
        }
      });
  
      await sendMessage(req, res);
  
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Moderation API call failed'), expect.any(String));
  
      const messagesMock = supabase.from.mock.results[1].value;
      expect(messagesMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        message_text: req.body.messageText,
      }));
  
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ...mockMessage, message_text: req.body.messageText });
  
      consoleErrorSpy.mockRestore();
    });

    it('should return 403 if user is not in conversation', async () => {
        const req = { body: { conversationId: 'c1', senderId: 's2', messageText: 'Test' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        
        axios.post.mockResolvedValue({ data: { censored_text: req.body.messageText } });
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        });

        await sendMessage(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });
  });
  
  // --- Tests for markMessagesAsRead ---
  describe('markMessagesAsRead', () => {
    it('should mark messages as read and return success', async () => {
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
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

    it('should return 500 if Supabase returns an error object', async () => {
        const dbError = { message: 'Update failed' };
        supabase.from.mockReturnValue({
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: dbError }),
                }),
            }),
        });
        const req = { body: { conversationId: 'c1', userId: 'u1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
        await markMessagesAsRead(req, res);
    
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to mark messages as read' });
    });
  });
  
  // --- Tests for getUnreadCount ---
  describe('getUnreadCount', () => {
    it('should return the unread message count', async () => {
      const mockConvos = [{ conversation_id: 'c1' }, { conversation_id: 'c2' }];
      supabase.from.mockImplementation(tableName => {
        if (tableName === 'conversations') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockConvos, error: null }),
          };
        }
        if (tableName === 'messages') {
          return {
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

    it('should return 500 if fetching user conversations fails', async () => {
        const dbError = { message: 'Failed to get conversations' };
        supabase.from.mockImplementation(tableName => {
            if (tableName === 'conversations') {
                return {
                    select: jest.fn().mockReturnThis(),
                    or: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockResolvedValue({ data: null, error: dbError }),
                };
            }
        });
        const req = { params: { userId: 'u1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await getUnreadCount(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch user conversations' });
    });
  });
});