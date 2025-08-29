// Backend/src/Config/firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

db.settings({ ignoreUndefinedProperties: true });

module.exports = { admin, db };
