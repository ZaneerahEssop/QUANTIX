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
        booking_notes, 
        quoted_price, 
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
        booking_notes, 
        quoted_price, 
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

// =================================================================
// ✨ MODIFIED FUNCTION: updateVendorRequest
// =================================================================
const updateVendorRequest = async (req, res) => {
  try {
    const { id } = req.params; // This is the request_id
    
    // Accept status, booking_notes, or quoted_price
    const { status, booking_notes, quoted_price } = req.body;

    const updateData = {};

    // Conditionally add fields to the update object if they were provided
    // We check for 'undefined' to allow setting fields to 'null' or an empty string
    if (status !== undefined) {
      updateData.status = status;
    }
    if (booking_notes !== undefined) {
      updateData.booking_notes = booking_notes;
    }
    if (quoted_price !== undefined) {
      updateData.quoted_price = quoted_price;
    }

    // Check if any valid field was provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "At least one field (status, booking_notes, quoted_price) is required",
      });
    }

    const { data, error } = await supabase
      .from("vendor_requests")
      .update(updateData) // Update with the dynamically built object
      .eq("request_id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true, request: data });
  } catch (err) {
    console.error("Error updating vendor request:", err.message);
    res.status(500).json({ error: "Failed to update vendor request" });
  }
};
// =================================================================
// END OF MODIFIED FUNCTION
// =================================================================


module.exports = {
  createVendorRequest,
  getVendorRequestByVendorId,
  getVendorRequestByEventId,
  updateVendorRequest,
};