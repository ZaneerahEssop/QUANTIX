import React from "react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../client";
import {
  FaArrowLeft,
  FaArrowDown,
  FaArrowUp,
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
import "../AddEventForm.css"; // Ensure this path is correct

export default function AddEventForm() {
  const navigate = useNavigate();

  // Function to handle vendor profile button click
  const handleViewProfileClick = (vendorId) => {
    // Navigate to the vendor's profile page, likely read-only
    navigate(`/vendors/${vendorId}/services?readonly=true`);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Load saved form data from localStorage on component mount
  const loadFormData = () => {
    const savedData = localStorage.getItem('eventFormData');
    return savedData ? JSON.parse(savedData) : {
      name: "",
      date: "",
      time: "",
      theme: { name: "", colors: [], notes: "" },
      venue: "",
      end_time: "",
    };
  };

  const [formData, setFormData] = useState(loadFormData());
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

  // MODIFICATION: selectedVendors now stores { vendor, service }
  const [selectedVendors, setSelectedVendors] = useState(() => {
    const savedVendors = localStorage.getItem('selectedVendors');
    return savedVendors ? JSON.parse(savedVendors) : [];
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [showAllVendors, setShowAllVendors] = useState(false);
  const VENDORS_PER_PAGE = 6;
  const [isSearching, setIsSearching] = useState(false);
  const [documents, setDocuments] = useState(() => {
    const savedDocs = localStorage.getItem('eventDocuments');
    return savedDocs ? JSON.parse(savedDocs) : [];
  });
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

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('eventFormData', JSON.stringify(formData));
  }, [formData]);

  // Save selected vendors to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('selectedVendors', JSON.stringify(selectedVendors));
  }, [selectedVendors]);

  // Save documents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('eventDocuments', JSON.stringify(documents));
  }, [documents]);

  // Clear saved form data when component unmounts (optional, uncomment if needed)
  // useEffect(() => {
  //   return () => {
  //     localStorage.removeItem('eventFormData');
  //     localStorage.removeItem('selectedVendors');
  //     localStorage.removeItem('eventDocuments');
  //   };
  // }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If manually changing the venue field, disable the venue vendor selection
    if (name === "venue" && usingVenueVendor) {
      setUsingVenueVendor(false);
      setSelectedVenueVendor(null);
    }

    if (name === "theme") {
      setFormData((prev) => {
        const newData = {
          ...prev,
          theme: {
            ...prev.theme,
            name: value,
          },
        };
        return newData;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

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
    const fetchVendors = async () => {
      setIsLoading(true);
      setSearchError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session. Please log in.");
        }
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
        setAllVendors(data);
        setFilteredVendors(data);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        setSearchError("Failed to load vendors. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendors();
  }, []);

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
        if (selectedCategory !== "All") {
          result = result.filter(
            (v) =>
              v.service_type &&
              v.service_type
                .toLowerCase()
                .split(",")
                .map((s) => s.trim())
                .includes(selectedCategory.toLowerCase())
          );
        }
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

  // MODIFICATION: handleSelectVendor now accepts 'service'
  const handleSelectVendor = (vendor, service) => {
    if (
      selectedVendors.some(
        (v) => v.vendor.vendor_id === vendor.vendor_id && v.service === service
      )
    ) {
      return; // Already selected
    }

    setSelectedVendors((prev) => [
      ...prev,
      {
        vendor: vendor,
        service: service,
        request_status: "selected",
      },
    ]);

    if (service.toLowerCase() === "venue") {
      setUsingVenueVendor(true);
      setSelectedVenueVendor(vendor);
      const firstVenueName = vendor.venue_names?.[0] || vendor.business_name;
      setFormData((prev) => ({ ...prev, venue: firstVenueName }));
      setSelectedVenueIndex(0);
    }
  };

  // MODIFICATION: handleRemoveVendor now accepts 'service'
  const handleRemoveVendor = (vendorToRemove, serviceToRemove) => {
    const vendorName = vendorToRemove.business_name || "Vendor";

    try {
      setSelectedVendors((prev) =>
        prev.filter(
          (v) =>
            !(
              v.vendor.vendor_id === vendorToRemove.vendor_id &&
              v.service === serviceToRemove
            )
        )
      );

      if (
        usingVenueVendor &&
        selectedVenueVendor?.vendor_id === vendorToRemove.vendor_id &&
        serviceToRemove.toLowerCase() === "venue"
      ) {
        setUsingVenueVendor(false);
        setSelectedVenueVendor(null);
        setFormData((prev) => ({ ...prev, venue: "" }));
      }

      setSuccessMessage(
        `${vendorName} (${serviceToRemove}) removed from selection.`
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (error) {
      console.error("Error removing vendor:", error);
      setWarningMessage(
        `Failed to remove ${vendorName} (${serviceToRemove}). Please try again.`
      );
      setShowWarning(true);
    }
  };

  // MODIFICATION: handleSubmit sends the new selectedVendors structure
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowWarning(false);
    setShowSuccess(false);

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
      const API_URL = process.env.REACT_APP_API_URL;

      const formattedDocs = documents.map((docFile) => ({
        name: docFile.name,
        // Assuming backend handles upload based on file object, not URL yet
        // url: docFile.url || '',
        uploaded_by: user.id,
        // Include file object itself if backend expects it for upload
        // file: docFile
      }));

      const vendorRequestsToSend = selectedVendors.map((selection) => ({
        vendor_id: selection.vendor.vendor_id,
        service_requested: selection.service,
      }));

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
        selectedVendors: vendorRequestsToSend,
        // Handle documents based on backend expectations.
        // If backend expects metadata first:
        documents: formattedDocs,
        // If backend expects files in FormData, adjust fetch call.
      };

      // *** NOTE: If backend needs actual file uploads, use FormData ***
      // const formDataPayload = new FormData();
      // formDataPayload.append('eventData', JSON.stringify(requestBody)); // Send metadata
      // documents.forEach((file, index) => {
      //   formDataPayload.append(`documents[${index}]`, file, file.name); // Send files
      // });
      // const response = await fetch(`${API_URL}/api/events`, {
      //   method: 'POST',
      //   headers: {
      //     // 'Content-Type': 'multipart/form-data', // Browser sets this automatically with FormData
      //     Authorization: `Bearer ${user.id}`, // Or access token
      //   },
      //   body: formDataPayload,
      // });

      // Using JSON body as before (assuming backend handles uploads separately or expects metadata)
      const response = await fetch(`${API_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`, // Or access token
        },
        body: JSON.stringify(requestBody),
      });


      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      // Success
      setSuccessMessage(
        `Event "${formData.name}" created successfully${
          selectedVendors.length > 0
            ? ` and ${selectedVendors.length} vendor request(s) sent!`
            : "!"
        }`
      );
      setShowSuccess(true);
      // Optional: Clear form or navigate
      // setSelectedVendors([]);
      // setDocuments([]);
      // setFormData({ name: '', date: '', time: '', theme: { name: '', colors: [], notes: '' }, venue: '', end_time: ''});
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

  // Click outside handler for venue dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVenueDropdown && !event.target.closest(".form-group")) {
        setShowVenueDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVenueDropdown]);

  return (
    <>
      {/* Success and Warning Modals */}
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
                className={`form-input ${formData.name ? "has-value" : ""}`}
                required
              />
              <label className="form-label">Event Name</label>
            </div>

            {/* Event Date and Time */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div className="form-group" style={{ flex: 1, minWidth: "150px" }}>
                <FaCalendarAlt className="form-icon" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={handleChange}
                  className={`form-input ${formData.date ? "has-value" : ""}`}
                  required
                  style={{ paddingTop: '14px' }} // Adjust padding if label overlaps
                />
                <label className="form-label">Date</label>
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: "150px" }}>
                <FaClock className="form-icon" />
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className={`form-input ${formData.time ? "has-value" : ""}`}
                  style={{ paddingTop: '14px' }} // Adjust padding if label overlaps
                />
                <label className="form-label">Time (Optional)</label>
              </div>
            </div>

            {/* Theme and Venue */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div className="form-group" style={{ flex: 1, minWidth: "150px" }}>
                <input
                  type="text"
                  name="theme"
                  value={formData.theme.name}
                  onChange={handleChange}
                  className={`form-input ${formData.theme.name ? "has-value" : ""}`}
                />
                <label className="form-label">Theme (Optional)</label>
              </div>

              <div
                className="form-group"
                style={{ flex: 1, position: "relative", minWidth: "150px" }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    className={`form-input ${formData.venue ? "has-value" : ""}`}
                    disabled={usingVenueVendor}
                    onFocus={() =>
                      usingVenueVendor && setShowVenueDropdown(true)
                    }
                    style={
                      usingVenueVendor
                        ? {
                            backgroundColor: "#f5f5f5",
                            cursor: "pointer",
                            paddingRight: "60px", // Increased padding for buttons
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
                            right: "40px", // Adjusted position
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none", border: "none", color: "#666",
                            cursor: "pointer", fontSize: "0.8rem", padding: "2px 5px",
                            borderRadius: "4px", transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => e.target.style.background = "rgba(0,0,0,0.05)"}
                          onMouseOut={(e) => e.target.style.background = "transparent"}
                          title="Select a different venue"
                        >
                          {showVenueDropdown ? <FaArrowUp /> : <FaArrowDown />}
                        </button>
                        {showVenueDropdown && (
                          <div
                            style={{
                              position: "absolute", top: "100%", left: 0, right: 0,
                              backgroundColor: "white", border: "1px solid #ddd",
                              borderRadius: "4px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                              zIndex: 1000, maxHeight: "200px", overflowY: "auto", marginTop: "4px",
                            }}
                          >
                            {selectedVenueVendor.venue_names.map( (venue, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, venue, }));
                                    setSelectedVenueIndex(idx);
                                    setShowVenueDropdown(false);
                                  }}
                                  style={{ padding: "8px 12px", cursor: "pointer",
                                    backgroundColor: idx === selectedVenueIndex ? "#f0f0f0" : "transparent",
                                    hover: { backgroundColor: "#f5f5f5", },
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
                        setSelectedVenueVendor(null);
                        setFormData((prev) => ({ ...prev, venue: "" }));
                        setShowVenueDropdown(false);
                      }}
                      style={{
                        position: "absolute", right: "10px", top: "50%",
                        transform: "translateY(-50%)", background: "none", border: "none",
                        color: "#666", cursor: "pointer", fontSize: "1rem", padding: "5px",
                        borderRadius: "50%", display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => e.target.style.background = "rgba(0,0,0,0.05)"}
                      onMouseOut={(e) => e.target.style.background = "transparent"}
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
                className={`form-input ${formData.end_time ? "has-value" : ""}`}
                style={{ paddingTop: '14px' }} // Adjust padding if label overlaps
              />
              <label className="form-label">End Time (Optional)</label>
            </div>

            {/* Vendors Section */}
            <div className="optional-section">
              <h3>
                <FaUsers /> Vendors <span className="optional-tag">Optional</span>
              </h3>
              <p className="section-description">
                Add vendors to your event to keep everything organized
              </p>

              <div className="vendor-search-container">
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search vendors by name or service"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="search-input"
                    disabled={isLoading}
                  />
                  {(isSearching || isLoading) && (
                    <div className="search-loading" style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)'}}>
                      <div className="spinner"></div> {/* Add CSS for spinner */}
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

              {searchError && <div className="search-error">{searchError}</div>}

              {isLoading ? (
                <div className="loading">Loading vendors...</div>
              ) : isSearching ? (
                 <div className="loading">Searching vendors...</div>
              ) : filteredVendors.length === 0 ? (
                <div className="no-results">
                  No vendors found matching your criteria.
                </div>
              ) : (
                <div className="vendor-grid">
                  {filteredVendors
                    .slice(
                      0,
                      showAllVendors ? filteredVendors.length : VENDORS_PER_PAGE
                    )
                    .map((vendor) => {
                      const services =
                        vendor.service_type
                          ?.split(",")
                          .map((s) => s.trim())
                          .filter(Boolean) || [];

                      return (
                        <div key={vendor.vendor_id} className="vendor-card">
                          <div className="vendor-info">
                            <h4>{vendor.business_name}</h4>
                            <div className="vendor-categories-list">
                              {services.map((service) => (
                                <span
                                  key={service}
                                  className="vendor-category-tag"
                                >
                                  {service}
                                </span>
                              ))}
                            </div>
                            <div className="vendor-description">
                              {vendor.description || "No description available."}
                            </div>
                          </div>
                          <div className="vendor-actions">
                            <button
                              type="button"
                              className="view-profile-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProfileClick(vendor.vendor_id);
                              }}
                            >
                              View Profile
                            </button>
                            <div className="vendor-service-buttons">
                              {services.map((service) => {
                                const key = `${vendor.vendor_id}-${service}`;
                                const isSelected = selectedVendors.some(
                                  (s) =>
                                    s.vendor.vendor_id === vendor.vendor_id &&
                                    s.service === service
                                );

                                return (
                                  <div
                                    key={key}
                                    className="vendor-service-action"
                                  >
                                    {isSelected ? (
                                      <>
                                        <button
                                          disabled
                                          className="add-vendor-btn added selected"
                                        >
                                          <FaCheck /> Selected as {service}
                                        </button>
                                        <button
                                          type="button"
                                          className="undo-request-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveVendor(vendor, service);
                                          }}
                                        >
                                          <FaTimes />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        className="add-vendor-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectVendor(vendor, service);
                                        }}
                                      >
                                        <FaPlus /> Select as {service}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
               {/* View All / Show Less buttons */}
                 {!showAllVendors && filteredVendors.length > VENDORS_PER_PAGE && (
                    <div style={{ width: "100%", textAlign: "center", marginTop: "1rem" }}>
                      <button type="button" className="view-all-btn" onClick={() => setShowAllVendors(true)} style={{ /* button styles */ }}>
                         View All {filteredVendors.length} Vendors <FaArrowDown style={{ fontSize: "0.8rem" }} />
                      </button>
                    </div>
                  )}
                 {showAllVendors && filteredVendors.length > VENDORS_PER_PAGE && (
                    <div style={{ width: "100%", textAlign: "center", marginTop: "1rem" }}>
                      <button type="button" className="view-less-btn" onClick={() => setShowAllVendors(false)} style={{ /* button styles */ }}>
                         Show Less <FaArrowUp style={{ fontSize: "0.8rem" }} />
                      </button>
                    </div>
                  )}


              {/* Updated selected vendors list display */}
              {selectedVendors.length > 0 && (
                <div className="selected-vendors">
                  <h3 className="selected-title">Selected Vendors</h3>
                  <ul className="selected-vendors-list">
                    {selectedVendors.map((selection, index) => (
                      <li
                        key={`${selection.vendor.vendor_id}-${index}`} // Use index for unique key if vendor+service isn't guaranteed unique temporarily
                        className="selected-vendor-item"
                      >
                        <div>
                          <span className="vendor-name">
                            {selection.vendor.business_name}
                          </span>
                          <span className="vendor-type">
                            Selected as: {selection.service}
                          </span>{" "}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveVendor(
                              selection.vendor,
                              selection.service
                            )
                          }
                          className="remove-vendor-btn"
                          title="Remove vendor selection"
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
                Upload contracts, invoices, or other important files
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
                    Maximum file size: 10MB per file (PDF , DOCX)
                  </p>
                </label>
              </div>

              {documents.length > 0 && (
                <div className="documents-list">
                  <h3 className="documents-title">Uploaded Files</h3>
                  <ul className="documents-container">
                    {documents.map((doc, idx) => (
                      <li key={idx} className="document-item">
                       <div className="file-info">
                        <FaFileAlt className="file-icon" />
                        <span className="file-name">{doc.name}</span>
                        <span className="file-size">
                          ({(doc.size / 1024).toFixed(1)} KB)
                        </span>
                       </div>
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
              <div className="button-group">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowWarning(false);
                    navigate("/dashboard");
                  }}
                  disabled={isSubmitting}
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
            </div>
          </form>
        </div>
      </div>
    </>
  );
}