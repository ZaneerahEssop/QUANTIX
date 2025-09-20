const supabase = require("../Config/supabase");

const getEvents = async (req, res) => {
  try {
    const { planner_id } = req.query;

    if (!planner_id) {
      return res.status(400).json({ error: "planner_id is required" });
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("planner_id", planner_id)
      .order("start_time", { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching events:", err.message);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

const getEventById = async (req, res) => {
  try {
    const { event_id } = req.params;
    if (!event_id)
      return res.status(400).json({ error: "event_id is required" });

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("event_id", event_id)
      .single(); // returns one row

    if (error || !data) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching event by id:", err.message);
    res.status(500).json({ error: "Failed to fetch event" });
  }
};

module.exports = { getEvents, getEventById };
