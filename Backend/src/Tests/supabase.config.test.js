// This is the corrected test file for your Supabase configuration.

jest.mock('dotenv');

// Store the original environment variables
const originalEnv = process.env;

describe('Supabase Configuration', () => {

  beforeEach(() => {
    // Reset modules to force the config file to be re-evaluated for each test
    jest.resetModules();
    // Restore the original environment variables before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore the original environment variables after all tests are done
    process.env = originalEnv;
  });

  it('should throw an error if SUPABASE_URL is missing', () => {
    // Arrange: Delete the required environment variable
    delete process.env.SUPABASE_URL;

    // Act & Assert: We expect that requiring the module will now throw an error
    expect(() => {
      // --- PATH CORRECTED HERE ---
      require('../Config/supabase'); 
    }).toThrow('Missing Supabase environment variables');
  });

  it('should throw an error if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    // Arrange
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Act & Assert
    expect(() => {
      // --- PATH CORRECTED HERE ---
      require('../Config/supabase');
    }).toThrow('Missing Supabase environment variables');
  });

  it('should initialize successfully when all environment variables are present', () => {
    // Arrange: Ensure variables are set
    process.env.SUPABASE_URL = 'http://fake-url.com';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    // Act & Assert: We expect that requiring the module does NOT throw an error
    let supabaseClient;
    expect(() => {
      // --- PATH CORRECTED HERE ---
      supabaseClient = require('../Config/supabase');
    }).not.toThrow();

    expect(supabaseClient).toBeDefined();
  });
});