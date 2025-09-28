// This is the test file for your editEvent router.
// Place this file in: backend/src/Tests/editEvent.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the editEvent function with a Jest mock function.
// This lets us check if it was called without running the real database logic.
const { editEvent } = require('../Controllers/editEvent.controller');

jest.mock('../Controllers/editEvent.controller', () => ({
  editEvent: jest.fn((req, res) => res.status(200).json({ message: 'controller called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const editEventRouter = require('../Routes/editEvent.routes');
app.use('/api/events', editEventRouter); // Mount the router under a base path


// --- The Test ---
describe('Edit Event Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route PUT /api/events/:id to the editEvent controller', async () => {
    const eventId = 'event-123';
    const updateData = { name: 'Updated Conference Name' };

    // Use Supertest to send a PUT request to the endpoint
    const response = await request(app)
      .put(`/api/events/${eventId}`)
      .send(updateData);

    // Assert that the response is successful
    expect(response.statusCode).toBe(200);

    // Assert that the editEvent controller function was called exactly once
    expect(editEvent).toHaveBeenCalledTimes(1);
  });
});