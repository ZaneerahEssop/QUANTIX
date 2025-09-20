const express = require('express');
const router = express.Router();
const { getVendorProfile } = require('../Controllers/vendorProfileController');

// Define the route to get a vendor's profile by their ID
// e.g., GET /api/vendor-profile/12345-abcde-67890
router.get('/vendor-profile/:userId', getVendorProfile);

module.exports = router;