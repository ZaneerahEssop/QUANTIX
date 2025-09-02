import React from "react";
// The 'BrowserRouter as Router' has been removed from this import.
import { Routes, Route, Navigate} from "react-router-dom";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
// The filename is corrected to 'Signup.jsx' with a lowercase 'u'.
import SignUp from "./pages/SignUp.jsx";
import PlannerForm from "./pages/PlannerForm";
import VendorForm from "./pages/VendorForm";
import AdminDashboard from "./pages/AdminDashboard";
import PlannerDashboard from "./pages/PlannerDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import AddEventForm from "./pages/AddEventForm";
import EventDetails from "./pages/EventDetails";
import EditPlannerProfile from "./pages/EditPlannerProfile";
import EditVendorProfile from "./pages/EditVendorProfile";
import VendorEventDetails from "./pages/VendorEventDetails";
import './App.css';

// Layout component for auth pages (login/signup)
const AuthLayout = ({ children }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at 100% 0%, #E2C5AE, #E5ACBF)',
    padding: '20px',
    boxSizing: 'border-box'
  }}>
    {children}
  </div>
);

function App() {
  // The wrapping <Router> tags have been removed from this component.
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route 
        path="/login" 
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <AuthLayout>
            <SignUp />
          </AuthLayout>
        } 
      />
      <Route 
        path="/planner-form" 
        element={
          <AuthLayout>
            <PlannerForm />
          </AuthLayout>
        } 
      />
      <Route path="/vendor-form" element={<VendorForm />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/planner-dashboard" element={<PlannerDashboard />} />
      <Route path="/vendor-dashboard" element={<VendorDashboard />} />
      <Route path="/add-event" element={<AddEventForm />} />
      <Route path="/event-details/:eventId" element={<EventDetails />} />
      <Route path="/edit-planner-profile" element={<EditPlannerProfile />} />
      <Route path="/edit-vendor-profile" element={<EditVendorProfile />} />
      <Route path="/vendor/event/:eventId" element={<VendorEventDetails />} />
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  );
}

export default App;

