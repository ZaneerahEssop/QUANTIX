// backend/src/Tests/schedule.controller.test.js

const { getSchedule, replaceSchedule } = require('../Controllers/schedule.controller');
const supabase = require('../Config/supabase');

// Mock the Supabase client with a fully chainable structure.
jest.mock('../Config/supabase', () => {
    const mock = {
      from: jest.fn(),
      select: jest.fn(),
      order: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
      eq: jest.fn(),
    };

    // Make the primary methods chainable by default
    mock.from.mockReturnThis();
    mock.select.mockReturnThis();
    mock.delete.mockReturnThis();
    
    return mock;
});

// --- Tests for getSchedule ---
describe('getSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and correctly format the schedule for a given event_id', async () => {
    // Arrange
    const eventId = 'evt-123';
    const mockData = [
      { id: 1, title: 'Opening Ceremony', description: 'Welcome speech', start_time: '2025-10-26T09:00:00Z', end_time: '2025-10-26T09:30:00Z', position: 0 },
      { id: 2, title: 'Keynote', description: 'Main talk', start_time: '2025-10-26T10:00:00Z', end_time: '2025-10-26T11:00:00Z', position: 1 },
    ];
    
    // ✨ FIX: Explicitly mock the .eq().order() chain to prevent a TypeError.
    supabase.eq.mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
    });

    const req = { params: { event_id: eventId } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Act
    await getSchedule(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      schedule: [
        { id: 1, activity: 'Opening Ceremony', description: 'Welcome speech', time: '09:00', start_time: '2025-10-26T09:00:00Z', end_time: '2025-10-26T09:30:00Z', position: 0 },
        { id: 2, activity: 'Keynote', description: 'Main talk', time: '10:00', start_time: '2025-10-26T10:00:00Z', end_time: '2025-10-26T11:00:00Z', position: 1 },
      ],
    });
    expect(supabase.eq).toHaveBeenCalledWith('event_id', eventId);
  });

  it('should return a 400 error if event_id is not provided', async () => {
    const req = { params: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await getSchedule(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'event_id is required' });
  });

  it('should return a 500 error if the database query fails', async () => {
    const dbError = { message: 'Query failed' };
    
    // ✨ FIX: Mock the chain to resolve with a specific database error.
    supabase.eq.mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: dbError })
    });

    const req = { params: { event_id: 'evt-123' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await getSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: dbError.message });
  });
});


// --- Tests for replaceSchedule ---
describe('replaceSchedule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delete the old schedule and insert the new one', async () => {
        supabase.eq.mockResolvedValue({ error: null });
        supabase.insert.mockResolvedValue({ error: null });

        const req = {
            params: { event_id: 'evt-123' },
            body: {
                schedule: [
                    { activity: 'New Item 1', position: 0 },
                    { activity: 'New Item 2', position: 1 }
                ]
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await replaceSchedule(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
        expect(supabase.insert).toHaveBeenCalledWith([
            { event_id: 'evt-123', title: 'New Item 1', description: null, start_time: null, end_time: null, position: 0 },
            { event_id: 'evt-123', title: 'New Item 2', description: null, start_time: null, end_time: null, position: 1 }
        ]);
    });

    it('should handle an empty schedule by only deleting existing items', async () => {
        supabase.eq.mockResolvedValue({ error: null });
        const req = { params: { event_id: 'evt-123' }, body: { schedule: [] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await replaceSchedule(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(supabase.delete).toHaveBeenCalledTimes(1);
        expect(supabase.insert).not.toHaveBeenCalled();
    });

    it('should return 400 if schedule is not an array', async () => {
        const req = { params: { event_id: 'evt-123' }, body: { schedule: { title: 'invalid' } } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await replaceSchedule(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'schedule must be an array' });
    });

    it('should return 500 if the delete operation fails', async () => {
        const dbError = { message: 'Delete failed' };
        supabase.eq.mockResolvedValue({ error: dbError });
        const req = { params: { event_id: 'evt-123' }, body: { schedule: [{ activity: 'test' }] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await replaceSchedule(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: dbError.message });
    });

    it('should return 500 if the insert operation fails', async () => {
        const dbError = { message: 'Insert failed' };
        supabase.eq.mockResolvedValue({ error: null });
        supabase.insert.mockResolvedValue({ error: dbError });
        const req = { params: { event_id: 'evt-123' }, body: { schedule: [{ activity: 'test' }] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await replaceSchedule(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: dbError.message });
    });
});