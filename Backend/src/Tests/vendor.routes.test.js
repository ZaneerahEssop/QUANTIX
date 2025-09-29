// This is the test file for your vendor router.
// Place this file in: backend/src/Tests/vendor.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the real controller functions with mock functions to test the routing layer.
const { getAllVendors, getVendorById } = require('../Controllers/vendor.controller');

jest.mock('../Controllers/vendor.controller', () => ({
  getAllVendors: jest.fn((req, res) => res.status(200).json({ message: 'getAllVendors called' })),
  getVendorById: jest.fn((req, res) => res.status(200).json({ message: 'getVendorById called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
const vendorRouter = require('../Routes/vendor.routes');
// Mount the router under a realistic base path, e.g., /api/vendors
app.use('/api/vendors', vendorRouter);


// --- The Tests ---
describe('Vendor Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test suite for the first route: GET /
  describe('GET /api/vendors', () => {
    it('should call the getAllVendors controller function', async () => {
      // Use Supertest to send a GET request
      const response = await request(app).get('/api/vendors');

      // Assert that the response is successful
      expect(response.statusCode).toBe(200);

      // Assert that the correct controller function was called exactly once
      expect(getAllVendors).toHaveBeenCalledTimes(1);
    });
  });

  // Test suite for the second route: GET /:id
  describe('GET /api/vendors/:id', () => {
    it('should call the getVendorById controller function', async () => {
      const vendorId = 'vendor-xyz-123';

      // Use Supertest to send a GET request with a URL parameter
      const response = await request(app).get(`/api/vendors/${vendorId}`);

      // Assert that the response is successful
      expect(response.statusCode).toBe(200);

      // Assert that the correct controller function was called exactly once
      expect(getVendorById).toHaveBeenCalledTimes(1);
    });
  });
});