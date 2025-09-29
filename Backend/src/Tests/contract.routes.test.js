// This is the test file for your contract router.
// Place this file in: backend/src/Tests/contract.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We replace the real controller functions with mock functions to test the routing.
const {
    getContract,
    upsertContract,
    addRevision,
    signContract,
    exportContract
} = require('../Controllers/contract.controller');

jest.mock('../Controllers/contract.controller', () => ({
    getContract: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
    upsertContract: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
    addRevision: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
    signContract: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
    exportContract: jest.fn((req, res) => res.status(200).json({ message: 'called' })),
}));


// --- Setup a Test App ---
// Create a minimal Express app to mount the router for testing.
const app = express();
app.use(express.json()); // To parse JSON bodies for POST/PUT requests
const contractRouter = require('../Routes/contract.routes');
// Mount the router under a realistic base path
app.use('/api/contracts', contractRouter);


// --- The Tests ---
describe('Contract Routes', () => {

    // Clear mock history before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should route GET /event/:eventId/vendor/:vendorId to the getContract controller', async () => {
        const response = await request(app).get('/api/contracts/event/event-123/vendor/vendor-456');
        expect(response.statusCode).toBe(200);
        expect(getContract).toHaveBeenCalledTimes(1);
    });

    it('should route POST / to the upsertContract controller', async () => {
        const response = await request(app).post('/api/contracts').send({});
        expect(response.statusCode).toBe(200);
        expect(upsertContract).toHaveBeenCalledTimes(1);
    });

    it('should route PUT /:contractId/revise to the addRevision controller', async () => {
        const response = await request(app).put('/api/contracts/contract-789/revise').send({});
        expect(response.statusCode).toBe(200);
        expect(addRevision).toHaveBeenCalledTimes(1);
    });

    it('should route PUT /:contractId/sign to the signContract controller', async () => {
        const response = await request(app).put('/api/contracts/contract-789/sign').send({});
        expect(response.statusCode).toBe(200);
        expect(signContract).toHaveBeenCalledTimes(1);
    });

    it('should route GET /:contractId/export to the exportContract controller', async () => {
        const response = await request(app).get('/api/contracts/contract-789/export');
        expect(response.statusCode).toBe(200);
        expect(exportContract).toHaveBeenCalledTimes(1);
    });
});