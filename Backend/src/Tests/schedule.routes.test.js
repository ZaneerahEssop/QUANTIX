// backend/src/Tests/schedule.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We mock the controller to isolate the test to the routing logic.
// This ensures we're only testing that the correct route calls the correct function.
const { getSchedule, replaceSchedule } = require('../Controllers/schedule.controller');
jest.mock('../Controllers/schedule.controller', () => ({
  getSchedule: jest.fn((req, res) => res.status(200).json({ message: 'getSchedule called' })),
  replaceSchedule: jest.fn((req, res) => res.status(200).json({ message: 'replaceSchedule called' })),
}));

// --- Setup a Test App ---
const app = express();
app.use(express.json()); // Add JSON body parser for the PUT request
// Import and mount the router we want to test
const scheduleRouter = require('../Routes/schedule.routes');
app.use('/api/events', scheduleRouter);

// --- The Tests ---
describe('Schedule Routes', () => {

  beforeEach(() => {
    // Clear mock history before each test
    jest.clearAllMocks();
  });

  // Test the GET route
  describe('GET /:event_id/schedule', () => {
    it('should route to the getSchedule controller', async () => {
      const eventId = 'evt-123';

      // Act: Send a GET request to the endpoint
      const response = await request(app).get(`/api/events/${eventId}/schedule`);

      // Assert: Check that the response is successful and the controller was called
      expect(response.statusCode).toBe(200);
      expect(getSchedule).toHaveBeenCalledTimes(1);
      
      // (Optional) Check that the controller received the correct event_id
      const mockCall = getSchedule.mock.calls[0];
      expect(mockCall[0].params.event_id).toBe(eventId);
    });
  });

  // Test the PUT route
  describe('PUT /:event_id/schedule', () => {
    it('should route to the replaceSchedule controller', async () => {
      const eventId = 'evt-456';
      const scheduleData = { schedule: [{ activity: 'New item' }] };

      // Act: Send a PUT request with a JSON body
      const response = await request(app)
        .put(`/api/events/${eventId}/schedule`)
        .send(scheduleData);

      // Assert: Check that the response is successful and the controller was called
      expect(response.statusCode).toBe(200);
      expect(replaceSchedule).toHaveBeenCalledTimes(1);

      // (Optional) Check that the controller received the correct params and body
      const mockCall = replaceSchedule.mock.calls[0];
      expect(mockCall[0].params.event_id).toBe(eventId);
      expect(mockCall[0].body).toEqual(scheduleData);
    });
  });
});