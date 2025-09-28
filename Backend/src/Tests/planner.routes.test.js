// This is the test file for your planner router.
// Place this file in: backend/src/Tests/planner.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the real controller function with a mock to test the routing layer.
const { getPlannerById } = require('../Controllers/planner.controller');

jest.mock('../Controllers/planner.controller', () => ({
  getPlannerById: jest.fn((req, res) => res.status(200).json({ message: 'controller called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
const plannerRouter = require('../Routes/planner.routes');
// Mount the router under a realistic base path, e.g., /api/planners
app.use('/api/planners', plannerRouter);


// --- The Test ---
describe('Planner Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route GET /api/planners/:id to the getPlannerById controller', async () => {
    const plannerId = 'planner-xyz-123';

    // Use Supertest to send a GET request to the endpoint
    const response = await request(app).get(`/api/planners/${plannerId}`);

    // Assert that the response is successful
    expect(response.statusCode).toBe(200);

    // Assert that the correct controller function was called exactly once
    expect(getPlannerById).toHaveBeenCalledTimes(1);
  });
});