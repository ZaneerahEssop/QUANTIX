// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCwoCgB9o8JCGJltFfMCVb0EqRxRWSODZ0",
  authDomain: "quantix-26ba5.firebaseapp.com",
  projectId: "quantix-26ba5",
  storageBucket: "quantix-26ba5.firebasestorage.app",
  messagingSenderId: "503362009947",
  appId: "1:503362009947:web:67ef295f8cd987cc55787e",
  measurementId: "G-HJB25H1SWR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };