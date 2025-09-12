const supabase = require("../Config/supabase");

const getPlannerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("planners")
      .select("*")
      .eq("planner_id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Planner not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching planner:", err.message);
    res.status(500).json({ error: "Failed to fetch planner" });
  }
};

module.exports = { getPlannerById };
