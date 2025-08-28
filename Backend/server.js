// 1. Import Dependencies
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config(); // Loads environment variables from .env file

// 2. Initialize Express App
const app = express();

// 3. Configure Middleware
// This allows your server to accept requests from your React app
app.use(cors());
// This allows your server to parse JSON data in the request body
app.use(express.json());

// 4. Initialize Firebase Admin SDK
// Get your service account JSON file from your Firebase project settings
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// A helper to access the Firestore database
const db = admin.firestore();

// 5. Define a Basic API Endpoint (a "Route")
// This is a simple test route to make sure the server is working.
// When your React app sends a GET request to http://localhost:5000/api/hello,
// this function will run.
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// Example: A route to get data from Firestore
app.get('/api/items', async (req, res) => {
  try {
    const itemsCollection = db.collection('items'); // Assumes you have a collection named "items"
    const snapshot = await itemsCollection.get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No items found' });
    }

    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching items from Firestore:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});


// 6. Start the Server
// Use the port from the .env file, or default to 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
