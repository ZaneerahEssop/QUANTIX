const supabase = require("../Config/supabase");

const editEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, start_time, venue, theme } = req.body;

    console.log("Updating event:", id, "with data:", req.body);

    let finalStartTime = start_time;
    // --- FIX APPLIED HERE ---
    // Changed the undefined 'time' variable to the correct 'start_time' variable.
    if (date && start_time) {
      finalStartTime = `${date}T${start_time}:00`;
    } else if (date && !start_time) {
      finalStartTime = `${date}T00:00:00`;
    }

    const updateData = {
      name: name,
      venue: venue,
      theme: theme,
    };

    if (finalStartTime) {
      updateData.start_time = finalStartTime;
    }

    console.log("Final update data:", updateData);

    const { data, error } = await supabase
      .from("events")
      .update(updateData)
      .eq("event_id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, event: data });
  } catch (err) {
    console.error("Error updating event:", err.message);
    res.status(500).json({ error: "Failed to update event" });
  }
};

module.exports = { editEvent };