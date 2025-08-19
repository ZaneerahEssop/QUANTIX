// --- Google Sign Up for signup.html ---
const googleSignUpBtn = document.getElementById("googleSignUpBtn");
if (googleSignUpBtn) {
  googleSignUpBtn.addEventListener("click", async () => {
    const selected = document.querySelector('.role-card.selected input[type="radio"]');
    if (!selected) {
      alert('Please select a role to sign up.');
      return;
    }
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // Save user with selected role in Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        role: selected.value
      });
      // Redirect to profile details page based on role
      if (selected.value === "planner") {
        window.location.href = "/public/plannerProfile.html";
      } else if (selected.value === "vendor") {
        window.location.href = "/public/vendorProfile.html";
      }
    } catch (error) {
      console.error("Error signing up with Google:", error);
    }
  });
}
// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

// Set up Google provider
const provider = new GoogleAuthProvider();

// Handle sign in button click
document.getElementById("googleSignInBtn").addEventListener("click", async() => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user doc exists in Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // if (!userSnap.exists()) {
    //   // First time login → Assign a role manually for now
    //   await setDoc(userRef, {
    //     name: user.displayName,
    //     email: user.email,
    //     role: "planner" // Change to "vendor" or "guest" as needed
    //   });
    // }

    // Redirect based on role
    redirectUser(user.uid);

  } catch (error) {
    console.error("Error signing in:", error);
  }
});

// Function to redirect based on Firestore role
async function redirectUser(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const role = userSnap.data().role;

    if (role === "planner") {
      window.location.href = "/public/plannerDashboard.html";
    } else if (role === "vendor") {
      window.location.href = "/public/vendorDashboard.html";
    } else if (role === "guest") {
      window.location.href = "/public/guestDashboard.html";
    } else {
      console.error("No valid role found for user");
    }
  }
}


