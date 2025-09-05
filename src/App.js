// src/App.js
import { useEffect, useState } from 'react';
import { supabase } from './client';
import LoginPage from './pages/LoginPage';
import PlannerDashboard from './pages/PlannerDashboard'; // Assuming you have a dashboard page

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check for an existing session on app load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for authentication state changes (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Unsubscribe from the listener when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  // Conditionally render components based on the session state
  if (!session) {
    return <LoginPage />;
  } else {
    // Pass the session down as a prop if needed by other components
    return <PlannerDashboard session={session} />;
  }
}