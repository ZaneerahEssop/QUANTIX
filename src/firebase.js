// Import Firebase core + Auth SDK
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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


// ✅ Setup Auth & Provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const db = getFirestore(app);
export const storage = getStorage(app);

export { auth, provider };
