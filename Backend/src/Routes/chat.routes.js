const express = require('express');
const {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount
} = require('../Controllers/chat.controller');

const router = express.Router();

// Get or create a conversation between planner and vendor
router.post('/conversations', getOrCreateConversation);

// Get all conversations for a user
router.get('/conversations/:userId', getUserConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', getConversationMessages);

// Send a message
router.post('/messages', sendMessage);

// Mark messages as read
router.post('/messages/read', markMessagesAsRead);

// Get unread message count for a user
router.get('/unread/:userId', getUnreadCount);

module.exports = router;
