// backend/src/Tests/export.routes.test.js

const request = require('supertest');
const express = require('express');

// ✨ FIX: Import the router you want to test BEFORE mocking its dependencies.
const exportRouter = require('../Routes/export.routes');

// --- Mock the Controller ---
// Now that the router is loaded, we can safely mock the controller it depends on.
const { exportEventData } = require('../Controllers/exportController');
jest.mock('../Controllers/exportController', () => ({
  exportEventData: jest.fn((req, res) => res.status(200).json({ message: 'controller called' })),
}));

// --- Setup a Test App ---
const app = express();
// Mount the (already imported) router
app.use('/api/events', exportRouter);

// --- The Test ---
describe('Export Routes', () => {

  beforeEach(() => {
    // Clear the mock's history before each test
    exportEventData.mockClear();
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