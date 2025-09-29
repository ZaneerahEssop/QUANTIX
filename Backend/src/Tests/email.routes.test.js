const request = require('supertest');
const express = require('express');

// --- Mock the nodemailer Library ---
// We tell Jest that whenever 'nodemailer' is required, it should
// return our custom mock implementation instead of the real one.
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

const emailRouter = require('../Routes/email.routes'); // Adjust path to your route file

// --- Setup a Test App ---
const app = express();
app.use(express.json());
// Mount the router you want to test
app.use('/api', emailRouter);

// --- The Tests ---
describe('POST /api/send-invite', () => {
  const originalEnv = process.env;

  // Before each test, we clear all mock history and reset the environment
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  // After all tests are done, restore the original environment
  afterAll(() => {
    process.env = originalEnv;
  });

  it('should send an email and return 200 on a successful request', async () => {
    // Arrange: Set up environment variables and a valid request body
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
    const requestBody = {
      guestEmail: 'recipient@example.com',
      guestName: 'Jane Doe',
      eventName: 'The Grand Event',
    };

    // Mock a successful response from sendMail
    mockSendMail.mockResolvedValue({ messageId: 'mock-message-id' });

    // Act: Send the request to the endpoint
    const response = await request(app).post('/api/send-invite').send(requestBody);

    // Assert: Check the results
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Invitation sent successfully!');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    // You can also check if it was called with the correct details
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@example.com',
        subject: "🎉 You're Invited to The Grand Event!",
        html: expect.stringContaining('Hi Jane Doe,'),
      })
    );
  });

  it('should return 400 if required fields are missing from the body', async () => {
    // Arrange: Set up environment, but the body is missing 'eventName'
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
    const requestBody = {
      guestEmail: 'recipient@example.com',
      guestName: 'Jane Doe',
      // eventName is missing
    };

    // Act
    const response = await request(app).post('/api/send-invite').send(requestBody);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe(
      'Missing required fields: guestEmail, guestName, or eventName'
    );
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should return 500 if nodemailer fails to send the email', async () => {
    // Arrange: Set up a valid request
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
    const requestBody = {
      guestEmail: 'recipient@example.com',
      guestName: 'Jane Doe',
      eventName: 'The Grand Event',
    };

    // Mock a failure (rejection) from sendMail
    const smtpError = new Error('SMTP Connection Failed');
    mockSendMail.mockRejectedValue(smtpError);

    // Act
    const response = await request(app).post('/api/send-invite').send(requestBody);

    // Assert
    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Failed to send invitation. Please try again later.');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});