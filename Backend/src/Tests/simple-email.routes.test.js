// This is the test file for your simple-email router.
// Place this file in: backend/src/Tests/simple-email.routes.test.js

const request = require('supertest');
const express = require('express');

// --- Mock the nodemailer Library ---
// We create a mock sendMail function that we can spy on and control.
const mockSendMail = jest.fn();

// This replaces the entire 'nodemailer' library with our fake version.
jest.mock('nodemailer', () => ({
  // createTransporter is replaced with a mock function that returns
  // an object containing our mock sendMail function.
  createTransporter: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));


// --- Setup a Test App ---
const app = express();
app.use(express.json());
const simpleEmailRouter = require('../Routes/simple-email.routes');
// Mount the router under a base path, e.g., /api/email
app.use('/api/email', simpleEmailRouter);


// --- The Tests ---
describe('POST /api/email/send-invite', () => {

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // Test Case 1: The "Happy Path"
  it('should send an email and return 200 on a successful request', async () => {
    // Arrange: Mock sendMail to resolve successfully
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    const requestBody = {
      guestEmail: 'test@example.com',
      guestName: 'Jane Doe',
      eventName: 'Annual Conference',
    };
    // Mock environment variables required by the controller
    process.env.SMTP_USER = 'user@test.com';

    // Act: Send a request to the endpoint
    const response = await request(app).post('/api/email/send-invite').send(requestBody);

    // Assert: Check the outcome
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Invitation sent successfully!');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    // You can even check if the email was constructed correctly
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: "You're Invited to Annual Conference!",
      })
    );
  });

  // Test Case 2: Validation Failure
  it('should return 400 if guestEmail is missing', async () => {
    // Arrange: Request body is missing the required guestEmail
    const requestBody = {
      guestName: 'Jane Doe',
      eventName: 'Annual Conference',
    };

    // Act
    const response = await request(app).post('/api/email/send-invite').send(requestBody);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Guest email is required.');
    // Ensure no email was attempted to be sent
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  // Test Case 3: Email Sending Failure
  it('should return 500 if nodemailer fails to send the email', async () => {
    // Arrange: Mock sendMail to reject with an error
    mockSendMail.mockRejectedValue(new Error('SMTP Connection Failed'));
    const requestBody = {
      guestEmail: 'test@example.com',
      eventName: 'Annual Conference',
    };
    process.env.SMTP_USER = 'user@test.com';

    // Act
    const response = await request(app).post('/api/email/send-invite').send(requestBody);

    // Assert
    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Failed to send email');
  });
});