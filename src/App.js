import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import SignUp from "./pages/SignUp";
import PlannerForm from "./pages/PlannerForm";
import VendorForm from "./pages/VendorForm";
import PlannerDashboard from "./pages/PlannerDashboard";
import VendorDashboard from "./pages/VendorDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/planner-form" element={<PlannerForm />} />
        <Route path="/vendor-form" element={<VendorForm />} />
        <Route path="/planner-dashboard" element={<PlannerDashboard />} />
        <Route path="/vendor-dashboard" element={<VendorDashboard />} />

      </Routes>
    </Router>
  );
}

export default App;
