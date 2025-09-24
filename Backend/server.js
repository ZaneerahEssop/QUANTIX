const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/test', (req, res) => {
  res.send('Backend is alive!');
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});