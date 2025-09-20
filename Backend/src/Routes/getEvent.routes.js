const express = require("express");
const { getEvents } = require("../Controllers/getEvent.controller");
const { getEventById } = require("../Controllers/getEvent.controller");

const router = express.Router();

router.get("/", getEvents);
router.get("/id/:event_id", getEventById);

module.exports = router;
