const express = require("express");
const {
  createVendorRequest,
  getVendorRequestByVendorId,
  updateVendorRequest,
} = require("../Controllers/vendorRequest.controller");

const router = express.Router();

router.post("/", createVendorRequest);

router.get("/:vendor_id", getVendorRequestByVendorId);

router.put("/:id", updateVendorRequest);

module.exports = router;
