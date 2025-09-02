// Backend/src/Config/firebase.js
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));

console.log('Initializing Firebase Admin...');

let app;
let db;
let auth;

try {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  console.log('Service account path:', serviceAccountPath);
  
  if (!admin.apps.length) {
    console.log('Creating new Firebase app instance...');
    console.log('Service account details:', {
      type: serviceAccount.type,
      project_id: serviceAccount.project_id,
      private_key_id: serviceAccount.private_key_id ? '***' : 'Not found',
      client_email: serviceAccount.client_email
    });
    
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
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
