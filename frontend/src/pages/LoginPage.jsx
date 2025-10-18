import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import '../AuthPages.css';
import { FaArrowLeft } from 'react-icons/fa';

function LoginPage() {
  const [session, setSession] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [showRoleConflict, setShowRoleConflict] = useState(false);
  const [roleConflictMessage, setRoleConflictMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Set up initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

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
          await supabase.auth.signOut();
          return;
        }

        // Get the intended role from URL or state
        const intendedRole = new URLSearchParams(window.location.search).get('role');

        // Check if user is trying to sign up with a different role
        if (intendedRole && data.user_role !== intendedRole) {
          setRoleConflictMessage(
            `You already have an account as a ${data.user_role}. To register as a ${intendedRole}, please use a different email.`
          );
          setShowRoleConflict(true);
          // Sign out the user since they shouldn't proceed
          await supabase.auth.signOut();
          return;
        }

        // Handle role-based navigation
        switch (data.user_role) {
          case 'planner':
            navigate('/dashboard');
            break;
          case 'vendor':
            // Check vendor status
            const { data: vendor, error: vendorError } = await supabase
              .from("vendors")
              .select("status")
              .eq("vendor_id", session.user.id)
              .single();

            if (vendorError) {
              console.error("Error fetching vendor status:", vendorError.message);
              setLoginError("Error verifying vendor status. Please try again.");
              return;
            }

            if (vendor.status === 'pending') {
              navigate('/vendor-pending');
            } else if (vendor.status === 'approved') {
              navigate('/vendor-dashboard');
            } else {
              navigate('/vendor-rejected');
            }
            break;
          case 'admin':
            navigate('/admin-dashboard');
            break;
          default:
            setLoginError("Invalid user role. Please contact support.");
            await supabase.auth.signOut();
        }
      }
    }
    redirectByRole();
  }, [session, navigate]);

  const handleGoogleSignIn = async () => {
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
          skipBrowserRedirect: false
        }
      });
      
      if (error) {
        console.error('Error during Google sign in:', error.message);
        setLoginError("Failed to sign in with Google. Please try again.");
        return;
      }
      
      console.log('OAuth response:', data);
      
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      setLoginError("An unexpected error occurred. Please try again.");
    }
  };

  const handleBackToLanding = () => {
    navigate('/');
  };

  return (
    <div className="auth-bg">
      <div className="auth-container">
        <button 
          onClick={handleBackToLanding}
          className="back-button"
          style={{
            background: 'none',
            border: 'none',
            color: '#333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            padding: '0.25rem 0.5rem',
          }}
        >
          <FaArrowLeft style={{ marginRight: '6px', fontSize: '0.8rem' }} />
          Back to Home
        </button>
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

      {showRoleConflict && (
        <div className="role-warning-modal" onClick={() => setShowRoleConflict(false)}>
          <div className="role-warning-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-warning" aria-label="Close" onClick={() => setShowRoleConflict(false)}>
              ×
            </button>
            <h2 className="accent-text">Account Already Exists</h2>
            <p style={{ marginTop: '0.5rem' }}>{roleConflictMessage}</p>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              Tip: Use another Google account or sign out and create a new email for the second role.
            </p>
            <button className="auth-btn" onClick={() => setShowRoleConflict(false)}>
              Okay, got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;