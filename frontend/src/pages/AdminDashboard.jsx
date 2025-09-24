import React, { useState, useEffect } from "react";
import { supabase } from "../client";
import { useNavigate } from "react-router-dom";
import "../styling/AdminDashboard.css";
import {  FaClock, FaCheckCircle, FaTimesCircle, FaListAlt } from "react-icons/fa";

export default function AdminDashboard() {
  const [vendors, setVendors] = useState([]);
  const [filter, setFilter] = useState("All");
  const [stats, setStats] = useState({ pending: 0, accepted: 0, rejected: 0, total: 0 });
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  // Check if user is admin and fetch vendors
  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("user_role")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data || data.user_role !== "admin") {
        navigate("/login");
        return;
      }

      setAuthorized(true);
      await fetchVendors();
      setLoading(false);
    };

    checkRoleAndFetch();
  }, [navigate]);

  // Fetch vendors
  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vendors:", error.message);
    } else {
      setVendors(data);
      const pending = data.filter(v => v.status === "pending").length;
      const accepted = data.filter(v => v.status === "accepted").length;
      const rejected = data.filter(v => v.status === "rejected").length;
      setStats({ pending, accepted, rejected, total: data.length });
    }
  };

  // Accept / Reject vendor
  const handleAction = async (vendor_id, status) => {
    const { error } = await supabase
      .from("vendors")
      .update({ status })
      .eq("vendor_id", vendor_id);

    if (error) {
      console.error("Error updating vendor:", error.message);
    } else {
      setVendors(prev => prev.map(v => (v.vendor_id === vendor_id ? { ...v, status } : v)));
      setStats(prev => {
        let { pending, accepted, rejected, total } = prev;
        if (status === "accepted") {
          accepted++; if (pending > 0) pending--;
        } else if (status === "rejected") {
          rejected++; if (pending > 0) pending--;
        }
        return { pending, accepted, rejected, total };
      });
    }
  };

  const filteredVendors = filter === "All" ? vendors : vendors.filter(v => v.status.toLowerCase() === filter.toLowerCase());

  if (loading) return <p>Loading...</p>;
  if (!authorized) return null;

  return (
    <>
      {/* Admin Navbar */}
      <div className="admin-navbar">
        <div className="admin-navbar-left">
          <h2>Welcome back, Admin!</h2>
          <p>Here's what's happening with your vendors today</p>
        </div>
        <div className="admin-navbar-right">
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
        {/* Dashboard Cards */}
        <div className="dashboard-cards">
          <div className="card pending">
            <div className="card-icon"><FaClock /></div>
            <div className="card-info">
              <h3>{stats.pending}</h3>
              <p>Pending Vendors</p>
            </div>
          </div>
          <div className="card approved">
            <div className="card-icon"><FaCheckCircle /></div>
            <div className="card-info">
              <h3>{stats.accepted}</h3>
              <p>Approved Vendors</p>
            </div>
          </div>
          <div className="card rejected">
            <div className="card-icon"><FaTimesCircle /></div>
            <div className="card-info">
              <h3>{stats.rejected}</h3>
              <p>Rejected Vendors</p>
            </div>
          </div>
          <div className="card total">
            <div className="card-icon"><FaListAlt /></div>
            <div className="card-info">
              <h3>{stats.total}</h3>
              <p>Total Vendors</p>
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="vendor-requests">
          <div className="section-header">
            <h2>Vendors</h2>
            <div className="filters">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option>All</option>
                <option>Pending</option>
                <option>Accepted</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Service Type</th>
                <th>Contact Number</th>
                <th>Joined On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length > 0 ? (
                filteredVendors.map(vendor => (
                  <tr key={vendor.vendor_id}>
                    <td>
                      <div className="vendor-info">
                        <div className="vendor-avatar">{vendor.business_name || "Vendor Name"}</div>
                        <div><p>{vendor.vendor_name}</p></div>
                      </div>
                    </td>
                    <td>{vendor.service_type}</td>
                    <td>{vendor.contact_number}</td>
                    <td>{new Date(vendor.created_at).toLocaleDateString()}</td>
                    <td><span className={`status ${vendor.status}`}>{vendor.status}</span></td>
                    <td className="actions">
                      {vendor.status === "pending" ? (
                        <>
                          <button className="btn btn-accept" onClick={() => handleAction(vendor.vendor_id, "accepted")}>Accept</button>
                          <button className="btn btn-reject" onClick={() => handleAction(vendor.vendor_id, "rejected")}>Decline</button>
                        </>
                      ) : (
                        <button className="btn" disabled>Processed</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6">No vendors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </>
  );
}
