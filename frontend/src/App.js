// src/App.js
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './client';

// Import your CSS
import './App.css';

// Import all your page components
import Landing from './pages/Landing';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import LoadingPage from './pages/LoadingPage';
import PlannerDashboard from './pages/PlannerDashboard';
import VendorDashboard from './pages/VendorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PlannerForm from './pages/PlannerForm';
import VendorForm from './pages/VendorForm';
import PostSignupRedirect from './pages/PostSignupRedirect';
import EditVendorProfile from './pages/EditVendorProfile';
import EditPlannerProfile from './pages/EditPlannerProfile';
import AddEventForm from './pages/AddEventForm';
import EventDetails from './pages/EventDetails';
import PendingApproval from './pages/PendingApproval';
import VendorServices from './pages/VendorServices';


export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip Supabase calls in a test environment
    if (process.env.NODE_ENV === 'test') {
      setSession(null);
      setLoading(false);
      return;
    }

    // Asynchronously fetch the session data on initial load
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false); // Set loading to false once the session is fetched
    };

    fetchSession();

    // Listen for changes in authentication state (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      {loading ? (
        // During the initial session check, display a simple, logic-free loading indicator.
        // This prevents the app from rendering routes before the user's auth state is known,
        // and avoids any unwanted navigation from the main LoadingPage component.
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Securing your session...</p>
        </div>
      ) : (
        // Once the session check is complete, render the main application routes.
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          
          {/* Special Purpose Routes */}
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="/post-signup" element={<PostSignupRedirect />} />
          <Route path="/planner-form" element={<PlannerForm />} />
          <Route path="/vendor-form" element={<VendorForm />} />

          {/* Protected Routes (require a session) */}
          <Route path="/dashboard" element={
            session ? <PlannerDashboard session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/vendor-dashboard" element={
            session ? <VendorDashboard session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/admin-dashboard" element={
            session ? <AdminDashboard session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/edit-vendor-profile" element={
            session ? <EditVendorProfile session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/edit-planner-profile" element={
            session ? <EditPlannerProfile session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/add-event" element={
            session ? <AddEventForm session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/viewEvent/:id" element={
            session ? <EventDetails session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/vendor/services" element={
            session ? <VendorServices session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/vendors/:vendorId/services" element={
            session ? <VendorServices session={session} /> : <Navigate to="/login" />
          } />
          <Route path="/pending-approval" element={
            session ? <PendingApproval session={session} /> : <Navigate to="/login" />
          } />
        </Routes>
      )}
    </BrowserRouter>
  );
}