// This is the test file for your newEvent router.
// Place this file in: backend/src/Tests/newEvent.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the createEvent function with a Jest mock to check if it's called.
const { createEvent } = require('../Controllers/newEvent.controller');

jest.mock('../Controllers/newEvent.controller', () => ({
  createEvent: jest.fn((req, res) => res.status(201).json({ message: 'controller called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies is crucial for POST requests

const newEventRouter = require('../Routes/newEvent.routes');
// Mount the router under a realistic base path, e.g., /api/events
app.use('/api/events', newEventRouter);


// --- The Test ---
describe('New Event Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route POST /api/events to the createEvent controller', async () => {
    const newEventData = {
      name: 'Summer Music Festival',
      start_time: '2026-07-04T14:00:00Z',
      planner_id: 'planner-xyz-123',
    };

    // Use Supertest to send a POST request with a body
    const response = await request(app)
      .post('/api/events')
      .send(newEventData);

    // Assert that the response is successful (201 Created)
    expect(response.statusCode).toBe(201);

    // Assert that the createEvent controller function was called exactly once
    expect(createEvent).toHaveBeenCalledTimes(1);
  });
});