const express = require("express");
const { deleteEvents } = require("../Controllers/deleteEvent.controller");

const router = express.Router();

router.delete("/:event_id", deleteEvents);

module.exports = router;
