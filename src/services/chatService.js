import { io } from 'socket.io-client';

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(userId) {
    if (this.socket && this.isConnected) {
      return;
    }

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    this.socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.isConnected = true;
      this.socket.emit('join', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join a conversation room
  joinConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  // Send a message
  sendMessage(conversationId, senderId, messageText, messageType = 'text') {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', {
        conversationId,
        senderId,
        messageText,
        messageType
      });
    }
  }

  // Send typing indicator
  sendTyping(conversationId, userId, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', {
        conversationId,
        userId,
        isTyping
      });
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  // Listen for message errors
  onMessageError(callback) {
    if (this.socket) {
      this.socket.on('message_error', callback);
    }
  }

  // Listen for typing indicators
  onTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  // Listen for message notifications
  onMessageNotification(callback) {
    if (this.socket) {
      this.socket.on('message_notification', callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // API calls for chat data
  async getOrCreateConversation(plannerId, vendorId, eventId = null) {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const response = await fetch(`${API_URL}/api/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plannerId,
        vendorId,
        eventId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get or create conversation');
    }

    return response.json();
  }

  async getUserConversations(userId) {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const response = await fetch(`${API_URL}/api/chat/conversations/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    return response.json();
  }

  async getConversationMessages(conversationId, page = 1, limit = 50) {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const response = await fetch(
      `${API_URL}/api/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }

  async sendMessageAPI(conversationId, senderId, messageText, messageType = 'text') {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const response = await fetch(`${API_URL}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        senderId,
        messageText,
        messageType
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  async markMessagesAsRead(conversationId, userId) {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const response = await fetch(`${API_URL}/api/chat/messages/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        userId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }

    return response.json();
  }

  async getUnreadCount(userId) {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    console.log('Fetching unread count for user:', userId);
    console.log('API URL:', `${API_URL}/api/chat/unread/${userId}`);
    
    const response = await fetch(`${API_URL}/api/chat/unread/${userId}`);

    console.log('Unread count response status:', response.status);
    console.log('Unread count response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unread count API Error Response:', errorText);
      throw new Error(`Failed to fetch unread count: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Unread count data:', data);
    return data;
  }
}

// Create a singleton instance
const chatService = new ChatService();
export default chatService;
