const express = require("express");
const {
  createVendorRequest,
} = require("../Controllers/vendorRequest.controller");

const router = express.Router();

router.post("/", createVendorRequest);

module.exports = router;
