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

  useEffect(() => {
    async function redirectByRole() {
      if (session && session.user) {
        // Fetch role from Supabase users table
        const { data, error } = await supabase
          .from('users')
          .select('user_role')
          .eq('user_id', session.user.id)
          .single();
        if (error || !data) {
          navigate('/dashboard');
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: OAUTH_REDIRECT_URL,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    if (error) {
      console.error("Error with Google sign-in:", error.message);
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