// Backend/src/Routes/newEventRoutes.js
const express = require("express");
const router = express.Router();
const { createEvent } = require("../Controllers/newEvent.controller"); // controller function

router.post("/", createEvent); // <--- pass the function, not the module

module.exports = router; // <-- export the router
