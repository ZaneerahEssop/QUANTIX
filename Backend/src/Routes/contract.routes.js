// src/Routes/contract.routes.js
console.log('✅ --- Contract routes file is loaded! ---');
const express = require("express");
const { 
    getContract, 
    upsertContract, 
    addRevision, 
    signContract, 
    exportContract
} = require("../Controllers/contract.controller");

const router = express.Router();

// Get a contract for a specific event and vendor
router.get("/event/:eventId/vendor/:vendorId", getContract);

// Create or update a contract (for vendors)
router.post("/", upsertContract);

// Add a revision to a contract (for planners)
router.put("/:contractId/revise", addRevision);

// Add a signature to a contract (for both planners and vendors)
router.put("/:contractId/sign", signContract);

// --- NEW ROUTE ---
// Export a contract as a markdown file
router.get("/:contractId/export", exportContract);


module.exports = router;