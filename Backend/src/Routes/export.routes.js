// backend/src/Routes/export.routes.js

const express = require('express');
const router = express.Router();
const { exportEventData } = require('../Controllers/exportController');

// This path is correct.
router.get('/:eventId/export', exportEventData);

module.exports = router;