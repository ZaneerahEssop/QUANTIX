import React, { useState } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";
import "./AuthPages.css";

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
    <div className="auth-container">
      <h1>
        Welcome to <span className="accent-text">Event-ually Perfect</span>
      </h1>
      <p>Login to get started planning or managing your event experience.</p>

      {user ? (
        <div className="user-profile">
          <div className="user-info">
            <img
              src={user.photoURL}
              alt="Profile"
              className="profile-image"
            />
            <p className="welcome-text">Welcome back, {user.displayName}!</p>
          </div>
          <button onClick={logOut} className="auth-btn">
            <i className="fas fa-sign-out-alt"></i> Log out
          </button>
        </div>
      ) : (
        <>
          <button onClick={signInWithGoogle} className="auth-btn">
            <i className="fab fa-google"></i> Login with Google
          </button>
          <p className="auth-prompt">
            First time?{' '}
            <Link to="/signup" className="auth-link">
              Sign up here
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default Login;
