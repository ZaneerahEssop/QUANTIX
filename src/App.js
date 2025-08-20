import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Landingpage from "./pages/Landingpage";
import SignUp from "./pages/SignUp";
import PlannerForm from "./pages/PlannerForm";
import VendorForm from "./pages/VendorForm";
import PlannerDashboard from "./pages/PlannerDashboard";
import VendorDashboard from "./pages/VendorDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landingpage />} />
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
