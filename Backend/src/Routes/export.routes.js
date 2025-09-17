const express = require('express');
const router = express.Router();
const exportController = require('../Controllers/exportController');

router.get('/:eventId/export', exportController.exportEventData);

module.exports = router;