// This is the test file for your export router.
// Place this file in: backend/src/Tests/export.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the exportController with a mock. The goal is to check
// if the correct function is called, not to test the function's logic itself.
const { exportEventData } = require('../Controllers/exportController');

jest.mock('../Controllers/exportController', () => ({
  exportEventData: jest.fn((req, res) => res.status(200).json({ message: 'controller called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
const exportRouter = require('../Routes/export.routes');
// Mount the router under a realistic base path, e.g., /api/events
app.use('/api/events', exportRouter);


// --- The Test ---
describe('Export Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route GET /api/events/:eventId/export to the exportEventData controller', async () => {
    const eventId = 'event-123';

    // Use Supertest to send a GET request to the endpoint
    const response = await request(app).get(`/api/events/${eventId}/export`);

    // Assert that the response is successful
    expect(response.statusCode).toBe(200);

    // Assert that the exportEventData controller function was called exactly once
    expect(exportEventData).toHaveBeenCalledTimes(1);
  });
});