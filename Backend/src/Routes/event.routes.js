//src/Routes/event.routes.js
const express = require("express");
const { exportEvents } = require("../Controllers/event.controller.js");

const router = express.Router();

// Public API - Export Finalized Events
router.get("/export", exportEvents);

module.exports = router;
