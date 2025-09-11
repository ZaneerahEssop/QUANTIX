const express = require("express");
const { createEvent } = require("../Controllers/newEvent.controller");

const router = express.Router();

router.post("/", createEvent);

module.exports = router;
