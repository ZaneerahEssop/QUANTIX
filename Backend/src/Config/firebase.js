// Backend/src/Config/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require("../../serviceAccountKey.json");

console.log('Initializing Firebase Admin...');

let app;
let db;
let auth;

try {
  if (!admin.apps.length) {
    console.log('Creating new Firebase app instance...');
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.log('Using existing Firebase app instance');
    app = admin.app();
  }

  // Initialize Firestore
  db = admin.firestore();
  console.log('Firestore initialized');

  // Initialize Auth
  auth = admin.auth();
  console.log('Auth initialized');

  // Configure Firestore settings
  const settings = { ignoreUndefinedProperties: true };
  db.settings(settings);
  console.log('Firestore settings configured');

} catch (error) {
  console.error('Error initializing Firebase:', {
    error: error.message,
    stack: error.stack,
    serviceAccountPath: require.resolve('../../serviceAccountKey.json')
  });
  throw error; // Re-throw to prevent the app from starting with invalid Firebase config
}

module.exports = { 
  admin, 
  db, 
  auth, 
  app 
};
