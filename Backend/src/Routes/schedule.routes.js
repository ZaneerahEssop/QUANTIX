const express = require('express');
const { getSchedule, replaceSchedule } = require('../Controllers/schedule.controller');

const router = express.Router();

// GET schedule for an event
router.get('/:event_id/schedule', getSchedule);

// PUT replace schedule for an event
router.put('/:event_id/schedule', replaceSchedule);

module.exports = router;


