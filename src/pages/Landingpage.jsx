import React, { useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import "../App.css"; // ✅ shared CSS
import { Link } from "react-router-dom";

function Landingpage() {
  const [user, setUser] = useState(null);

  const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        setUser(result.user);
        console.log(result.user);
      })
      .catch((error) => {
        console.error(error);
      });
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
      <p>
        Login to get started planning or managing your event experience.
      </p>

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

export default Landingpage;
