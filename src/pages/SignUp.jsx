import React, { useState } from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../App.css";

function SignUp() {
  const [role, setRole] = useState(""); // "planner" or "vendor"
  const navigate = useNavigate();

  const handleSignUp = async () => {
    if (!role) {
      alert("Please select a role first!");
      return;
    }
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Store UID + role
      localStorage.setItem("uid", user.uid);
      localStorage.setItem("role", role);

      // Navigate to the correct form
      if (role === "planner") navigate("/planner-form");
      else navigate("/vendor-form");

    } catch (error) {
      console.error("Error signing up:", error);
    }
  };

  return (
    <main className="profile-container">
      <h1>Welcome to <span className="accent-text">Event-ually Perfect</span></h1>
      <div className="logo-placeholder"></div>
      <p>Select your role to get started with a tailored experience.</p>

      <div className="role-choices">
        <label
          className={`role-card planner-card ${role === "planner" ? "selected" : ""}`}
          onClick={() => setRole("planner")}
        >
          <div className="card-icon">🗒️</div>
          <h2>Event Planner</h2>
          <p>Organize events, find vendors, and manage your projects all in one place.</p>
        </label>

        <label
          className={`role-card vendor-card ${role === "vendor" ? "selected" : ""}`}
          onClick={() => setRole("vendor")}
        >
          <div className="card-icon">🏪</div>
          <h2>Vendor</h2>
          <p>Showcase your services, connect with planners, and grow your business.</p>
        </label>
      </div>

      <button type="button" className="submit-btn" onClick={handleSignUp}>
        Sign Up with Google
      </button>
    </main>
  );
}

export default SignUp;
