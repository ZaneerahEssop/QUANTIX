// Backend/src/Routes/guest.routes.js

const express = require('express');
const router = express.Router();
const guestController = require('../Controllers/guestController');

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Log all requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Request body:', req.body);
  next();
});

// Routes with error handling
router.get('/:eventId/guests', asyncHandler(guestController.getAllGuests));
router.put('/:eventId/guests', asyncHandler(guestController.updateGuestList));
router.post('/:eventId/guests', asyncHandler(guestController.addGuest));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Error in guest routes:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = router;