// Backend/server.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();

// --- File Imports ---
const { admin, auth } = require("./src/Config/firebase");
const eventRoutes = require("./src/Routes/newEvent.routes"); // Your existing event routes
const guestRoutes = require("./src/Routes/guest.routes");   // The new guest routes

// --- App & Middleware Setup ---
const app = express();

// Configure CORS
const corsOptions = {
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

// --- Authentication Middleware ---
const authenticate = async (req, res, next) => {
  console.log('Authentication middleware triggered');
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
  const { authorization } = req.headers;
  
  if (!authorization) {
    console.error('No authorization header found');
    return res.status(401).json({ error: 'Unauthorized: No authorization header provided' });
  }
  
  if (!authorization.startsWith('Bearer ')) {
    console.error('Invalid authorization header format');
    return res.status(401).json({ error: 'Unauthorized: Invalid token format. Use Bearer token' });
  }
  
  const token = authorization.split('Bearer ')[1];
  
  if (!token) {
    console.error('No token found in authorization header');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  try {
    console.log('Verifying token...');
    const decodedToken = await auth.verifyIdToken(token);
    console.log('Token verified successfully:', { uid: decodedToken.uid, email: decodedToken.email });
    
    if (!decodedToken.uid) {
      console.error('No UID in decoded token');
      return res.status(401).json({ error: 'Unauthorized: Invalid token data' });
    }
    
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    return res.status(403).json({ 
      error: 'Unauthorized: Invalid or expired token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test Firestore connection
    const firestorePing = await db.collection('test').doc('ping').get();
    
    // Test Auth connection
    const authPing = await auth.getUser('test');
    
    res.status(200).json({
      status: 'ok',
      firebase: {
        firestore: 'connected',
        auth: 'connected',
        app: admin.app().name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// --- API Routes ---
// Apply the authentication middleware to all routes under /api/events
app.use("/api/events", authenticate, eventRoutes);
app.use("/api/events", authenticate, guestRoutes); // Use the new guest routes

// --- Serve Vite / React frontend ---
const path = require('path');

app.use(express.static(path.join(__dirname, '../dist')));

// Fallback for SPA routing (all other routes serve index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});