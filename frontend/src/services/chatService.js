import { supabase } from "../client.js";

class ChatService {
  constructor() {
    this.channels = new Map();
    this.isConnected = false;
    this.listeners = new Map();
    this.userId = null;
    this.API_URL = this.getApiUrl();
    this.processedMessages = new Set();
    this.realtimeWorking = new Map();
  }

  getApiUrl() {
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    } else {
      return window.location.origin;
    }
  }

  connect(userId) {
    if (this.isConnected && this.userId === userId) {
      return;
    }

    console.log("Initializing Supabase Realtime for user:", userId);

    this.userId = userId;
    this.isConnected = true;

    console.log("Connected to Supabase Realtime");
  }

  disconnect() {
    // Unsubscribe from all channels and clear polling intervals
    this.channels.forEach((channel) => {
      if (channel.clear) {
        // It's a polling interval
        channel.clear();
      } else {
        // It's a Supabase channel
        supabase.removeChannel(channel);
      }
    });
    this.channels.clear();
    this.isConnected = false;
    this.userId = null;
    console.log("Disconnected from Supabase Realtime");
  }

  // Join a conversation room (subscribe to messages for this conversation)
  joinConversation(conversationId) {
    if (!this.isConnected) {
      console.warn("Not connected to Supabase Realtime");
      return;
    }

    const channelKey = `conversation_${conversationId}`;

    // Don't create duplicate subscriptions
    if (this.channels.has(channelKey)) {
      return;
    }

    console.log("Subscribing to conversation:", conversationId);

    // Try Supabase Realtime first
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log('New message received via Realtime:', payload.new);
          this.handleNewMessage(conversationId, payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          this.realtimeWorking.set(conversationId, true);
        } else if (status === 'SUBSCRIPTION_ERROR' || status === 'CLOSED') {
          console.log('Realtime failed, falling back to polling for conversation:', conversationId);
          this.realtimeWorking.set(conversationId, false);
          this.startPollingForConversation(conversationId);
        }
      });

    this.channels.set(channelKey, channel);

    // Also start a backup polling mechanism with longer intervals
    setTimeout(() => {
      if (!this.realtimeWorking.get(conversationId)) {
        console.log('Starting backup polling for conversation:', conversationId);
        this.startPollingForConversation(conversationId);
      }
    }, 5000); // Wait 5 seconds to see if realtime works
  }

  // Helper method to handle new messages consistently
  async handleNewMessage(conversationId, rawMessage) {
    const messageKey = `${conversationId}-${rawMessage.message_id || rawMessage.id}`;

    // Prevent duplicate processing
    if (this.processedMessages.has(messageKey)) {
      return;
    }
    this.processedMessages.add(messageKey);

    // Clean up old processed messages (keep only last 100)
    if (this.processedMessages.size > 100) {
      const entries = Array.from(this.processedMessages);
      entries.slice(0, entries.length - 100).forEach(key => {
        this.processedMessages.delete(key);
      });
    }

    try {
      const response = await fetch(
        `${this.API_URL}/api/chat/conversations/${conversationId}/messages?limit=1&messageId=${rawMessage.message_id}`
      );

      if (response.ok) {
        const messages = await response.json();
        if (messages.length > 0) {
          const callback = this.listeners.get('new_message');
          if (callback) {
            callback(messages[0]);
          }
        }
      } else {
        // Fallback to raw payload if API call fails
        const callback = this.listeners.get('new_message');
        if (callback) {
          callback(rawMessage);
        }
      }
    } catch (error) {
      console.error('Error fetching complete message data:', error);
      // Fallback to raw payload
      const callback = this.listeners.get('new_message');
      if (callback) {
        callback(rawMessage);
      }
    }
  }

  // Polling fallback for when Realtime doesn't work
  startPollingForConversation(conversationId) {
    const pollKey = `poll_${conversationId}`;

    // Don't start duplicate polling
    if (this.channels.has(pollKey)) {
      return;
    }

    // Don't start polling if realtime is working
    if (this.realtimeWorking.get(conversationId)) {
      return;
    }

    let lastMessageTime = new Date().toISOString();

    const pollInterval = setInterval(async () => {
      // Stop polling if realtime starts working
      if (this.realtimeWorking.get(conversationId)) {
        clearInterval(pollInterval);
        this.channels.delete(pollKey);
        return;
      }

      try {
        const response = await fetch(
          `${this.API_URL}/api/chat/conversations/${conversationId}/messages?limit=5&since=${lastMessageTime}`
        );

        if (response.ok) {
          const messages = await response.json();

          // Process new messages using the same deduplication logic
          messages.forEach(message => {
            this.handleNewMessage(conversationId, message);
            lastMessageTime = message.created_at;
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Store the interval so we can clear it later
    this.channels.set(pollKey, { clear: () => clearInterval(pollInterval) });
  }

  // Send a message using REST API (real-time updates via Supabase subscription)
  async sendMessage(conversationId, senderId, messageText, messageType = "text") {
    try {
      await this.sendMessageAPI(conversationId, senderId, messageText, messageType);
      // Real-time update will come through the Supabase subscription
    } catch (error) {
      console.error("Failed to send message:", error);
      // Trigger error callback if available
      const errorCallback = this.listeners.get('message_error');
      if (errorCallback) {
        errorCallback({ error: "Failed to send message" });
      }
      throw error;
    }
  }

  // Send typing indicator using Supabase Broadcast
  sendTyping(conversationId, userId, isTyping) {
    if (!this.isConnected) {
      return;
    }

    const channelKey = `typing_${conversationId}`;
    let channel = this.channels.get(channelKey);

    if (!channel) {
      channel = supabase
        .channel(channelKey)
        .on('broadcast', { event: 'typing' }, (payload) => {
          // Trigger typing callback if available
          const callback = this.listeners.get('user_typing');
          if (callback && payload.payload.userId !== this.userId) {
            callback(payload.payload);
          }
        })
        .subscribe();

      this.channels.set(channelKey, channel);
    }

    // Send typing indicator
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping }
    });
  }

  // Listen for new messages
  onNewMessage(callback) {
    this.listeners.set('new_message', callback);
  }

  // Listen for message errors
  onMessageError(callback) {
    this.listeners.set('message_error', callback);
  }

  // Listen for typing indicators
  onTyping(callback) {
    this.listeners.set('user_typing', callback);
  }

  // Listen for message notifications (implement with polling or additional Supabase subscription)
  onMessageNotification(callback) {
    this.listeners.set('message_notification', callback);
    // Note: This could be implemented with a separate subscription to conversations table
    // or with periodic polling for unread counts
  }

  // Remove all listeners
  removeAllListeners() {
    this.listeners.clear();
  }

  // Leave a conversation (unsubscribe from its channel)
  leaveConversation(conversationId) {
    const channelKey = `conversation_${conversationId}`;
    const typingChannelKey = `typing_${conversationId}`;
    const pollKey = `poll_${conversationId}`;

    if (this.channels.has(channelKey)) {
      supabase.removeChannel(this.channels.get(channelKey));
      this.channels.delete(channelKey);
    }

    if (this.channels.has(typingChannelKey)) {
      supabase.removeChannel(this.channels.get(typingChannelKey));
      this.channels.delete(typingChannelKey);
    }

    if (this.channels.has(pollKey)) {
      const pollChannel = this.channels.get(pollKey);
      if (pollChannel.clear) {
        pollChannel.clear();
      }
      this.channels.delete(pollKey);
    }

    this.realtimeWorking.delete(conversationId);
  }

  // API calls for chat data
  async getOrCreateConversation(plannerId, vendorId, eventId = null) {
    const response = await fetch(`${this.API_URL}/api/chat/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plannerId,
        vendorId,
        eventId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get or create conversation");
    }

    return response.json();
  }

  async getUserConversations(userId) {
    const response = await fetch(
      `${this.API_URL}/api/chat/conversations/${userId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch conversations");
    }

    return response.json();
  }

  async getConversationMessages(conversationId, page = 1, limit = 50) {
    const response = await fetch(
      `${this.API_URL}/api/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch messages");
    }

    return response.json();
  }

  async sendMessageAPI(
    conversationId,
    senderId,
    messageText,
    messageType = "text"
  ) {
    const response = await fetch(`${this.API_URL}/api/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        senderId,
        messageText,
        messageType,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    return response.json();
  }

  async markMessagesAsRead(conversationId, userId) {
    const response = await fetch(`${this.API_URL}/api/chat/messages/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to mark messages as read");
    }

    return response.json();
  }

  async getUnreadCount(userId) {
    console.log("Fetching unread count for user:", userId);
    console.log("API URL:", `${this.API_URL}/api/chat/unread/${userId}`);

    const response = await fetch(`${this.API_URL}/api/chat/unread/${userId}`);

    console.log("Unread count response status:", response.status);
    console.log("Unread count response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Unread count API Error Response:", errorText);
      throw new Error(
        `Failed to fetch unread count: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Unread count data:", data);
    return data;
  }
}

// Create a singleton instance
const chatService = new ChatService();
export default chatService;
