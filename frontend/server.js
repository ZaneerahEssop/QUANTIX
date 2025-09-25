const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from build directory
app.use(express.static(path.join(__dirname, "build")));

// Handle client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
