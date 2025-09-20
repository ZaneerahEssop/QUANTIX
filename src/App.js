// src/App.js
import { useEffect, useState } from 'react';
import { supabase } from './client';
import PlannerDashboard from './pages/PlannerDashboard';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import PlannerForm from './pages/PlannerForm';
import VendorForm from './pages/VendorForm';
import VendorDashboard from './pages/VendorDashboard';
import PostSignupRedirect from './pages/PostSignupRedirect';
import LoadingPage from './pages/LoadingPage';
import EditVendorProfile from './pages/EditVendorProfile';
import EditPlannerProfile from './pages/EditPlannerProfile';
import AddEventForm from './pages/AddEventForm';
import EventDetails from './pages/EventDetails';
import React from 'react';

import VendorServices from './pages/VendorServices';

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {

    if (process.env.NODE_ENV === 'test') {
      // Skip Supabase calls in tests
      setSession(null);
      return;
    }

    // Real Supabase logic
  
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/dashboard" element={
          session ? <PlannerDashboard session={session} /> : <Navigate to="/loading" />
        } />
        <Route path="/planner-form" element={<PlannerForm />} />
        <Route path="/vendor-form" element={<VendorForm />} />
        <Route path="/vendor-dashboard" element={
          session ? <VendorDashboard session={session} /> : <Navigate to="/loading" />
        } />
        <Route path="/post-signup" element={<PostSignupRedirect />} />
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
      </Routes>

    </BrowserRouter>
  );
}