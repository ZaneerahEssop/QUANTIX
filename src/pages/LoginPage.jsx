// src/pages/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../client";
import { useNavigate, Link } from "react-router-dom";
import { OAUTH_REDIRECT_URL } from "../config";
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
      else if (data.user_role === 'vendor') navigate('/vendor-dashboard');
      else navigate('/dashboard');
    }
  }
  redirectByRole();
}, [session, navigate]);

  const handleGoogleSignIn = async () => {
    // Always use localhost for development
    const redirectUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000/loading'
      : OAUTH_REDIRECT_URL;
      
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