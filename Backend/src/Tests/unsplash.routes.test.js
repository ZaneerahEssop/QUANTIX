// backend/src/Tests/unsplash.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the Controller ---
// We mock the controller to isolate the test to the routing logic.
// This ensures we're only testing that the correct route calls the correct function.
const { searchPhotos, registerDownload } = require('../Controllers/unsplash.controller');
jest.mock('../Controllers/unsplash.controller', () => ({
  searchPhotos: jest.fn((req, res) => res.status(200).json({ message: 'searchPhotos called' })),
  registerDownload: jest.fn((req, res) => res.status(200).json({ message: 'registerDownload called' })),
}));

// --- Setup a Test App ---
const app = express();
// Import and mount the router we want to test
const unsplashRouter = require('../Routes/unsplash.routes');
app.use('/api/unsplash', unsplashRouter); // Mount on a base path

// --- The Tests ---
describe('Unsplash Routes', () => {

  beforeEach(() => {
    // Clear mock history before each test
    jest.clearAllMocks();
  });

  // Test the search route
  describe('GET /api/unsplash/search', () => {
    it('should route to the searchPhotos controller', async () => {
      // Act: Send a GET request to the endpoint with a query parameter
      const response = await request(app).get('/api/unsplash/search?q=offices');

      // Assert: Check that the response is successful and the controller was called
      expect(response.statusCode).toBe(200);
      expect(searchPhotos).toHaveBeenCalledTimes(1);
      
      // (Optional) Check that the controller received the correct query parameter
      const mockCall = searchPhotos.mock.calls[0];
      expect(mockCall[0].query.q).toBe('offices');
    });
  });

  // Test the download registration route
  describe('GET /api/unsplash/photos/:photoId/download', () => {
    it('should route to the registerDownload controller', async () => {
      const photoId = 'abc-123';

      // Act: Send a GET request to the endpoint
      const response = await request(app).get(`/api/unsplash/photos/${photoId}/download`);

      // Assert: Check that the response is successful and the controller was called
      expect(response.statusCode).toBe(200);
      expect(registerDownload).toHaveBeenCalledTimes(1);

      // (Optional) Check that the controller received the correct photoId parameter
      const mockCall = registerDownload.mock.calls[0];
      expect(mockCall[0].params.photoId).toBe(photoId);
    });
  });
});