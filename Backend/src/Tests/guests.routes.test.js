// This is the full, updated test file for your guests router.
// It includes success, validation, not found, and database failure tests.

const request = require('supertest');
const express = require('express');

// --- Mock the @supabase/supabase-js Library ---
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// --- Setup a Test App ---
const app = express();
app.use(express.json());
const guestsRouter = require('../Routes/guests.routes');
app.use('/api/events', guestsRouter);


// --- The Tests ---
describe('Guest Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- GET /:eventId ---
  describe('GET /api/events/:eventId', () => {
    it('should fetch guests for an event and return 200', async () => {
      const mockGuests = [{ guest_id: 1, name: 'John Doe' }];
      mockSupabaseClient.eq.mockResolvedValue({ data: mockGuests, error: null });

      const response = await request(app).get('/api/events/evt-123');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockGuests);
    });

    it('should return 500 on a database error', async () => {
      mockSupabaseClient.eq.mockRejectedValue(new Error('DB connection failed'));
      const response = await request(app).get('/api/events/evt-123');
      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve guests');
    });
  });

  // --- POST /:eventId ---
  describe('POST /api/events/:eventId', () => {
    it('should create a new guest and return 201', async () => {
      const newGuest = { name: 'Jane Doe', email: 'jane@example.com' };
      mockSupabaseClient.insert.mockResolvedValue({ data: [newGuest], error: null });
      const response = await request(app).post('/api/events/evt-123').send(newGuest);
      expect(response.statusCode).toBe(201);
    });

    it('should return 400 if name or email are missing', async () => {
      const response = await request(app).post('/api/events/evt-123').send({ name: 'Just a name' });
      expect(response.statusCode).toBe(400);
    });
    
    it('should return 500 on a database error', async () => {
      mockSupabaseClient.insert.mockRejectedValue(new Error('DB insert failed'));
      const response = await request(app)
          .post('/api/events/evt-123')
          .send({ name: 'Jane Doe', email: 'jane@example.com' });
      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to add guest');
    });
  });

  // --- PUT /:eventId/:guestId ---
  describe('PUT /api/events/:eventId/:guestId', () => {
    it('should update a guest and return 200', async () => {
      const updatedGuest = [{ guest_id: 1, name: 'John Updated' }];
      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient)
        .mockResolvedValueOnce({ data: updatedGuest, error: null });

      const response = await request(app)
        .put('/api/events/evt-123/guest-1')
        .send({ name: 'John Updated' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(updatedGuest);
    });

    it('should return 404 if guest to update is not found', async () => {
      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient)
        .mockResolvedValueOnce({ data: [], error: null });

      const response = await request(app)
        .put('/api/events/evt-123/guest-999')
        .send({ name: 'Nobody' });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Guest not found');
    });

    it('should return 500 on a database error', async () => {
      mockSupabaseClient.eq
          .mockReturnValueOnce(mockSupabaseClient)
          .mockRejectedValue(new Error('DB update failed'));

      const response = await request(app)
          .put('/api/events/evt-123/guest-1')
          .send({ name: 'John Updated' });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to update guest');
    });
  });

  // --- DELETE /:eventId/:guestId ---
  describe('DELETE /api/events/:eventId/:guestId', () => {
    it('should delete a guest and return 204', async () => {
      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient)
        .mockResolvedValueOnce({ error: null });

      const response = await request(app).delete('/api/events/evt-123/guest-1');

      expect(response.statusCode).toBe(204);
    });
    
    it('should return 500 on a database error', async () => {
      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient)
        .mockRejectedValue(new Error('DB delete failed'));
      
      const response = await request(app).delete('/api/events/evt-123/guest-1');

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to delete guest');
    });
  });
});