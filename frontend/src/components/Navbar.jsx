import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../client";
import { FaSearch, FaTimes } from "react-icons/fa";
import "./Navbar.css"; 

const Navbar = ({ session, showOnlyLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPlannerDashboard = location.pathname === "/dashboard";

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const searchRef = useRef(null);

  const fetchVendors = async () => {
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) return;

      const API_URL = process.env.REACT_APP_API_URL;

      const response = await fetch(`${API_URL}/api/vendors`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch vendors: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setVendors(data);
        setFilteredVendors(data);
      } else {
        throw new Error("Invalid vendor data format received");
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      // Fallback to mock data in development only
      if (process.env.NODE_ENV === "development") {
        console.warn("Using mock vendor data due to API error");
        const mockVendors = [
          {
            vendor_id: 1,
            business_name: "The Venue Collective",
            service_type: "Venue",
            email: "info@venuecollective.com",
          },
          {
            vendor_id: 2,
            business_name: "Gourmet Delights",
            service_type: "Catering",
            email: "info@gourmetdelights.com",
          },
          {
            vendor_id: 3,
            business_name: "Blooms & Petals",
            service_type: "Florist",
            email: "info@bloomsandpetals.com",
          },
          {
            vendor_id: 4,
            business_name: "Melody Makers",
            service_type: "Music",
            email: "info@melodymakers.com",
          },
        ];
        setVendors(mockVendors);
        setFilteredVendors(mockVendors);
      }
    }
  };

  useEffect(() => {
    if (isPlannerDashboard) {
      fetchVendors();
    }
  }, [isPlannerDashboard]);

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (!searchTerm || searchTerm.trim() === "") {
        setFilteredVendors(vendors);
        return;
      }
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = vendors.filter(
        (vendor) =>
          (vendor.business_name &&
            vendor.business_name.toLowerCase().includes(searchTermLower)) ||
          (vendor.service_type &&
            vendor.service_type.toLowerCase().includes(searchTermLower))
      );
      setFilteredVendors(filtered);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, vendors]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) setSearchTerm("");
  };

  const handleVendorSelect = (vendor) => {
    navigate(`/vendors/${vendor.vendor_id}/services`);
    setShowSearch(false);
    setSearchTerm("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getEditProfilePath = () => {
    if (!session?.user) return "/login";
    const isVendor = location.pathname.startsWith("/vendor-dashboard");
    if (isVendor) return "/edit-vendor-profile";
    return "/edit-planner-profile";
  };

  return (
    <nav className="navbar-container">
      <div className="navbar-logo" onClick={() => navigate("/")}>
        <span className="gradient">Event-ually Perfect</span>
      </div>

      <div className="navbar-links">
        {isPlannerDashboard && (
          <div ref={searchRef} className="search-wrapper">
            {showSearch ? (
              <div className="search-active">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vendors..."
                  autoFocus
                  className="search-input"
                />
                <FaTimes className="search-close-icon" onClick={toggleSearch} />

                {searchTerm && (
                  <div className="search-results">
                    {filteredVendors.length > 0 ? (
                      filteredVendors.map((vendor) => (
                        <div
                          key={vendor.vendor_id}
                          onClick={() => handleVendorSelect(vendor)}
                          className="search-result-item"
                        >
                          <div className="result-item-header">
                            {vendor.business_name || "Unnamed Vendor"}
                            <span className="result-item-tag">
                              {vendor.service_type || "Vendor"}
                            </span>
                          </div>
                          {vendor.email && (
                            <div className="result-item-email">
                              {vendor.email}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="search-no-results">No vendors found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={toggleSearch}
                className="nav-button search-button"
                aria-label="Search for vendors"
              >
                <FaSearch style={{ marginRight: '8px' }} />
                Search for Vendors
              </button>
            )}
          </div>
        )}

        {!showOnlyLogout && session?.user && (
          <>
            <button
              onClick={() => navigate(getEditProfilePath())}
              className="nav-button"
            >
              Edit Profile
            </button>
            {location.pathname.startsWith("/vendor-dashboard") && (
              <button
                onClick={() => navigate("/vendor/services")}
                className="nav-button"
              >
                My Services
              </button>
            )}
          </>
        )}

        {session?.user && (
          <button onClick={handleLogout} className="nav-button">
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
