const supabase = require("../Config/supabase");

const createVendorRequest = async (req, res) => {
  try {
    const { event_id, vendor_id, requester_id } = req.body;

    if (!event_id || !vendor_id || !requester_id) {
      return res.status(400).json({
        error: "Event ID and Vendor ID and Requester ID are required",
      });
    }

    console.log("Creating vendor request:", {
      event_id,
      vendor_id,
      requester_id,
    });

    const { data, error } = await supabase
      .from("vendor_requests")
      .insert([{ event_id, vendor_id, requester_id, status: "pending" }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ success: true, request: data });
  } catch (err) {
    console.error("Error creating vendor request:", err.message);
    res.status(500).json({ error: "Failed to create vendor request" });
  }
};

const getVendorRequestByVendorId = async (req, res) => {
  try {
    const { vendor_id } = req.params;
    if (!vendor_id)
      return res.status(400).json({ error: "vendor_id is required" });

    const { data, error } = await supabase
      .from("vendor_requests")
      .select(
        `
        *,
        events (
          name,
          start_time,
          end_time,
          venue
        )
      `
      )
      .eq("vendor_id", vendor_id);

    if (error || !data) {
      return res.status(404).json({ error: "Vendor Request not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching request by vendor id:", err.message);
    res.status(500).json({ error: "Failed to fetch Vendor Request" });
  }
};

const updateVendorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { event_id, vendor_id, status } = req.body;

    const { data, error } = await supabase
      .from("vendor_requests")
      .update({ event_id, vendor_id, status })
      .eq("request_id", id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, request: data });
  } catch (err) {
    console.error("Error updating vendor request:", err.message);
    res.status(500).json({ error: "Failed to update vendor request" });
  }
};

module.exports = {
  createVendorRequest,
  getVendorRequestByVendorId,
  updateVendorRequest,
};
