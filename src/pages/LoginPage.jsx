// src/pages/LoginPage.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../client'; // Ensure this path is correct

export default function LoginPage() {
  const [session, setSession] = useState(null);

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
    });

    if (error) {
      console.error('Error with Google sign-in:', error.message);
    } else {
      console.log('Redirecting to Google for authentication...');
    }
  };

  // Conditionally render UI based on whether a user is logged in
  if (session) {
    // If a session exists, the user is logged in. You can redirect them
    // or show a different component (e.g., a dashboard).
    return (
      <div>
        <h1>Welcome back, {session.user.email}!</h1>
        <button onClick={async () => await supabase.auth.signOut()}>
          Sign Out
        </button>
      </div>
    );
  } else {
    // If no session exists, show the sign-in button.
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