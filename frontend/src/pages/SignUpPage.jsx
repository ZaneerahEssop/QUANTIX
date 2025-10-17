import React, { useEffect, useState } from "react";
import { supabase } from "../client";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";
import "../AuthPages.css";

function SignUpPage() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("");
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [conflictText, setConflictText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      // Skip Supabase calls in tests
      setSession(null);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Detect conflict from query params (redirected from PostSignupRedirect)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('conflict') === '1') {
      const existingRole = query.get('existingRole');
      const intendedRole = query.get('intendedRole');
      setConflictText(
        `This email is already registered as a ${existingRole}. To sign up as a ${intendedRole}, please use a different email.`
      );
      setShowConflict(true);
    }
  }, []);

  useEffect(() => {
    if (session) {
      const role = sessionStorage.getItem("signupRole");

      if (role === "vendor") {
        // Vendors should always start at pending approval
        navigate("/pending-approval", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }

      // Clear it so relogin logic takes over later
      sessionStorage.removeItem("signupRole");
    }
  }, [session, navigate]);

  const handleGoogleSignUp = async () => {
    if (!role) {
      setShowRoleWarning(true);
      return;
    }
    // Save role in sessionStorage for use after OAuth redirect
    sessionStorage.setItem('signupRole', role);
    
    // Use the same redirect URL as configured in the Supabase client
    const redirectUrl = `${window.location.origin}/loading`;
    
    console.log('Initiating Google sign-up with redirect to:', redirectUrl);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error with Google sign-up:', error.message);
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

        {showConflict && (
          <div className="role-warning-modal" onClick={() => setShowConflict(false)}>
            <div className="role-warning-box" onClick={(e) => e.stopPropagation()}>
              <button className="close-warning" onClick={() => setShowConflict(false)}>
                &times;
              </button>
              <h2 className="accent-text">Role Conflict</h2>
              <p style={{ marginTop: '0.5rem' }}>{conflictText}</p>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                Tip: Use a different Google account or create a new email for your second role.
              </p>
              <button className="auth-btn" onClick={() => setShowConflict(false)}>
                Okay, got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SignUpPage;
