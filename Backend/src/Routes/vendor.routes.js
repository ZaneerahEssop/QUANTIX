const express = require("express");
const {
  getAllVendors,
  getVendorById,
} = require("../Controllers/vendor.controller");

const router = express.Router();

router.get("/", getAllVendors);
router.get("/:id", getVendorById);

module.exports = router;
