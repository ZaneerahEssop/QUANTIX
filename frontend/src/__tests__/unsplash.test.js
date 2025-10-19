// Mock the global fetch function before all tests
global.fetch = jest.fn();

describe('Unsplash API functions', () => {
  // Define variables to hold the functions from the module under test
  let searchUnsplashPhotos;
  let registerUnsplashDownload;

  // Store the original process.env to restore it after tests
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear the cache before each test run
    jest.resetModules();

    // Mock process.env for each test
    process.env = {
      ...originalEnv,
      REACT_APP_API_URL: 'http://localhost:3001',
    };

    // Dynamically import the module AFTER mocking the environment.
    // This ensures the module reads the mocked value instead of `undefined`.
    const unsplashModule = require('../services/unsplash');
    searchUnsplashPhotos = unsplashModule.searchUnsplashPhotos;
    registerUnsplashDownload = unsplashModule.registerUnsplashDownload;
  });

  afterEach(() => {
    // Restore the original environment and clear the fetch mock
    process.env = originalEnv;
    fetch.mockClear();
  });


  // --- Tests for searchUnsplashPhotos ---
  describe('searchUnsplashPhotos', () => {
    it('should fetch photos successfully from the API', async () => {
      const mockPhotos = { results: [{ id: '1', urls: { small: 'url' } }] };
      // Mock a successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotos,
      });

      const data = await searchUnsplashPhotos('events');
      
      // Check if fetch was called with the correct URL
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/unsplash/search?q=events&page=1&per_page=12'
      );
      // Check if the function returned the correct data
      expect(data).toEqual(mockPhotos);
    });

    it('should throw an error when the search API call fails', async () => {
      const mockError = { error: 'API limit reached' };
      // Mock a failed response
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockError,
      });

      // Expect the function to throw an error
      await expect(searchUnsplashPhotos('events')).rejects.toThrow(
        'API limit reached'
      );
    });
  });

  // --- Tests for registerUnsplashDownload ---
  describe('registerUnsplashDownload', () => {
    it('should register a download successfully', async () => {
      const mockResponse = { status: 'success' };
      // Mock a successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const data = await registerUnsplashDownload('photo-123');
      
      // Check if fetch was called with the correct URL
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/unsplash/photos/photo-123/download'
      );
      // Check if the function returned the correct data
      expect(data).toEqual(mockResponse);
    });

    it('should throw an error when registering a download fails', async () => {
      const mockError = { error: 'Invalid photo ID' };
      // Mock a failed response
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockError,
      });

      // Expect the function to throw an error
      await expect(registerUnsplashDownload('invalid-id')).rejects.toThrow(
        'Invalid photo ID'
      );
    });
  });
});

