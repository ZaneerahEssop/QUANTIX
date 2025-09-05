// src/App.js
import { useEffect, useState } from 'react';
import { supabase } from './client';
// import LoginPage from './pages/LoginPage';
import PlannerDashboard from './pages/PlannerDashboard'; // Assuming you have a dashboard page
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import LoginPage from './pages/LoginPage';

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
  <Route path="/dashboard" element={<PlannerDashboard session={session} />} />
      </Routes>
    </BrowserRouter>
  );
}