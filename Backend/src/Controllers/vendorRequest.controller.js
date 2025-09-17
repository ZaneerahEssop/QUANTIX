const supabase = require("../Config/supabase");

const createVendorRequest = async (req, res) => {
  try {
    const { event_id, vendor_id, message } = req.body;

    if (!event_id || !vendor_id) {
      return res
        .status(400)
        .json({ error: "Event ID and Vendor ID are required" });
    }

    console.log("Creating vendor request:", { event_id, vendor_id, message });

    const { data, error } = await supabase
      .from("vendor_requests")
      .insert([{ event_id, vendor_id, status: "pending" }]);

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    res.status(201).json({ success: true, request: data });
  } catch (err) {
    console.error("Error creating vendor request:", err.message);
    res.status(500).json({ error: "Failed to create vendor request" });
  }
};

module.exports = { createVendorRequest };
