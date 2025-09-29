// This is the test file for your getEvent router.
// Place this file in: backend/src/Tests/getEvent.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the real controller functions with mock functions to test the routing layer.
const { getEvents, getEventById } = require('../Controllers/getEvent.controller');

jest.mock('../Controllers/getEvent.controller', () => ({
  getEvents: jest.fn((req, res) => res.status(200).json({ message: 'getEvents called' })),
  getEventById: jest.fn((req, res) => res.status(200).json({ message: 'getEventById called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
const getEventRouter = require('../Routes/getEvent.routes');
// Mount the router under a realistic base path, e.g., /api/events
app.use('/api/events', getEventRouter);


// --- The Tests ---
describe('Get Event Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test suite for the first route: GET /
  describe('GET /api/events', () => {
    it('should call the getEvents controller function', async () => {
      // Use Supertest to send a GET request
      const response = await request(app).get('/api/events');

      // Assert that the response is successful
      expect(response.statusCode).toBe(200);

      // Assert that the correct controller function was called exactly once
      expect(getEvents).toHaveBeenCalledTimes(1);
    });
  });

  // Test suite for the second route: GET /id/:event_id
  describe('GET /api/events/id/:event_id', () => {
    it('should call the getEventById controller function', async () => {
      const eventId = 'test-event-123';

      // Use Supertest to send a GET request with a URL parameter
      const response = await request(app).get(`/api/events/id/${eventId}`);

      // Assert that the response is successful
      expect(response.statusCode).toBe(200);

      // Assert that the correct controller function was called exactly once
      expect(getEventById).toHaveBeenCalledTimes(1);
    });
  });
});