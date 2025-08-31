import React, { useState } from "react";
import { auth, provider, db } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "./AuthPages.css";

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

      // ✅ Save role in Firestore users collection
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: role,
        createdAt: new Date(),
      });

      // Navigate to the correct form
      if (role === "planner") navigate("/planner-form");
      else navigate("/vendor-form");

    } catch (error) {
      console.error("Error signing up:", error);
    }
  };

  return (
    <div className="auth-container">
      <h1>
        Welcome to <span className="accent-text">Event-ually Perfect</span>
      </h1>
      <p>Select your role to get started with a tailored experience.</p>

      <div className="role-choices">
        <div
          className={`role-card ${role === "planner" ? "selected" : ""}`}
          onClick={() => setRole("planner")}
        >
          <div className="card-icon">🗒️</div>
          <h2>Event Planner</h2>
          <p>Organize events, find vendors, and manage your projects all in one place.</p>
        </div>

        <div
          className={`role-card ${role === "vendor" ? "selected" : ""}`}
          onClick={() => setRole("vendor")}
        >
          <div className="card-icon">🏪</div>
          <h2>Vendor</h2>
          <p>Showcase your services, connect with planners, and grow your business.</p>
        </div>
      </div>

      <button type="button" className="auth-btn" onClick={handleSignUp}>
        <i className="fab fa-google"></i> Sign Up with Google
      </button>
      
      <p className="auth-prompt">
        Already have an account?{' '}
        <a 
          href="/login" 
          className="auth-link" 
          onClick={(e) => {
            e.preventDefault();
            navigate('/login');
          }}
        >
          Login here
        </a>
      </p>
    </div>
  );
}

export default SignUp;
