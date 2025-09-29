const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const newEventRoutes = require("./src/Routes/newEvent.routes");
const getEventsRoutes = require("./src/Routes/getEvent.routes");
const editEventRoutes = require("./src/Routes/editEvent.routes");
const plannerRoutes = require("./src/Routes/planner.routes");
const exportRoutes = require("./src/Routes/export.routes");
const vendorRoutes = require("./src/Routes/vendor.routes");
const vendorRequestRoutes = require("./src/Routes/vendorRequest.routes");
const chatRoutes = require("./src/Routes/chat.routes");
const guestRoutes = require("./src/Routes/guests.routes");
const emailRoutes = require("./src/Routes/email.routes");
const contractRoutes = require("./src/Routes/contract.routes"); // <-- ADDED
const path = require("path");

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin:
      process.env.REACT_APP_BASE_URL,
    credentials: true,
  })
);

app.use(express.json());

// Routes go here
app.use("/api/events", getEventsRoutes);
app.use("/api/events", newEventRoutes);
app.use("/api/events", editEventRoutes);
app.use("/api/planners", plannerRoutes);
app.use("/api/events", exportRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/vendor-requests", vendorRequestRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/contracts", contractRoutes); // <-- ADDED

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Root route for health check
app.get("/", (req, res) => {
  res.json({
    message: "QUANTIX Backend API is running",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

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


const PORT = process.env.PORT || 3000;

// Only start server if not in Vercel
if (!process.env.PRODUCTION) {
  app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
  );
}

module.exports = app;