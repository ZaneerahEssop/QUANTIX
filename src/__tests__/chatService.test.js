
import chatService from "../services/chatService";
import { io } from "socket.io-client";

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock global.fetch
global.fetch = jest.fn(() => Promise.resolve({}));

describe("ChatService", () => {
  const mockUserId = "user123";
  const mockConversationId = "conv123";
  const mockMessageText = "Hello, world!";
  const mockMessageType = "text";
  const mockSenderId = "sender123";
  const mockVendorId = "vendor123";
  const mockEventId = "event123";
  const mockApiUrl = "http://localhost:5000";

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chatService state to ensure singleton does not leak
    chatService.socket = null;
    chatService.isConnected = false;
    // Mock process.env.REACT_APP_BASE_URL
    process.env.REACT_APP_BASE_URL = mockApiUrl;
    // Mock console methods
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Reset fetch mock
    global.fetch.mockReset();
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe("WebSocket Methods", () => {
    const triggerConnect = () => {
      const connectCallback = mockSocket.on.mock.calls.find((call) => call[0] === "connect")[1];
      connectCallback();
    };

    test("connect initializes socket and joins user", () => {
      chatService.connect(mockUserId);
      expect(io).toHaveBeenCalledWith(mockApiUrl, {
        transports: ["websocket", "polling"],
        autoConnect: true,
      });
      expect(mockSocket.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("connect_error", expect.any(Function));

      // Simulate connect event
      triggerConnect();
      expect(chatService.isConnected).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith("join", mockUserId);
    });

    test("connect does not initialize new socket if already connected", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      const firstSocket = chatService.socket;
      chatService.connect(mockUserId);
      expect(chatService.socket).toBe(firstSocket);
      expect(io).toHaveBeenCalledTimes(1);
    });

    test("disconnect clears socket and sets isConnected to false", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      chatService.disconnect();
      expect(chatService.socket).toBeNull();
      expect(chatService.isConnected).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    test("joinConversation emits join_conversation event when connected", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      chatService.joinConversation(mockConversationId);
      expect(mockSocket.emit).toHaveBeenCalledWith("join_conversation", mockConversationId);
    });

    test("joinConversation does not emit when not connected", () => {
      chatService.joinConversation(mockConversationId);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test("sendMessage emits send_message event when connected", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      chatService.sendMessage(mockConversationId, mockSenderId, mockMessageText, mockMessageType);
      expect(mockSocket.emit).toHaveBeenCalledWith("send_message", {
        conversationId: mockConversationId,
        senderId: mockSenderId,
        messageText: mockMessageText,
        messageType: mockMessageType,
      });
    });

    test("sendMessage does not emit when not connected", () => {
      chatService.sendMessage(mockConversationId, mockSenderId, mockMessageText, mockMessageType);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test("sendTyping emits typing event when connected", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      chatService.sendTyping(mockConversationId, mockUserId, true);
      expect(mockSocket.emit).toHaveBeenCalledWith("typing", {
        conversationId: mockConversationId,
        userId: mockUserId,
        isTyping: true,
      });
    });

    test("sendTyping does not emit when not connected", () => {
      chatService.sendTyping(mockConversationId, mockUserId, true);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test("onNewMessage adds listener for new_message event", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      const callback = jest.fn();
      chatService.onNewMessage(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("new_message", callback);
    });

    test("onMessageError adds listener for message_error event", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      const callback = jest.fn();
      chatService.onMessageError(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("message_error", callback);
    });

    test("onTyping adds listener for user_typing event", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      const callback = jest.fn();
      chatService.onTyping(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("user_typing", callback);
    });

    test("onMessageNotification adds listener for message_notification event", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      const callback = jest.fn();
      chatService.onMessageNotification(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("message_notification", callback);
    });

    test("removeAllListeners clears all socket listeners", () => {
      chatService.connect(mockUserId);
      triggerConnect();
      chatService.removeAllListeners();
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe("API Methods", () => {
    beforeEach(() => {
      global.fetch.mockReset();
    });

    test("getOrCreateConversation sends POST request and returns data", async () => {
      const mockResponse = { conversationId: mockConversationId };
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await chatService.getOrCreateConversation(mockUserId, mockVendorId, mockEventId);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/chat/conversations`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plannerId: mockUserId,
            vendorId: mockVendorId,
            eventId: mockEventId,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test("getOrCreateConversation throws error on failed request", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(chatService.getOrCreateConversation(mockUserId, mockVendorId)).rejects.toThrow(
        "Failed to get or create conversation"
      );
    });

    test("getUserConversations fetches conversations for user", async () => {
      const mockResponse = [{ id: mockConversationId }];
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await chatService.getUserConversations(mockUserId);
      expect(global.fetch).toHaveBeenCalledWith(`${mockApiUrl}/api/chat/conversations/${mockUserId}`);
      expect(result).toEqual(mockResponse);
    });

    test("getUserConversations throws error on failed request", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(chatService.getUserConversations(mockUserId)).rejects.toThrow(
        "Failed to fetch conversations"
      );
    });

    test("getConversationMessages fetches messages with pagination", async () => {
      const mockResponse = [{ text: mockMessageText }];
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await chatService.getConversationMessages(mockConversationId, 2, 20);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/chat/conversations/${mockConversationId}/messages?page=2&limit=20`
      );
      expect(result).toEqual(mockResponse);
    });

    test("getConversationMessages throws error on failed request", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(chatService.getConversationMessages(mockConversationId)).rejects.toThrow(
        "Failed to fetch messages"
      );
    });

    test("sendMessageAPI sends POST request and returns data", async () => {
      const mockResponse = { messageId: "msg123" };
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await chatService.sendMessageAPI(mockConversationId, mockSenderId, mockMessageText, mockMessageType);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/chat/messages`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: mockConversationId,
            senderId: mockSenderId,
            messageText: mockMessageText,
            messageType: mockMessageType,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test("sendMessageAPI throws error on failed request", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(chatService.sendMessageAPI(mockConversationId, mockSenderId, mockMessageText)).rejects.toThrow(
        "Failed to send message"
      );
    });

    test("markMessagesAsRead sends POST request and returns data", async () => {
      const mockResponse = { success: true };
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await chatService.markMessagesAsRead(mockConversationId, mockUserId);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/chat/messages/read`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: mockConversationId,
            userId: mockUserId,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test("markMessagesAsRead throws error on failed request", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(chatService.markMessagesAsRead(mockConversationId, mockUserId)).rejects.toThrow(
        "Failed to mark messages as read"
      );
    });

    test("getUnreadCount fetches unread count and returns data", async () => {
      const mockResponse = { count: 5 };
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await chatService.getUnreadCount(mockUserId);
      expect(global.fetch).toHaveBeenCalledWith(`${mockApiUrl}/api/chat/unread/${mockUserId}`);
      expect(result).toEqual(mockResponse);
    });

    test("getUnreadCount throws error on failed request", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Server error"),
      });

      await expect(chatService.getUnreadCount(mockUserId)).rejects.toThrow(
        "Failed to fetch unread count: 500 - Server error"
      );
    });
  });
});