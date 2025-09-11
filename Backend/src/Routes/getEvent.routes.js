const express = require("express");
const { getEvents } = require("../Controllers/getEvent.controller");

const router = express.Router();

router.get("/", getEvents);

module.exports = router;
