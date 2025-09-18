const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const newEventRoutes = require("./src/Routes/newEvent.routes");
const getEventsRoutes = require("./src/Routes/getEvent.routes");
const plannerRoutes = require("./src/Routes/planner.routes");
const exportRoutes = require("./src/Routes/export.routes");
const vendorRoutes = require("./src/Routes/vendor.routes");
const vendorRequestRoutes = require("./src/Routes/vendorRequest.routes");
// Import the new guest routes
const guestRoutes = require("./src/Routes/guests.routes");

dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes go here
app.use("/api/events", getEventsRoutes);
app.use("/api/events", newEventRoutes);
app.use("/api/planners", plannerRoutes);
app.use("/api/events", exportRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/vendor-requests", vendorRequestRoutes);
// Add the new guests route
app.use("/api/guests", guestRoutes);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler - CORRECT VERSION
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
