// This is the fully corrected test file for your email router.

const request = require('supertest');
const express = require('express');

// --- Mock the googleapis Library ---
const mockGmailSend = jest.fn();
const mockSetCredentials = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: mockSetCredentials,
      })),
    },
    gmail: jest.fn(() => ({
      users: {
        messages: {
          send: mockGmailSend,
        },
      },
    })),
  },
}));

// --- Setup a Test App ---
const app = express();
app.use(express.json());
const emailRouter = require('../Routes/email.routes');
app.use('/api/email', emailRouter);

// --- The Tests ---
describe('POST /api/email/send-invite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should send an email and return 200 on a successful request', async () => {
    mockGmailSend.mockResolvedValue({ data: { id: 'test-message-id' } });
    const requestBody = {
      guestEmail: 'test@example.com',
      guestName: 'John Doe',
      eventName: 'Annual Gala',
      googleAccessToken: 'fake-access-token',
      googleRefreshToken: 'fake-refresh-token',
    };
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    const response = await request(app).post('/api/email/send-invite').send(requestBody);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Invitation sent successfully!');
    expect(mockSetCredentials).toHaveBeenCalledWith({
      access_token: 'fake-access-token',
      refresh_token: 'fake-refresh-token',
    });
    expect(mockGmailSend).toHaveBeenCalledTimes(1);
  });

  it('should return 400 if required fields are missing', async () => {
    // ---- FIX IS HERE ----
    // We must provide the environment variables so the code can get past
    // the first check and test the request body validation.
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    const requestBody = {
      guestEmail: 'test@example.com',
      googleRefreshToken: 'fake-refresh-token',
    };

    const response = await request(app).post('/api/email/send-invite').send(requestBody);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Missing required information to send email.');
    expect(mockGmailSend).not.toHaveBeenCalled();
  });

  it('should return 401 if the Google API call fails with an auth error', async () => {
    const authError = new Error('Invalid Credentials');
    authError.code = 401;
    mockGmailSend.mockRejectedValue(authError);
    const requestBody = {
      guestEmail: 'test@example.com',
      googleAccessToken: 'invalid-token',
      googleRefreshToken: 'invalid-token',
    };
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

    const response = await request(app).post('/api/email/send-invite').send(requestBody);

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toContain('Google authentication failed');
  });
  
  it('should return 500 if Google OAuth environment variables are missing', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const requestBody = {
        guestEmail: 'test@example.com',
        googleAccessToken: 'fake-access-token',
        googleRefreshToken: 'fake-refresh-token',
      };

    const response = await request(app).post('/api/email/send-invite').send(requestBody);

    expect(response.statusCode).toBe(500);
    // ---- FIX IS HERE ----
    // Updated the expected error message to match the new one in the controller.
    expect(response.body.error).toBe('Email service is not configured correctly on the server.');
  });
});