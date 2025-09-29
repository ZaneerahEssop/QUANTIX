import { useEffect, useState, useRef } from "react";
import { supabase } from "../client";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaFileAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUpload,
  FaUsers,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../AddEventForm.css";

export default function AddEventForm() {
  const navigate = useNavigate();

  // Function to handle vendor card click
  const handleVendorCardClick = (vendorId) => {
    navigate(`/vendors/${vendorId}/services?readonly=true`);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
    theme: "",
    venue: "",
    end_time: "",
  });
  const vendorCategories = [
    "Catering",
    "Flowers",
    "Venue",
    "Photography",
    "Music",
    "Decor",
  ];

  const [allVendors, setAllVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [usingVenueVendor, setUsingVenueVendor] = useState(false);
  const [selectedVenueVendor, setSelectedVenueVendor] = useState(null);
  const [selectedVenueIndex, setSelectedVenueIndex] = useState(0);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchTimeoutRef = useRef(null);

  // New state for pop-up messages
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If manually changing the venue field, disable the venue vendor selection
    if (name === "venue" && usingVenueVendor) {
      setUsingVenueVendor(false);
      setSelectedVenueVendor(null);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Add/remove has-value class for floating labels
    if (value) {
      e.target.classList.add("has-value");
    } else {
      e.target.classList.remove("has-value");
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        setWarningMessage(
          `File is too large: ${file.name}. Maximum size is 10 MB.`
        );
        setShowWarning(true);
        return false;
      }
      return true;
    });
    setDocuments((prev) => [...prev, ...allowedFiles]);
  };

  const handleRemoveDocument = (docToRemove) => {
    setDocuments(documents.filter((doc) => doc.name !== docToRemove.name));
  };

  useEffect(() => {
    // Mock vendor data for development
    const mockVendors = [
      {
        vendor_id: 1,
        business_name: "Elegant Events",
        service_type: "Venue",
        contact_number: "(555) 123-4567",
        email: "info@elegantevents.com",
        address: "123 Event St, New York, NY",
        description:
          "A beautiful venue for all types of events with modern amenities and professional staff.",
      },
      {
        vendor_id: 2,
        business_name: "Perfect Clicks Photography",
        service_type: "Photography",
        contact_number: "(555) 234-5678",
        email: "hello@perfectclicks.com",
        address: "456 Photo Ave, New York, NY",
        description:
          "Professional photography services capturing your special moments with creativity and style.",
      },
      {
        vendor_id: 3,
        business_name: "Melody Makers",
        service_type: "Music",
        contact_number: "(555) 345-6789",
        email: "bookings@melodymakers.com",
        address: "789 Music Ln, New York, NY",
        description:
          "Live music band providing entertainment for all types of events and celebrations.",
      },
      {
        vendor_id: 4,
        business_name: "Blooms & Petals",
        service_type: "Florist",
        contact_number: "(555) 456-7890",
        email: "info@bloomsandpetals.com",
        address: "321 Flower Rd, New York, NY",
        description:
          "Floral arrangements and decorations to make your event beautiful and memorable.",
      },
      {
        vendor_id: 5,
        business_name: "Gourmet Delights",
        service_type: "Catering",
        contact_number: "(555) 567-8901",
        email: "catering@gourmetdelights.com",
        address: "654 Food Blvd, New York, NY",
        description:
          "Delicious catering services with a variety of menu options for any occasion.",
      },
    ];

    const fetchVendors = async () => {
      setIsLoading(true);
      setSearchError(null);

      try {
        // Get the user session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session. Please log in.");
        }

        // Use the same API URL as PlannerDashboard
        const API_URL = process.env.REACT_APP_API_URL;

        const response = await fetch(`${API_URL}/api/vendors`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch vendors: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid vendor data format received");
        }

        console.log("Fetched vendors:", data);
        setAllVendors(data);
        setFilteredVendors(data);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        // Fallback to mock data in development
        if (process.env.NODE_ENV === "development") {
          console.warn("Using mock vendor data due to API error");
          setAllVendors(mockVendors);
          setFilteredVendors(mockVendors);
          setSearchError(
            "Using sample vendor data. Some features may be limited."
          );
        } else {
          setSearchError("Failed to load vendors. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []); // Empty dependency array since we don't have any external dependencies

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchInput.trim() === searchTerm) {
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(searchInput.trim().toLowerCase());
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput, searchTerm]);

  // Filter vendors based on search term and category
  useEffect(() => {
    const filterVendors = () => {
      try {
        let result = [...allVendors];

        // --- CHANGE START ---
        // Filter by category
        if (selectedCategory !== "All") {
          result = result.filter(
            (v) =>
              v.service_type &&
              v.service_type
                .toLowerCase()
                .split(',')
                .map(s => s.trim())
                .includes(selectedCategory.toLowerCase())
          );
        }
        // --- CHANGE END ---

        // Filter by search term
        if (searchTerm) {
          result = result.filter((v) => {
            const searchFields = [
              v.business_name,
              v.service_type,
              v.contact_person,
              v.email,
              v.contact_number,
              v.address,
              v.description,
            ]
              .filter(Boolean)
              .map((field) => field.toLowerCase());

            return searchFields.some((field) => field.includes(searchTerm));
          });
        }

        setFilteredVendors(result);
        setSearchError(null);
      } catch (error) {
        console.error("Error filtering vendors:", error);
        setSearchError("An error occurred while searching. Please try again.");
      }
    };

    filterVendors();
  }, [searchTerm, selectedCategory, allVendors]);

  const handleSelectVendor = (vendor) => {
    if (selectedVendors.some((v) => v.vendor_id === vendor.vendor_id)) {
      return;
    }

    setSelectedVendors((prev) => [
      ...prev,
      {
        ...vendor,
        request_status: "selected",
      },
    ]);
  };

  const handleRemoveVendor = (vendorToRemove) => {
    const vendorName = vendorToRemove.business_name || "Vendor";

    try {
      // Simply remove from selected vendors - no API call needed since
      // requests haven't been sent yet
      setSelectedVendors((prev) =>
        prev.filter((vendor) => vendor.vendor_id !== vendorToRemove.vendor_id)
      );

      // Show success message
      setSuccessMessage(`${vendorName} removed from selection.`);
      setShowSuccess(true);

      // Optional: Auto-hide after 1.5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Error removing vendor:", error);
      setWarningMessage(`Failed to remove ${vendorName}. Please try again.`);
      setShowWarning(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowWarning(false);
    setShowSuccess(false);

    // Basic validation
    if (!formData.name || !formData.date) {
      setWarningMessage("Please fill in at least the event name and date.");
      setShowWarning(true);
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setWarningMessage("You must be logged in to create an event.");
      setShowWarning(true);
      setIsSubmitting(false);
      return;
    }

    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setWarningMessage("Please select a future date.");
      setShowWarning(true);
      setIsSubmitting(false);
      return;
    }

    try {
      // Build the API URL
      const API_URL = process.env.REACT_APP_API_URL;

      // Format documents BEFORE sending (upload separately if needed)
      const formattedDocs = documents.map((docFile) => ({
        name: docFile.name,
        url: docFile.url || "", // if already uploaded
        uploaded_by: user.id,
      }));

      // Prepare request body
      const requestBody = {
        name: formData.name,
        theme: formData.theme || null,
        start_time: formData.time
          ? `${formData.date}T${formData.time}`
          : `${formData.date}T00:00:00`,
        end_time: formData.end_time
          ? `${formData.date}T${formData.end_time}`
          : null,
        venue: formData.venue || null,
        planner_id: user.id,
        selectedVendors: selectedVendors.map((v) => ({
          vendor_id: v.vendor_id,
        })),
        documents: formattedDocs,
      };

      // Call backend API
      const response = await fetch(`${API_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`, // you can also pass access_token if backend verifies it
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      // Success 🎉
      setFormData((prev) => ({ ...prev, event_id: data.event.event_id }));
      setSuccessMessage(
        `Event "${formData.name}" created successfully${
          selectedVendors.length > 0
            ? ` and ${selectedVendors.length} vendor request(s) sent!`
            : "!"
        }`
      );
      setShowSuccess(true);
    } catch (error) {
      console.error("Error creating event:", error);
      setWarningMessage(
        error.message || "Failed to create event. Please try again."
      );
      setShowWarning(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVenueDropdown && !event.target.closest(".form-group")) {
        setShowVenueDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showVenueDropdown]);

  return (
    <>
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            animation: "fadeIn 0.3s ease-out",
            pointerEvents: "auto",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              padding: "2.5rem 3rem",
              position: "relative",
              minWidth: "350px",
              maxWidth: "90%",
              textAlign: "center",
              border: "2px solid #E5ACBF",
              zIndex: 10001,
            }}
          >
            <button
              onClick={() => {
                setShowSuccess(false);
                // Navigate to dashboard when closing the success message
                navigate("/dashboard");
              }}
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "1rem",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#666",
                padding: "0.25rem 0.5rem",
                lineHeight: 1,
                fontWeight: "bold",
                transition: "color 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.color = "#E5ACBF")}
              onMouseOut={(e) => (e.target.style.color = "#666")}
            >
              &times;
            </button>
            <p
              style={{
                margin: "1rem 0 0",
                color: "#333",
                fontWeight: 500,
                fontSize: "1.1rem",
                padding: "0 1rem",
              }}
            >
              {/* ===== FIX #3: Display the dynamic success message ===== */}
              {successMessage}
            </p>
          </div>
        </div>
      )}
      {showWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            animation: "fadeIn 0.3s ease-out",
            pointerEvents: "auto",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              padding: "2.5rem 3rem",
              position: "relative",
              minWidth: "350px",
              maxWidth: "90%",
              textAlign: "center",
              border: "2px solid #E5ACBF",
              zIndex: 10001,
            }}
          >
            <button
              onClick={() => setShowWarning(false)}
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "1rem",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#666",
                padding: "0.25rem 0.5rem",
                lineHeight: 1,
                fontWeight: "bold",
                transition: "color 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.color = "#E5ACBF")}
              onMouseOut={(e) => (e.target.style.color = "#666")}
            >
              &times;
            </button>
            <p
              style={{
                margin: "1rem 0 0",
                color: "#333",
                fontWeight: 500,
                fontSize: "1.1rem",
                padding: "0 1rem",
              }}
            >
              {warningMessage}
            </p>
          </div>
        </div>
      )}

      <div className="profile-container">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          <FaArrowLeft /> Back to Dashboard
        </button>

        <h1>
          Create a New <span className="accent-text">Event</span>
        </h1>
        <p>Plan your perfect event by adding details, vendors, and documents</p>

        <div className="form-sections">
          <form className="profile-form" onSubmit={handleSubmit}>
            {/* Event Name */}
            <div className="form-group">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
              <label className="form-label">Event Name</label>
            </div>

            {/* Event Date and Time */}
            <div style={{ display: "flex", gap: "1rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <FaCalendarAlt className="form-icon" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
                <label className="form-label">Date</label>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <FaClock className="form-icon" />
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="form-input"
                />
                <label className="form-label">Time (Optional)</label>
              </div>
            </div>

            {/* Theme and Venue */}
            <div style={{ display: "flex", gap: "1rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="text"
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                  className="form-input"
                />
                <label className="form-label">Theme (Optional)</label>
              </div>

              <div
                className="form-group"
                style={{ flex: 1, position: "relative" }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    className="form-input"
                    disabled={usingVenueVendor}
                    onFocus={() =>
                      usingVenueVendor && setShowVenueDropdown(true)
                    }
                    style={
                      usingVenueVendor
                        ? {
                            backgroundColor: "#f5f5f5",
                            cursor: "pointer",
                            paddingRight: "35px",
                          }
                        : {}
                    }
                  />
                  <label className="form-label">
                    {usingVenueVendor
                      ? "Venue (Selected from Vendor)"
                      : "Venue (Optional)"}
                  </label>
                  {usingVenueVendor &&
                    selectedVenueVendor?.venue_names?.length > 1 && (
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() =>
                            setShowVenueDropdown(!showVenueDropdown)
                          }
                          style={{
                            position: "absolute",
                            right: "30px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "#666",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            padding: "2px 5px",
                            borderRadius: "4px",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.target.style.background = "rgba(0,0,0,0.05)")
                          }
                          onMouseOut={(e) =>
                            (e.target.style.background = "transparent")
                          }
                          title="Select a different venue"
                        >
                          ▼
                        </button>
                        {showVenueDropdown && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              backgroundColor: "white",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                              zIndex: 1000,
                              maxHeight: "200px",
                              overflowY: "auto",
                              marginTop: "4px",
                            }}
                          >
                            {selectedVenueVendor.venue_names.map(
                              (venue, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      venue,
                                    }));
                                    setSelectedVenueIndex(idx);
                                    setShowVenueDropdown(false);
                                  }}
                                  style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    backgroundColor:
                                      idx === selectedVenueIndex
                                        ? "#f0f0f0"
                                        : "transparent",
                                    ":hover": {
                                      backgroundColor: "#f5f5f5",
                                    },
                                  }}
                                >
                                  {venue}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  {usingVenueVendor && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsingVenueVendor(false);
                        setFormData((prev) => ({ ...prev, venue: "" }));
                        setShowVenueDropdown(false);
                      }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#666",
                        cursor: "pointer",
                        fontSize: "1rem",
                        padding: "5px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.target.style.background = "rgba(0,0,0,0.05)")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.background = "transparent")
                      }
                      title="Use custom venue name instead"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* End Time */}
            <div className="form-group">
              <FaClock className="form-icon" />
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="form-input"
              />
              <label className="form-label">End Time (Optional)</label>
            </div>

            {/* Vendors Section */}
            <div className="optional-section">
              <h3>
                <FaUsers /> Vendors{" "}
                <span className="optional-tag">Optional</span>
              </h3>
              <p className="section-description">
                Add vendors to your event to keep everything organized in one
                place
              </p>

              <div className="vendor-search-container">
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search for vendors by name or category"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="search-input"
                    disabled={isLoading}
                  />
                  {(isSearching || isLoading) && (
                    <div className="search-loading">
                      <div className="spinner"></div>
                    </div>
                  )}
                  {!isSearching && searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setSearchTerm("");
                      }}
                      className="clear-search"
                      aria-label="Clear search"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-filter"
                >
                  <option value="All">All Categories</option>
                  {vendorCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {searchError && (
                <div className="search-error">
                  <FaTimes className="error-icon" /> {searchError}
                </div>
              )}

              {isLoading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Loading vendors...</p>
                </div>
              ) : isSearching ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Searching vendors...</p>
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="no-results">
                  <p>No vendors found matching your search.</p>
                  {searchTerm && (
                    <button
                      type="button"
                      className="clear-filters"
                      onClick={() => {
                        setSearchInput("");
                        setSearchTerm("");
                        setSelectedCategory("All");
                      }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="vendor-grid">
                  {filteredVendors.map((vendor) => {
                    const isSelected = selectedVendors.some(
                      (v) => v.vendor_id === vendor.vendor_id
                    );

                    return (
                      <div
                        key={vendor.vendor_id}
                        className="vendor-card"
                        onClick={(e) => {
                          // Only navigate if the click is not on the request button or its children
                          if (
                            !e.target.closest(
                              ".add-vendor-btn, .undo-request-btn"
                            )
                          ) {
                            handleVendorCardClick(vendor.vendor_id);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="vendor-info">
                          <h4>{vendor.business_name}</h4>
                          <div className="vendor-category">
                            {vendor.service_type}
                          </div>
                          <div className="vendor-description">
                            {vendor.description || "No description available."}
                          </div>
                        </div>
                        <div className="vendor-actions">
                          <button
                            type="button"
                            className={`add-vendor-btn ${
                              isSelected ? "added" : ""
                            } ${isSelected ? "selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectVendor(vendor);
                            }}
                            disabled={isSelected}
                            title={isSelected ? "Vendor selected" : ""}
                          >
                            {isSelected ? (
                              <>
                                <FaCheck /> Selected
                              </>
                            ) : (
                              <>
                                <FaPlus /> Select Vendor
                              </>
                            )}
                          </button>
                          {isSelected && (
                            <button
                              type="button"
                              className="undo-request-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRemoveVendor(vendor);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleRemoveVendor(vendor);
                                }
                              }}
                              title="Remove from selection"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedVendors.length > 0 && (
                <div className="selected-vendors">
                  <h3 className="selected-title">Selected Vendors</h3>
                  <ul className="selected-vendors-list">
                    {selectedVendors.map((v) => (
                      <li key={v.vendor_id} className="selected-vendor-item">
                        <div>
                          <span className="vendor-name">{v.business_name}</span>
                          <span className="vendor-type">{v.service_type}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVendor(v)}
                          className="remove-vendor-btn"
                          title="Remove vendor"
                        >
                          <FaTimes />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="optional-section">
              <h3>
                <FaFileAlt /> Documents{" "}
                <span className="optional-tag">Optional</span>
              </h3>
              <p className="section-description">
                Upload contracts, invoices, or other important files related to
                your event
              </p>

              <div className="file-upload-area">
                <label className="file-upload-label">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <FaUpload className="upload-icon" />
                  <h3 className="upload-title">Upload Files</h3>
                  <p className="upload-subtitle">
                    Drag & drop files here or click to browse
                  </p>
                  <p className="upload-hint">
                    Maximum file size: 10MB per file
                  </p>
                </label>
              </div>

              {documents.length > 0 && (
                <div className="documents-list">
                  <h3 className="documents-title">Uploaded Files</h3>
                  <ul className="documents-container">
                    {documents.map((doc, idx) => (
                      <li key={idx} className="document-item">
                        <FaFileAlt className="file-icon" />
                        <span className="file-name">{doc.name}</span>
                        <span className="file-size">
                          ({(doc.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc)}
                          className="remove-document-btn"
                          title="Remove file"
                        >
                          <FaTimes />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowWarning(false);
                  navigate("/dashboard");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Event..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}