const supabase = require("../Config/supabase");

const createVendorRequest = async (req, res) => {
  try {
    // ✨ MODIFICATION: Get 'service_requested' from the request body
    const { event_id, vendor_id, requester_id, service_requested } = req.body;

    // ✨ MODIFICATION: Add 'service_requested' to the validation
    if (!event_id || !vendor_id || !requester_id || !service_requested) {
      return res.status(400).json({
        error:
          "Event ID, Vendor ID, Requester ID, and Service Requested are required",
      });
    }

    console.log("Creating vendor request:", {
      event_id,
      vendor_id,
      requester_id,
      service_requested, // ✨ MODIFICATION: Log the new field
    });

    const { data, error } = await supabase
      .from("vendor_requests")
      // ✨ MODIFICATION: Insert the 'service_requested' field
      .insert([
        {
          event_id,
          vendor_id,
          requester_id,
          service_requested,
          status: "pending",
        },
      ])
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
        request_id,
        status,
        requester_id,
        event_id,
        service_requested, 
        events:event_id (
          event_id,
          name,
          start_time,
          end_time,
          venue,
          planner_id
        )
      `
      )
      .eq("vendor_id", vendor_id);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error("Error fetching request by vendor id:", err.message);
    res.status(500).json({ error: "Failed to fetch Vendor Request" });
  }
};

const getVendorRequestByEventId = async (req, res) => {
  try {
    const { event_id } = req.params;
    if (!event_id)
      return res.status(400).json({ error: "event_id is required" });

    console.log("Fetching vendor requests for event:", event_id);

    const { data, error } = await supabase
      .from("vendor_requests")
      .select(
        `
        request_id,
        status,
        created_at,
        vendor_id,
        service_requested, 
        vendor:vendor_id (
          vendor_id,
          business_name,
          service_type,
          contact_number
        )`
      )
      .eq("event_id", event_id);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Vendor requests found:", data);

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(data || []);
  } catch (err) {
    console.error("Error fetching request by vendor id:", err.message);
    res.status(500).json({ error: "Failed to fetch Vendor Request" });
  }
};

const updateVendorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    // Note: We only update status here. We don't let people change the
    // event, vendor, or service of an *existing* request.
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const { data, error } = await supabase
      .from("vendor_requests")
      .update({ status }) // ✨ MODIFICATION: Only update what's intended
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
  getVendorRequestByEventId,
  updateVendorRequest,
};