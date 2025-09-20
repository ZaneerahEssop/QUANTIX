// src/Routes/guests.routes.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to check for API key (optional but recommended)
router.use((req, res, next) => {
    // Implement your API key check here if needed
    next();
});

// GET guests for a specific event
router.get('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    try {
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('event_id', eventId);

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("Error fetching guests:", err);
        res.status(500).json({ error: 'Failed to retrieve guests' });
    }
});

// POST a new guest for an event
router.post('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { name, email, rsvp_status, cell_number, dietary_info } = req.body;

    // Basic validation
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('guests')
            .insert([
                { event_id: eventId, name, email, rsvp_status, cell_number, dietary_info }
            ]);

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Error adding new guest:", err);
        res.status(500).json({ error: 'Failed to add guest' });
    }
});

// PUT (update) an existing guest
router.put('/:eventId/:guestId', async (req, res) => {
    const { eventId, guestId } = req.params;
    const updates = req.body;

    try {
        const { data, error } = await supabase
            .from('guests')
            .update(updates)
            .eq('event_id', eventId)
            .eq('guest_id', guestId);

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error("Error updating guest:", err);
        res.status(500).json({ error: 'Failed to update guest' });
    }
});

// DELETE a guest
router.delete('/:eventId/:guestId', async (req, res) => {
    const { eventId, guestId } = req.params;

    try {
        const { error } = await supabase
            .from('guests')
            .delete()
            .eq('event_id', eventId)
            .eq('guest_id', guestId);

        if (error) throw error;
        res.status(204).send(); // No Content
    } catch (err) {
        console.error("Error deleting guest:", err);
        res.status(500).json({ error: 'Failed to delete guest' });
    }
});

module.exports = router;
