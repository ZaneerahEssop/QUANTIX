// src/pages/LoginPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client'; // Ensure this path is correct

export default function LoginPage() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  // This useEffect hook listens for changes in the auth state (e.g., user signs in or out)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up the subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Function to handle the Google sign-in
  const handleGoogleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      console.error('Error with Google sign-in:', error.message);
    } else {
      console.log('Redirecting to Google for authentication...');
    }
  };

  // Redirect to dashboard if session exists
  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  // Conditionally render UI based on whether a user is logged in
  // Only show sign-in UI if not logged in
  if (!session) {
    return (
      <div>
        <h1>Sign in to your account</h1>
        <button onClick={handleGoogleSignIn}>
          Sign in with Google 🌐
        </button>
      </div>
    );
  }
}