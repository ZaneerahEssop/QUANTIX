// backend/src/Tests/deleteEvent.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We mock the controller to isolate the test to only the routing logic.
// We are checking if the route calls the correct function, not what the function does.
const { deleteEvents } = require('../Controllers/deleteEvent.controller');
jest.mock('../Controllers/deleteEvent.controller', () => ({
  deleteEvents: jest.fn((req, res) => res.status(200).json({ message: 'controller called' })),
}));

// --- Setup a Test App ---
const app = express();
// Import the router we want to test
const deleteRouter = require('../Routes/deleteEvent.routes');
// Mount the router on a base path to simulate your real application structure
app.use('/api/events', deleteRouter);

// --- The Test ---
describe('Delete Event Routes', () => {

  beforeEach(() => {
    // Clear the mock's history before each test to ensure isolation
    jest.clearAllMocks();
  });

  it('should route DELETE /api/events/:event_id to the deleteEvents controller', async () => {
    const eventId = 'evt-to-delete-123';

    // Act: Use Supertest to send a DELETE request to the endpoint
    const response = await request(app).delete(`/api/events/${eventId}`);

    // Assert: Check the outcome
    // 1. Assert that the response was successful (our mock returns 200)
    expect(response.statusCode).toBe(200);

    // 2. Assert that the deleteEvents controller function was called exactly once
    expect(deleteEvents).toHaveBeenCalledTimes(1);

    // 3. (Optional) Assert that the controller was called with the correct parameters
    const mockCall = deleteEvents.mock.calls[0];
    const req = mockCall[0];
    expect(req.params.event_id).toBe(eventId);
  });
});