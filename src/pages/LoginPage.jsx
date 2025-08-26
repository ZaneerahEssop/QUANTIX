import React, { useState } from "react";
import { auth, provider, db } from "../firebase"; // ✅ added db
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // ✅ Firestore
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

function Login() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();


  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;
      setUser(loggedInUser);

      // ✅ Fetch role from Firestore
      const userDoc = await getDoc(doc(db, "users", loggedInUser.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;

        if (role === "planner") navigate("/planner-dashboard");
        else if (role === "vendor") navigate("/vendor-dashboard");
        else navigate("/"); // fallback
      } else {
        // If new user logs in without signing up → send to signup
        navigate("/signup");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const logOut = () => {
    signOut(auth)
      .then(() => {
        setUser(null);
        console.log("User signed out");
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <main className="profile-container">
      <h1>
        Welcome to <span className="accent-text">Event-ually Perfect</span>
      </h1>
      <div className="logo-placeholder"></div>
      <p>Login to get started planning or managing your event experience.</p>

      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <img
            src={user.photoURL}
            alt="profile"
            style={{ borderRadius: "50%", marginTop: "10px" }}
          />
          <br />
          <button onClick={logOut} className="submit-btn">Log out</button>
        </div>
      ) : (
        <button onClick={signInWithGoogle} className="submit-btn">
          Login with Google
        </button>
      )}

      <p className="signup-note">
        First time? <Link to="/signup" className="signup-link">Sign up here</Link>
      </p>
    </main>
  );
}

export default Login;
