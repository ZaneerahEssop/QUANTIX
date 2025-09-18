const supabase = require("../Config/supabase");

const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Vendor ID is required" });

    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("vendor_id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching vendor:", err.message);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

const getAllVendors = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("business_name", { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching vendors:", err.message);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

module.exports = { getAllVendors, getVendorById };
