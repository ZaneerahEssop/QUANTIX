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
      .order("date", { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching events:", err.message);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

module.exports = { getEvents };
