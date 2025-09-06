// src/App.js
import { useEffect, useState } from 'react';
import { supabase } from './client';
// import LoginPage from './pages/LoginPage';
import PlannerDashboard from './pages/PlannerDashboard'; // Assuming you have a dashboard page
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import PlannerForm from './pages/PlannerForm';
import VendorForm from './pages/VendorForm';
import VendorDashboard from './pages/VendorDashboard';
import PostSignupRedirect from './pages/PostSignupRedirect';

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
  <Route path="/signup" element={<SignUpPage />} />
  <Route path="/dashboard" element={<PlannerDashboard session={session} />} />
  <Route path="/planner-form" element={<PlannerForm />} />
  <Route path="/vendor-form" element={<VendorForm />} />
  <Route path="/vendor-dashboard" element={<VendorDashboard />} />
  <Route path="/post-signup" element={<PostSignupRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}