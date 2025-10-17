const supabase = require("../Config/supabase"); // Fix the typo!

const deleteEvents = async (req, res) => {
  try {
    const { event_id } = req.params;

    if (!event_id) {
      console.log("No event_id provided");
      return res.status(400).json({ error: "event_id is required" });
    }

    // Check if event exists
    const { data: existingEvent, error: findError } = await supabase
      .from("events")
      .select("event_id")
      .eq("event_id", event_id)
      .single();

    if (findError) {
      console.error("Error finding event:", findError);
      return res
        .status(404)
        .json({ error: "Event not found", details: findError.message });
    }

    if (!existingEvent) {
      console.log("Event not found in database");
      return res.status(404).json({ error: "Event not found" });
    }

    // Delete the event
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("event_id", event_id);

    if (deleteError) {
      console.error(" Supabase delete error:", deleteError);
      return res.status(500).json({
        error: "Failed to delete event",
        details: deleteError.message,
      });
    }

    console.log("Event deleted successfully!");
    res.status(200).json({
      message: "Event deleted successfully",
      event_id: event_id,
    });
  } catch (err) {
    console.error(" CATCH BLOCK ERROR:", err.message);
    console.error("Full error stack:", err.stack);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

module.exports = { deleteEvents };
