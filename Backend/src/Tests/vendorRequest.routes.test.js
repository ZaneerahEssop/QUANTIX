// This is the test file for your vendorRequest router.
// Place this file in: backend/src/Tests/vendorRequest.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the real controller functions with mock functions to test the routing.
const {
  createVendorRequest,
  getVendorRequestByVendorId,
  getVendorRequestByEventId,
  updateVendorRequest,
} = require('../Controllers/vendorRequest.controller');

jest.mock('../Controllers/vendorRequest.controller', () => ({
  createVendorRequest: jest.fn((req, res) => res.status(201).json({ message: 'called' })),
  getVendorRequestByVendorId: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
  getVendorRequestByEventId: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
  updateVendorRequest: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
app.use(express.json());
const vendorRequestRouter = require('../Routes/vendorRequest.routes');
// Mount the router under a realistic base path
app.use('/api/vendor-requests', vendorRequestRouter);


// --- The Tests ---
describe('Vendor Request Routes', () => {

  // Clear mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route POST / to the createVendorRequest controller', async () => {
    const response = await request(app).post('/api/vendor-requests').send({});
    expect(response.statusCode).toBe(201);
    expect(createVendorRequest).toHaveBeenCalledTimes(1);
  });

  it('should route GET /event/:event_id to the getVendorRequestByEventId controller', async () => {
    const response = await request(app).get('/api/vendor-requests/event/event-123');
    expect(response.statusCode).toBe(200);
    expect(getVendorRequestByEventId).toHaveBeenCalledTimes(1);
  });

  it('should route GET /:vendor_id to the getVendorRequestByVendorId controller', async () => {
    const response = await request(app).get('/api/vendor-requests/vendor-456');
    expect(response.statusCode).toBe(200);
    expect(getVendorRequestByVendorId).toHaveBeenCalledTimes(1);
  });

  it('should route PUT /:id to the updateVendorRequest controller', async () => {
    const response = await request(app).put('/api/vendor-requests/request-789').send({});
    expect(response.statusCode).toBe(200);
    expect(updateVendorRequest).toHaveBeenCalledTimes(1);
  });
});