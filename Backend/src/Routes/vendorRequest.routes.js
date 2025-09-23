const express = require("express");
const {
  createVendorRequest,
  getVendorRequestByVendorId,
  getVendorRequestByEventId,
  updateVendorRequest,
} = require("../Controllers/vendorRequest.controller");

const router = express.Router();

router.post("/", createVendorRequest);

router.get("/event/:event_id", getVendorRequestByEventId);

router.get("/:vendor_id", getVendorRequestByVendorId);

router.put("/:id", updateVendorRequest);

module.exports = router;
