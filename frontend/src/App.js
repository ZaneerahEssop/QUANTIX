// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./client";

// Import your CSS
import "./App.css";

// Import all your page components
import Landing from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import LoadingPage from "./pages/LoadingPage";
import PlannerDashboard from "./pages/PlannerDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PlannerForm from "./pages/PlannerForm";
import VendorForm from "./pages/VendorForm";
import PostSignupRedirect from "./pages/PostSignupRedirect";
import EditVendorProfile from "./pages/EditVendorProfile";
import EditPlannerProfile from "./pages/EditPlannerProfile";
import AddEventForm from "./pages/AddEventForm";
import EventDetails from "./pages/EventDetails";
import PendingApproval from "./pages/PendingApproval";
import VendorServices from "./pages/VendorServices";

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      if (session?.user) {
        const { data, error } = await supabase
          .from("users")
          .select("user_role")
          .eq("user_id", session.user.id)
          .single();

        if (!error && data) {
          setRole(data.user_role);
          if (
            window.location.pathname === "/" ||
            window.location.pathname === "/login"
          ) {
            switch (data.user_role) {
              case "planner":
                window.location.replace("/dashboard");
                break;
              case "vendor":
                window.location.replace("/vendor-dashboard");
                break;
              case "admin":
                window.location.replace("/admin-dashboard");
                break;
              default:
                console.warn("Unknown user role:", data.user_role);
                window.location.replace("/login");
            }
          }
        }
      }
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getRedirectPath = () => {
    switch (role) {
      case "planner":
        return "/dashboard";
      case "vendor":
        return "/vendor-dashboard";
      case "admin":
        return "/admin-dashboard";
      default:
        return "/login";
    }
  };

  return (
    <>
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Securing your session...</p>
        </div>
      ) : (
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              session ? <Navigate to={getRedirectPath} replace /> : <Landing />
            }
          />
          <Route
            path="/login"
            element={
              session ? (
                <Navigate to={getRedirectPath} replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/signup"
            element={
              session ? (
                <Navigate to={getRedirectPath} replace />
              ) : (
                <SignUpPage />
              )
            }
          />

          {/* Special Purpose Routes */}
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="/post-signup" element={<PostSignupRedirect />} />
          <Route path="/planner-form" element={<PlannerForm />} />
          <Route path="/vendor-form" element={<VendorForm />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              session ? (
                <PlannerDashboard session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/vendor-dashboard"
            element={
              session ? (
                <VendorDashboard session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              session ? (
                <AdminDashboard session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/edit-vendor-profile"
            element={
              session ? (
                <EditVendorProfile session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/edit-planner-profile"
            element={
              session ? (
                <EditPlannerProfile session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/add-event"
            element={
              session ? (
                <AddEventForm session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/viewEvent/:id"
            element={
              session ? (
                <EventDetails session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/vendor/services"
            element={
              session ? (
                <VendorServices session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/vendors/:vendorId/services"
            element={
              session ? (
                <VendorServices session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/pending-approval"
            element={
              session ? (
                <PendingApproval session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      )}
    </>
  );
}
