const express = require("express");
const { getPlannerById } = require("../Controllers/planner.controller");

const router = express.Router();

router.get("/:id", getPlannerById);

module.exports = router;
