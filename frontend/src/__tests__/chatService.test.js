import { supabase } from "../client";
import chatService from "../services/chatService"; // Update with correct path

// Mock dependencies
jest.mock("../client", () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();
global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.location
delete window.location;
window.location = { origin: "http://localhost" };

describe("ChatService", () => {
  const mockUserId = "user-123";
  const mockConversationId = "conversation-456";
  const mockAPIUrl = "http://localhost"; // Match the window.location.origin

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the singleton instance state
    chatService.disconnect();
    chatService.removeAllListeners();
    chatService.processedMessages.clear();
    chatService.realtimeWorking.clear();
    
    // Reset global.fetch mock implementation
    global.fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      })
    );

    // Mock the API URL getter to return our test URL
    chatService.API_URL = mockAPIUrl;
  });

  afterEach(() => {
    chatService.disconnect();
  });

  describe("Singleton Instance", () => {
    test("should be a singleton instance", () => {
      expect(chatService).toBeInstanceOf(Object);
      expect(chatService.channels).toBeInstanceOf(Map);
      expect(chatService.isConnected).toBe(false);
    });

    test("should have all required methods", () => {
      expect(typeof chatService.connect).toBe("function");
      expect(typeof chatService.disconnect).toBe("function");
      expect(typeof chatService.joinConversation).toBe("function");
      expect(typeof chatService.sendMessage).toBe("function");
      expect(typeof chatService.onNewMessage).toBe("function");
      expect(typeof chatService.leaveConversation).toBe("function");
    });
  });

  describe("Constructor and Initialization", () => {
    test("should initialize with correct default values", () => {
      expect(chatService.channels).toBeInstanceOf(Map);
      expect(chatService.isConnected).toBe(false);
      expect(chatService.listeners).toBeInstanceOf(Map);
      expect(chatService.userId).toBeNull();
      expect(chatService.processedMessages).toBeInstanceOf(Set);
      expect(chatService.realtimeWorking).toBeInstanceOf(Map);
    });

    // Skip constructor URL tests since we're using singleton
    test("should get API URL correctly", () => {
      expect(chatService.API_URL).toBe(mockAPIUrl);
    });
  });

  describe("Connection Management", () => {
    test("should connect with user ID", () => {
      chatService.connect(mockUserId);

      expect(chatService.isConnected).toBe(true);
      expect(chatService.userId).toBe(mockUserId);
      expect(console.log).toHaveBeenCalledWith("Initializing Supabase Realtime for user:", mockUserId);
    });

    test("should not reconnect if already connected with same user", () => {
      chatService.connect(mockUserId);
      const initialLogCalls = console.log.mock.calls.length;

      chatService.connect(mockUserId);

      expect(console.log.mock.calls.length).toBe(initialLogCalls);
    });

    test("should disconnect and clear all channels", () => {
      // Set up some mock channels
      const mockChannel1 = { clear: jest.fn() };
      const mockChannel2 = { unsubscribe: jest.fn() };
      chatService.channels.set("test1", mockChannel1);
      chatService.channels.set("test2", mockChannel2);
      chatService.isConnected = true;
      chatService.userId = mockUserId;

      chatService.disconnect();

      expect(chatService.isConnected).toBe(false);
      expect(chatService.userId).toBeNull();
      expect(chatService.channels.size).toBe(0);
      expect(mockChannel1.clear).toHaveBeenCalled();
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel2);
      expect(console.log).toHaveBeenCalledWith("Disconnected from Supabase Realtime");
    });
  });

  describe("Conversation Management", () => {
    test("should not join conversation when not connected", () => {
      chatService.isConnected = false;
      
      chatService.joinConversation(mockConversationId);

      expect(console.warn).toHaveBeenCalledWith("Not connected to Supabase Realtime");
    });

    test("should not create duplicate conversation subscriptions", () => {
      chatService.connect(mockUserId);
      const channelKey = `conversation_${mockConversationId}`;
      
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      // First subscription
      chatService.joinConversation(mockConversationId);
      expect(supabase.channel).toHaveBeenCalledWith(channelKey);

      // Second subscription - should not create duplicate
      chatService.joinConversation(mockConversationId);
      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });

    test("should set up realtime subscription correctly", () => {
      chatService.connect(mockUserId);
      
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockImplementation((callback) => {
          callback('SUBSCRIBED');
          return mockChannel;
        }),
      };
      supabase.channel.mockReturnValue(mockChannel);

      chatService.joinConversation(mockConversationId);

      expect(supabase.channel).toHaveBeenCalledWith(`conversation_${mockConversationId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${mockConversationId}`
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    test("should start polling when realtime subscription fails", () => {
      chatService.connect(mockUserId);
      
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockImplementation((callback) => {
          callback('SUBSCRIPTION_ERROR');
          return mockChannel;
        }),
      };
      supabase.channel.mockReturnValue(mockChannel);

      jest.useFakeTimers();
      chatService.joinConversation(mockConversationId);

      expect(console.log).toHaveBeenCalledWith('Realtime failed, falling back to polling for conversation:', mockConversationId);
      expect(chatService.realtimeWorking.get(mockConversationId)).toBe(false);

      // Advance timers to trigger backup polling
      jest.advanceTimersByTime(5000);
      expect(console.log).toHaveBeenCalledWith('Starting backup polling for conversation:', mockConversationId);

      jest.useRealTimers();
    });
  });

  describe("Message Handling", () => {
    test("should handle new message with duplicate prevention", async () => {
      const mockMessage = { 
        message_id: "msg-123", 
        id: "msg-123", 
        created_at: "2023-01-01T00:00:00Z" 
      };
      const messageKey = `${mockConversationId}-${mockMessage.message_id}`;

      // Mock fetch response
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ ...mockMessage, processed: true }]),
        })
      );

      const mockCallback = jest.fn();
      chatService.onNewMessage(mockCallback);

      // First call
      await chatService.handleNewMessage(mockConversationId, mockMessage);
      
      // Second call with same message - should be ignored
      await chatService.handleNewMessage(mockConversationId, mockMessage);

      expect(chatService.processedMessages.has(messageKey)).toBe(true);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test("should use raw message when API call fails", async () => {
      const mockMessage = { 
        message_id: "msg-123", 
        id: "msg-123" 
      };

      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
        })
      );

      const mockCallback = jest.fn();
      chatService.onNewMessage(mockCallback);

      await chatService.handleNewMessage(mockConversationId, mockMessage);

      expect(mockCallback).toHaveBeenCalledWith(mockMessage);
    });

    test("should use raw message when API call throws error", async () => {
      const mockMessage = { 
        message_id: "msg-123", 
        id: "msg-123" 
      };

      global.fetch.mockImplementation(() => 
        Promise.reject(new Error("Network error"))
      );

      const mockCallback = jest.fn();
      chatService.onNewMessage(mockCallback);

      await chatService.handleNewMessage(mockConversationId, mockMessage);

      expect(mockCallback).toHaveBeenCalledWith(mockMessage);
      expect(console.error).toHaveBeenCalledWith('Error fetching complete message data:', expect.any(Error));
    });

    test("should clean up old processed messages", async () => {
      // Add more than 100 messages
      for (let i = 0; i < 150; i++) {
        chatService.processedMessages.add(`conv-${i}-msg-${i}`);
      }

      const mockMessage = { message_id: "new-msg", id: "new-msg" };
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockMessage]),
        })
      );

      await chatService.handleNewMessage(mockConversationId, mockMessage);

      expect(chatService.processedMessages.size).toBeLessThanOrEqual(101);
    });
  });

  describe("Polling Mechanism", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("should not start polling if realtime is working", () => {
      chatService.realtimeWorking.set(mockConversationId, true);
      
      chatService.startPollingForConversation(mockConversationId);

      expect(chatService.channels.has(`poll_${mockConversationId}`)).toBe(false);
    });

    test("should not start duplicate polling", () => {
      chatService.realtimeWorking.set(mockConversationId, false);
      chatService.channels.set(`poll_${mockConversationId}`, { clear: jest.fn() });
      
      chatService.startPollingForConversation(mockConversationId);

      // Should not create additional polling
      expect(chatService.channels.size).toBe(1);
    });


    test("should poll for new messages and process them directly", async () => {
      chatService.realtimeWorking.set(mockConversationId, false);
      
      const mockMessages = [
        { id: "msg-1", message_id: "msg-1", created_at: "2023-01-01T00:00:00Z" },
        { id: "msg-2", message_id: "msg-2", created_at: "2023-01-01T00:00:01Z" },
      ];

      // Mock the polling fetch to return messages
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/chat/conversations') && url.includes('limit=5')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMessages),
          });
        }
        // For handleNewMessage API calls, return empty array
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const mockCallback = jest.fn();
      chatService.onNewMessage(mockCallback);

      // Mock handleNewMessage to call callback directly with the message
      const originalHandleNewMessage = chatService.handleNewMessage;
      chatService.handleNewMessage = jest.fn().mockImplementation((conversationId, message) => {
        const callback = chatService.listeners.get('new_message');
        if (callback) {
          callback(message); // Call callback directly with the raw message
        }
      });

      chatService.startPollingForConversation(mockConversationId);

      // First poll
      jest.advanceTimersByTime(3000);
      
      // Wait for all promises to resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/chat/conversations/${mockConversationId}/messages?limit=5&since=`)
      );
      
      // handleNewMessage should be called for each message
      expect(chatService.handleNewMessage).toHaveBeenCalledTimes(2);
      
      // Restore original method
      chatService.handleNewMessage = originalHandleNewMessage;
    });

    test("should handle polling errors gracefully", async () => {
      chatService.realtimeWorking.set(mockConversationId, false);
      
      global.fetch.mockImplementation(() => 
        Promise.reject(new Error("Polling error"))
      );

      chatService.startPollingForConversation(mockConversationId);

      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      expect(console.error).toHaveBeenCalledWith('Polling error:', expect.any(Error));
    });
  });

  describe("Message Sending", () => {
    test("should send message successfully", async () => {
      const mockMessageData = {
        conversationId: mockConversationId,
        senderId: mockUserId,
        messageText: "Hello world",
        messageType: "text"
      };

      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "new-msg" }),
        })
      );

      await chatService.sendMessage(
        mockMessageData.conversationId,
        mockMessageData.senderId,
        mockMessageData.messageText,
        mockMessageData.messageType
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAPIUrl}/api/chat/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockMessageData),
        }
      );
    });

    test("should handle message sending errors", async () => {
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
        })
      );

      const mockErrorCallback = jest.fn();
      chatService.onMessageError(mockErrorCallback);

      await expect(
        chatService.sendMessage(mockConversationId, mockUserId, "Hello")
      ).rejects.toThrow("Failed to send message");

      expect(mockErrorCallback).toHaveBeenCalledWith({ error: "Failed to send message" });
    });
  });

  describe("Typing Indicators", () => {
    let mockChannel;
    let broadcastCallback;

    beforeEach(() => {
      chatService.connect(mockUserId);
      
      mockChannel = {
        on: jest.fn().mockImplementation((event, config, callback) => {
          if (event === 'broadcast' && config.event === 'typing') {
            broadcastCallback = callback;
          }
          return mockChannel;
        }),
        subscribe: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);
    });

    test("should send typing indicator", () => {
      chatService.sendTyping(mockConversationId, mockUserId, true);

      expect(supabase.channel).toHaveBeenCalledWith(`typing_${mockConversationId}`);
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: mockUserId, isTyping: true }
      });
    });

    test("should not send typing when not connected", () => {
      chatService.isConnected = false;

      chatService.sendTyping(mockConversationId, mockUserId, true);

      expect(supabase.channel).not.toHaveBeenCalled();
    });

    test("should handle typing callbacks from other users", () => {
      const mockTypingCallback = jest.fn();
      chatService.onTyping(mockTypingCallback);

      chatService.sendTyping(mockConversationId, mockUserId, true);

      // Simulate receiving typing event from another user
      const otherUserId = "user-other";
      broadcastCallback({
        payload: { userId: otherUserId, isTyping: true }
      });

      expect(mockTypingCallback).toHaveBeenCalledWith({
        userId: otherUserId,
        isTyping: true
      });
    });

    test("should not trigger typing callback for own typing", () => {
      const mockTypingCallback = jest.fn();
      chatService.onTyping(mockTypingCallback);

      chatService.sendTyping(mockConversationId, mockUserId, true);

      // Simulate receiving typing event from self
      broadcastCallback({
        payload: { userId: mockUserId, isTyping: true }
      });

      expect(mockTypingCallback).not.toHaveBeenCalled();
    });
  });

  describe("Event Listeners", () => {
    test("should set and trigger event listeners", () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const mockCallback3 = jest.fn();

      chatService.onNewMessage(mockCallback1);
      chatService.onMessageError(mockCallback2);
      chatService.onTyping(mockCallback3);
      chatService.onMessageNotification(jest.fn());

      // Trigger callbacks through internal methods
      chatService.listeners.get('new_message')('test message');
      chatService.listeners.get('message_error')('test error');
      chatService.listeners.get('user_typing')('test typing');

      expect(mockCallback1).toHaveBeenCalledWith('test message');
      expect(mockCallback2).toHaveBeenCalledWith('test error');
      expect(mockCallback3).toHaveBeenCalledWith('test typing');
    });

    test("should remove all listeners", () => {
      chatService.onNewMessage(jest.fn());
      chatService.onMessageError(jest.fn());
      
      expect(chatService.listeners.size).toBe(2);
      
      chatService.removeAllListeners();
      
      expect(chatService.listeners.size).toBe(0);
    });
  });

  describe("Conversation Leaving", () => {
    test("should leave conversation and clean up all channels", () => {
      // Set up various channel types
      const mockConvChannel = { unsubscribe: jest.fn() };
      const mockTypingChannel = { unsubscribe: jest.fn() };
      const mockPollChannel = { clear: jest.fn() };

      chatService.channels.set(`conversation_${mockConversationId}`, mockConvChannel);
      chatService.channels.set(`typing_${mockConversationId}`, mockTypingChannel);
      chatService.channels.set(`poll_${mockConversationId}`, mockPollChannel);
      chatService.realtimeWorking.set(mockConversationId, true);

      chatService.leaveConversation(mockConversationId);

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockConvChannel);
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockTypingChannel);
      expect(mockPollChannel.clear).toHaveBeenCalled();
      expect(chatService.channels.size).toBe(0);
      expect(chatService.realtimeWorking.has(mockConversationId)).toBe(false);
    });
  });

  describe("API Methods", () => {
    const mockPlannerId = "planner-123";
    const mockVendorId = "vendor-456";
    const mockEventId = "event-789";

    test("should get or create conversation", async () => {
      const mockConversation = { id: mockConversationId };
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConversation),
        })
      );

      const result = await chatService.getOrCreateConversation(mockPlannerId, mockVendorId, mockEventId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAPIUrl}/api/chat/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plannerId: mockPlannerId,
            vendorId: mockVendorId,
            eventId: mockEventId,
          }),
        }
      );
      expect(result).toEqual(mockConversation);
    });

    test("should handle get or create conversation error", async () => {
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
        })
      );

      await expect(
        chatService.getOrCreateConversation(mockPlannerId, mockVendorId, mockEventId)
      ).rejects.toThrow("Failed to get or create conversation");
    });

    test("should get user conversations", async () => {
      const mockConversations = [{ id: mockConversationId }];
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConversations),
        })
      );

      const result = await chatService.getUserConversations(mockUserId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAPIUrl}/api/chat/conversations/${mockUserId}`
      );
      expect(result).toEqual(mockConversations);
    });

    test("should get conversation messages", async () => {
      const mockMessages = [{ id: "msg-1" }, { id: "msg-2" }];
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
      );

      const result = await chatService.getConversationMessages(mockConversationId, 2, 25);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAPIUrl}/api/chat/conversations/${mockConversationId}/messages?page=2&limit=25`
      );
      expect(result).toEqual(mockMessages);
    });

    test("should mark messages as read", async () => {
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ updated: true }),
        })
      );

      const result = await chatService.markMessagesAsRead(mockConversationId, mockUserId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAPIUrl}/api/chat/messages/read`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: mockConversationId,
            userId: mockUserId,
          }),
        }
      );
      expect(result).toEqual({ updated: true });
    });

    test("should get unread count successfully", async () => {
      const mockUnreadCount = { count: 5 };
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUnreadCount),
        })
      );

      const result = await chatService.getUnreadCount(mockUserId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAPIUrl}/api/chat/unread/${mockUserId}`
      );
      expect(result).toEqual(mockUnreadCount);
    });

    test("should handle unread count API errors with detailed logging", async () => {
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
        })
      );

      await expect(chatService.getUnreadCount(mockUserId))
        .rejects.toThrow("Failed to fetch unread count: 500 - Internal Server Error");

      expect(console.error).toHaveBeenCalledWith(
        "Unread count API Error Response:",
        "Internal Server Error"
      );
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    test("should handle subscription status changes correctly", () => {
      chatService.connect(mockUserId);
      
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockImplementation((callback) => {
          // Simulate multiple status changes
          callback('SUBSCRIBED');
          callback('CLOSED');
          return mockChannel;
        }),
      };
      supabase.channel.mockReturnValue(mockChannel);

      chatService.joinConversation(mockConversationId);

      expect(chatService.realtimeWorking.get(mockConversationId)).toBe(false);
    });

    test("should handle empty message arrays in polling", async () => {
      chatService.realtimeWorking.set(mockConversationId, false);
      
      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      );

      const mockCallback = jest.fn();
      chatService.onNewMessage(mockCallback);

      jest.useFakeTimers();
      chatService.startPollingForConversation(mockConversationId);

      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      expect(mockCallback).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    test("should handle message without message_id", async () => {
      const mockMessage = { id: "msg-123", created_at: "2023-01-01T00:00:00Z" };
      const messageKey = `${mockConversationId}-${mockMessage.id}`;

      global.fetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockMessage]),
        })
      );

      const mockCallback = jest.fn();
      chatService.onNewMessage(mockCallback);

      await chatService.handleNewMessage(mockConversationId, mockMessage);

      expect(chatService.processedMessages.has(messageKey)).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith(mockMessage);
    });
  });
});