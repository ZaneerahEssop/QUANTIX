import React, { useEffect, useState } from "react";
import { supabase } from "../client";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";
import "../AuthPages.css";

function SignUpPage() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("");
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  const handleGoogleSignUp = async () => {
    if (!role) {
      setShowRoleWarning(true);
      return;
    }
    // Save role in sessionStorage for use after OAuth redirect
    sessionStorage.setItem('signupRole', role);
    
    // Get the current origin (handles both local and deployed environments)
    const currentOrigin = window.location.origin;
    const redirectUrl = `${currentOrigin}/post-signup`;
    
    console.log('Redirecting to:', redirectUrl); // Debug log
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    if (error) {
      console.error("Error with Google sign-up:", error.message);
    }
  };

  return (
    <div className="auth-bg">
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

        <button type="button" className="auth-btn" onClick={handleGoogleSignUp}>
          <i className="fab fa-google"></i> Sign Up with Google
        </button>

        <p className="auth-prompt">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Login here
          </Link>
        </p>

        {showRoleWarning && (
          <div className="role-warning-modal">
            <div className="role-warning-box">
              <button className="close-warning" onClick={() => setShowRoleWarning(false)}>
                &times;
              </button>
              <p>Please select a role first!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SignUpPage;
