// This is the test file for your vendorProfile router.
// Place this file in: backend/src/Tests/vendorProfile.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the real controller function with a mock to test the routing layer.
const { getVendorProfile } = require('../Controllers/vendorProfileController');

jest.mock('../Controllers/vendorProfileController', () => ({
  getVendorProfile: jest.fn((req, res) => res.status(200).json({ message: 'controller called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
const vendorProfileRouter = require('../Routes/vendorProfile.routes');
// The route path is defined in the router itself, so we can mount it at the root.
app.use('/', vendorProfileRouter);


// --- The Test ---
describe('Vendor Profile Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route GET /vendor-profile/:userId to the getVendorProfile controller', async () => {
    const userId = 'user-xyz-123';

    // Use Supertest to send a GET request to the endpoint
    const response = await request(app).get(`/vendor-profile/${userId}`);

    // Assert that the response is successful
    expect(response.statusCode).toBe(200);

    // Assert that the correct controller function was called exactly once
    expect(getVendorProfile).toHaveBeenCalledTimes(1);
  });
});