// This is the test file for your chat router.
// Place this file in: backend/src/Tests/chat.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the actual controller functions with Jest mock functions.
// This allows us to check if they were called without executing the real database logic.
const {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
} = require('../Controllers/chat.controller');

jest.mock('../Controllers/chat.controller', () => ({
  // Each mock function sends a simple success response to end the request cycle.
  getOrCreateConversation: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
  getUserConversations: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
  getConversationMessages: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
  sendMessage: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
  markMessagesAsRead: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
  getUnreadCount: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
}));

// --- Setup a Test App ---
// We create a minimal Express app to run our router for the tests.
const app = express();
app.use(express.json()); // To parse request bodies
const chatRouter = require('../Routes/chat.routes');
app.use('/api/chat', chatRouter); // Mount the router under a base path


// --- The Tests ---
describe('Chat Routes', () => {

  beforeEach(() => {
    // Clear mock history before each test
    jest.clearAllMocks();
  });

  it('should route POST /api/chat/conversations to getOrCreateConversation', async () => {
    const response = await request(app).post('/api/chat/conversations').send({});
    expect(response.statusCode).toBe(200);
    expect(getOrCreateConversation).toHaveBeenCalledTimes(1);
  });

  it('should route GET /api/chat/conversations/:userId to getUserConversations', async () => {
    const response = await request(app).get('/api/chat/conversations/user-123');
    expect(response.statusCode).toBe(200);
    expect(getUserConversations).toHaveBeenCalledTimes(1);
  });

  it('should route GET /api/chat/conversations/:conversationId/messages to getConversationMessages', async () => {
    const response = await request(app).get('/api/chat/conversations/convo-123/messages');
    expect(response.statusCode).toBe(200);
    expect(getConversationMessages).toHaveBeenCalledTimes(1);
  });

  it('should route POST /api/chat/messages to sendMessage', async () => {
    const response = await request(app).post('/api/chat/messages').send({});
    expect(response.statusCode).toBe(200);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('should route POST /api/chat/messages/read to markMessagesAsRead', async () => {
    const response = await request(app).post('/api/chat/messages/read').send({});
    expect(response.statusCode).toBe(200);
    expect(markMessagesAsRead).toHaveBeenCalledTimes(1);
  });

  it('should route GET /api/chat/unread/:userId to getUnreadCount', async () => {
    const response = await request(app).get('/api/chat/unread/user-123');
    expect(response.statusCode).toBe(200);
    expect(getUnreadCount).toHaveBeenCalledTimes(1);
  });

});