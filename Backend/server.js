const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const newEventRoutes = require("./src/Routes/newEvent.routes");
const getEventsRoutes = require("./src/Routes/getEvent.routes");
const plannerRoutes = require("./src/Routes/planner.routes");

dotenv.config();

const app = express();

// ---------- CORS Configuration ----------
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000", // Local development
        process.env.FRONTEND_BASE_URL, // From backend env vars
        process.env.REACT_APP_BASE_URL, // From frontend (if passed)
      ].filter(Boolean); // Remove any undefined values

      // Also allow any Railway domains as fallback
      if (
        origin.includes(".railway.app") ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.some((allowed) => origin.startsWith(allowed))
      ) {
        callback(null, true);
      } else {
        console.log(
          "CORS blocked:",
          origin,
          "Allowed origins:",
          allowedOrigins
        );
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use(express.json());

// ---------- Request Logging Middleware ----------
app.use((req, res, next) => {
  console.log("Incoming request:", {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    host: req.headers.host,
    query: req.query,
  });
  next();
});

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- API Logging Middleware ----------
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`API Request: ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ---------- API Routes ----------
app.use("/api/events", getEventsRoutes);
app.use("/api/events", newEventRoutes);
app.use("/api/planners", plannerRoutes);

app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Debug Route (Temporary) ----------
app.get("/api/debug/env", (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    frontendBaseUrl: process.env.REACT_APP_BASE_URL,
    apiUrl: process.env.REACT_APP_API_URL,
    backendFrontendUrl: process.env.FRONTEND_BASE_URL,
    supabaseUrl: process.env.SUPABASE_URL ? "Set" : "Not set",
    port: process.env.PORT,
  });
});

// ---------- Health Check Route ----------
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ---------- Serve React Frontend ----------
const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

// ---------- API 404 Handler ----------
app.use((req, res, next) => {
  if (req.path.startsWith("/api") && !req.route) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  next();
});

// ---------- React Catch-all Handler (FIXED) ----------
// Use a parameterized route instead of wildcard
app.get("/:path", (req, res) => {
  // List of routes that should be handled by React
  const reactRoutes = [
    "/",
    "/events",
    "/planners",
    "/dashboard",
    "/add-event",
    "/edit-event",
  ];

  if (
    reactRoutes.includes(req.params.path) ||
    req.params.path.startsWith("edit-event/") ||
    !req.path.startsWith("/api")
  ) {
    return res.sendFile(path.join(buildPath, "index.html"));
  }

  // If it's not a React route and not an API route, continue to next middleware
  next();
});

// Final catch-all for any other routes
app.use((req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// ---------- Error Handling Middleware ----------
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  if (err.message.includes("CORS")) {
    return res.status(403).json({
      error: "CORS error",
      message: "Request not allowed from this origin",
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_BASE_URL || "Not set"}`);
});
