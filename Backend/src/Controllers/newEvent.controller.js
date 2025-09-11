const supabase = require("../Config/supabase"); // no destructuring

const createEvent = async (req, res) => {
  try {
    const {
      name,
      theme,
      start_time,
      end_time,
      venue,
      selectedVendors = [],
      documents = [],
      planner_id,
    } = req.body;

    if (!name || !start_time || !planner_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Ensure planner exists
    const { data: planner, error: plannerError } = await supabase
      .from("planners")
      .select("*")
      .eq("planner_id", planner_id)
      .single();

    if (plannerError || !planner) {
      return res.status(400).json({ error: "Planner does not exist" });
    }

    // Insert event
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        name,
        theme: theme || null,
        start_time,
        end_time: end_time || null,
        venue: venue || null,
        planner_id,
      })
      .select();

    if (eventError) {
      console.error("Create event error:", eventError);
      return res.status(500).json({ error: eventError.message });
    }

    const eventId = eventData[0].event_id;

    // Insert vendors
    for (const vendor of selectedVendors) {
      const { error: vendorError } = await supabase
        .from("event_vendors")
        .insert({ event_id: eventId, vendor_id: vendor.vendor_id });
      if (vendorError) console.error("Vendor insert error:", vendorError);
    }

    // Insert files
    for (const doc of documents) {
      const { name: fileName, url: fileUrl, uploaded_by } = doc;
      const { error: fileError } = await supabase.from("files").insert({
        event_id: eventId,
        file_name: fileName,
        file_url: fileUrl,
        uploaded_by,
      });
      if (fileError) console.error("File insert error:", fileError);
    }

    return res.status(201).json({ event: eventData[0] });
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ error: "Failed to create event" });
  }
};

module.exports = { createEvent };
