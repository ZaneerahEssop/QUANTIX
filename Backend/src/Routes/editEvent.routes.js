const express = require("express");
const { editEvent } = require("../Controllers/editEvent.controller");

const router = express.Router();

router.put("/:id", editEvent);

module.exports = router;
