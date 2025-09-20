const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

// Initialize Supabase client
// Ensure these environment variables are set in your .env file
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * @route   GET /api/profile/vendor/:userId
 * @desc    Get a vendor's profile data
 * @access  Public (should be protected in a real app)
 */
router.get("/profile/vendor/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const { data: vendor, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("vendor_id", userId)
      .single();

    if (error) {
      // If error is due to no rows found, it's a 404
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: "Vendor profile not found." });
      }
      // For other database errors
      throw error;
    }

    if (!vendor) {
      return res.status(404).json({ error: "Vendor profile not found." });
    }
    
    res.json(vendor);

  } catch (err) {
    console.error("Error fetching vendor profile:", err.message);
    res.status(500).json({ error: "Internal server error while fetching vendor profile." });
  }
});

module.exports = router;
