const express = require('express');
const router = express.Router();
const { exportEventData } = require('../Controllers/exportController');

router.get('/export/:eventId', exportEventData);

module.exports = router;
