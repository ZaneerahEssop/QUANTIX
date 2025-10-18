const supabase = require("../Config/supabase"); // no destructuring

const createEvent = async (req, res) => {
  try {
    const {
      name,
      theme,
      start_time,
      end_time,
      venue,
      selectedVendors = [], // This array now contains { vendor_id, service_requested }
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
        // Assuming your 'events' table might have a 'documents' column (e.g., JSONB)
        // If not, you'll handle documents separately as below.
        // documents: documents, 
      })
      .select() // Use select() to get the inserted data
      .single(); // Use single() if you expect exactly one row back

    if (eventError) {
      console.error("Create event error:", eventError);
      return res.status(500).json({ error: eventError.message });
    }
    
    // Ensure eventData is not null before accessing event_id
    if (!eventData) {
        console.error("Event creation did not return data.");
        return res.status(500).json({ error: "Failed to retrieve created event ID."});
    }

    const eventId = eventData.event_id;

    // ✨ MODIFICATION START ✨
    // Insert vendors with the requested service
    if (selectedVendors && selectedVendors.length > 0) {
        
        // Prepare the data for batch insert
        const requestsToInsert = selectedVendors.map(vendorSelection => ({
            event_id: eventId,
            vendor_id: vendorSelection.vendor_id,
            requester_id: planner_id,
            service_requested: vendorSelection.service_requested, // Get the service
            status: "pending",
        }));

        // Perform batch insert
        const { error: vendorRequestError } = await supabase
            .from("vendor_requests")
            .insert(requestsToInsert);

        if (vendorRequestError) {
            console.error("Vendor request batch insert error:", vendorRequestError);
            // Decide how to handle this - maybe return a partial success?
            // For now, we'll log it and continue, but inform the client later if needed.
        }
    }
    // ✨ MODIFICATION END ✨

    // --- Handling Documents ---
    // Check if your 'events' table stores documents directly (e.g., as JSONB)
    // OR if you have a separate 'documents' or 'files' table.
    // The code below assumes a separate 'files' table as shown in your original controller.

    if (documents && documents.length > 0) {
        const filesToInsert = documents.map(doc => ({
            event_id: eventId,
            file_name: doc.name, // Assuming frontend sends name
            file_url: doc.url,   // Assuming frontend sends URL (after potential upload)
            uploaded_by: planner_id // Or doc.uploaded_by if frontend sends it
        }));

        const { error: fileError } = await supabase
            .from("files") // Make sure this table name is correct
            .insert(filesToInsert);

        if (fileError) {
            console.error("File batch insert error:", fileError);
            // Log error, maybe inform client
        }
    }
    
    // Return the created event data
    return res.status(201).json({ event: eventData }); // Return the single event object

  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ error: "Failed to create event" });
  }
};

module.exports = { createEvent };