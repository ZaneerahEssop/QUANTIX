// src/pages/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../client";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";
import "../AuthPages.css";

function LoginPage() {
  const [session, setSession] = useState(null);
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

const [loginError, setLoginError] = useState("");

useEffect(() => {
  async function redirectByRole() {
    if (session && session.user) {
      const { data, error } = await supabase
        .from('users')
        .select('user_role')
        .eq('user_id', session.user.id)
        .single();
      if (error || !data) {
        setLoginError("Account not found. Please sign up first.");
        return;
      }
      if (data.user_role === 'planner') navigate('/dashboard');
      else if (data.user_role === 'vendor') {
        // fetch vendor status
        const { data: vendor, error: vendorError } = await supabase
          .from("vendors")
          .select("status")
          .eq("vendor_id", session.user.id)
          .single();

        if (vendorError || !vendor) {
            console.error("Error fetching vendor status:", vendorError?.message);
            navigate("/pending-approval", { state: { status: "pending" } }); // fallback
            return;
        }else if (vendor.status === "accepted") {
            navigate("/vendor-dashboard");
        } else if (vendor.status === "pending") {
            navigate("/pending-approval", { state: { status: "pending" } });
        } else if (vendor.status === "rejected") {
            navigate("/pending-approval", { state: { status: "rejected" } });
        } else {
            // unknown status fallback
            navigate("/pending-approval", { state: { status: "pending" } });
          }
      }

      else if (data.user_role === 'admin') navigate('/admin-dashboard');
      else navigate('/dashboard');
    }
  }
  redirectByRole();
}, [session, navigate]);

  const handleGoogleSignIn = async () => {
    // Always use localhost for development
    const redirectUrl = `${window.location.protocol}//${window.location.host}/loading`;
      
    console.log('Initiating Google OAuth with redirect URL:', redirectUrl);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false // Ensure the browser handles the redirect
        }
      });
      
      if (error) {
        console.error('Error with Google sign-in:', error);
        // Handle error (show to user)
        return;
      }
      
      console.log('OAuth response:', data);
      
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-container">
        <h1>
          Welcome to <span className="accent-text">Event-ually Perfect</span>
        </h1>
        <p>Login to get started planning or managing your event experience.</p>
        <button onClick={handleGoogleSignIn} className="auth-btn">
          <i className="fab fa-google"></i> Login with Google
        </button>
         {loginError && (
        <div style={{ color: "pink", marginBottom: "1rem" }}>
          {loginError}
        </div>
      )}
        <p className="auth-prompt">
          First time?{' '}
          <Link to="/signup" className="auth-link">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;