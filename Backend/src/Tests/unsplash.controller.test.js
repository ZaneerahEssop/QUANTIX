// backend/src/Tests/unsplash.controller.test.js

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { searchPhotos, registerDownload } = require('../Controllers/unsplash.controller');

// --- Mock Setup ---
const mock = new MockAdapter(axios);
const UNSPLASH_API_BASE = process.env.UNSPLASH_API_BASE || "https://api.unsplash.com";

describe('Unsplash Controller', () => {

  beforeEach(() => {
    // Reset the mock adapter and environment variables before each test
    mock.reset();
    delete process.env.UNSPLASH_ACCESS_KEY;
  });

  // --- Tests for searchPhotos ---
  describe('searchPhotos', () => {

    it('should return formatted photo results on a successful search', async () => {
      // Arrange
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      const query = 'offices';
      const mockResponse = {
        total: 1,
        total_pages: 1,
        results: [
          {
            id: '123',
            alt_description: 'A modern office space',
            description: 'Photo of an office.',
            urls: { regular: 'http://example.com/photo.jpg' },
            user: { name: 'John Doe', username: 'johndoe' },
            links: { download_location: 'http://api.unsplash.com/download/123' },
          },
        ],
      };
      mock.onGet(`${UNSPLASH_API_BASE}/search/photos`).reply(200, mockResponse);

      const req = { query: { q: query } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      // Act
      await searchPhotos(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        total: 1,
        total_pages: 1,
        results: [
          {
            id: '123',
            alt_description: 'A modern office space',
            description: 'Photo of an office.',
            urls: { regular: 'http://example.com/photo.jpg' },
            user: { name: 'John Doe', username: 'johndoe' },
            links: { download_location: 'http://api.unsplash.com/download/123' },
          },
        ],
      });
    });

    it('should return 500 if UNSPLASH_ACCESS_KEY is not set', async () => {
      const req = { query: { q: 'test' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await searchPhotos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing UNSPLASH_ACCESS_KEY env variable on server' });
    });

    it('should return 400 if the query parameter "q" is missing', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      const req = { query: {} }; // No 'q' parameter
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await searchPhotos(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Missing required query parameter 'q'" });
    });

    it('should return the upstream error status and message if the Unsplash API fails', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-key';
      mock.onGet(`${UNSPLASH_API_BASE}/search/photos`).reply(401, { errors: ['OAuth error: The access token is invalid'] });
      
      const req = { query: { q: 'test' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await searchPhotos(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'OAuth error: The access token is invalid' });
    });
  });

  // --- Tests for registerDownload ---
  describe('registerDownload', () => {
    
    it('should return the download URL on successful registration', async () => {
        process.env.UNSPLASH_ACCESS_KEY = 'test-key';
        const photoId = 'photo-abc';
        const mockResponse = { url: 'http://example.com/download-url' };
        mock.onGet(`${UNSPLASH_API_BASE}/photos/${photoId}/download`).reply(200, mockResponse);

        const req = { params: { photoId } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await registerDownload(req, res);

        expect(res.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should return 400 if photoId is missing', async () => {
        const req = { params: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await registerDownload(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing photoId' });
    });

    it('should return an error if the Unsplash API fails to register the download', async () => {
        process.env.UNSPLASH_ACCESS_KEY = 'test-key';
        const photoId = 'photo-abc';
        mock.onGet(`${UNSPLASH_API_BASE}/photos/${photoId}/download`).reply(404, { error: 'Photo not found' });
        
        const req = { params: { photoId } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await registerDownload(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Photo not found' });
    });
  });
});