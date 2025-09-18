import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
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
import { supabase } from "../client";

export default function AddEventForm() {
  const navigate = useNavigate();
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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [usingVenueVendor, setUsingVenueVendor] = useState(false);
  const [selectedVenueVendor, setSelectedVenueVendor] = useState(null);
  const [selectedVenueIndex, setSelectedVenueIndex] = useState(0);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);

  // New state for pop-up messages
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If manually changing the venue field, disable the venue vendor selection
    if (name === 'venue' && usingVenueVendor) {
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

  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/vendors`
        ); // your backend route
        if (!response.ok) throw new Error("Failed to fetch vendors");

        const data = await response.json();
        setAllVendors(data);
        setFilteredVendors(data);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  useEffect(() => {
    let result = [...allVendors];
    if (selectedCategory !== "All") {
      result = result.filter((v) => v.service_type === selectedCategory);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.business_name.toLowerCase().includes(term) ||
          (v.service_type && v.service_type.toLowerCase().includes(term))
      );
    }
    setFilteredVendors(result);
  }, [searchTerm, selectedCategory, allVendors]);

  const handleAddVendor = (vendor) => {
    if (selectedVendors.some((v) => v.vendor_id === vendor.vendor_id)) return;
    
    // Check if this is a venue vendor
    const isVenueVendor = vendor.service_type.toLowerCase().includes('venue');
    
    if (isVenueVendor) {
      // If we're already using a venue vendor, remove the old one first
      const otherVendors = selectedVendors.filter(v => !v.service_type.toLowerCase().includes('venue'));
      setSelectedVendors([...otherVendors, vendor]);
      
      // Set the venue field to the first venue name if available
      const venueNames = vendor.venue_names || [];
      const venueName = venueNames.length > 0 ? venueNames[0] : vendor.business_name;
      
      setFormData(prev => ({
        ...prev,
        venue: venueName
      }));
      
      setUsingVenueVendor(true);
      setSelectedVenueVendor(vendor);
      setSelectedVenueIndex(0);
      setShowVenueDropdown(false);
    } else {
      setSelectedVendors([...selectedVendors, vendor]);
    }
  };

  const handleRemoveVendor = (vendorId) => {
    const vendorToRemove = selectedVendors.find(v => v.vendor_id === vendorId);
    const isVenueVendor = vendorToRemove?.service_type?.toLowerCase().includes('venue');
    
    if (isVenueVendor && usingVenueVendor) {
      setUsingVenueVendor(false);
      setSelectedVenueVendor(null);
      // Clear the venue field if it matches the vendor's venue name
      if (formData.venue === (vendorToRemove.venue_names?.[0] || vendorToRemove.business_name)) {
        setFormData(prev => ({
          ...prev,
          venue: ''
        }));
      }
    }
    
    setSelectedVendors(selectedVendors.filter((v) => v.vendor_id !== vendorId));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const allowedFiles = newFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
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
      // 1️⃣ Upload documents to Supabase Storage
      const uploadedDocuments = await Promise.all(
        documents.map(async (docFile) => {
          const safeEventName = formData.name
            .replace(/\s+/g, "_")
            .replace(/[^\w-]/g, "");
          const filePath = `planners/${user.id}/${safeEventName}/${docFile.name}`;

          const { error: uploadError } = await supabase.storage
            .from("event-documents")
            .upload(filePath, docFile);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("event-documents").getPublicUrl(filePath);

          return {
            name: docFile.name,
            url: publicUrl,
            file_type: docFile.type || "application/octet-stream",
          };
        })
      );

      // 2️⃣ Create the event in the events table
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          name: formData.name,
          theme: formData.theme || null,
          start_time: formData.time
            ? `${formData.date}T${formData.time}`
            : `${formData.date}T00:00:00`,
          end_time: formData.end_time || null,
          venue: formData.venue || null,
          planner_id: user.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      setFormData((prev) => ({ ...prev, event_id: eventData.event_id }));

      // 3️⃣ Add vendors to event_vendors table if any are selected
      if (selectedVendors.length > 0) {
        for (const vendor of selectedVendors) {
          const response = await fetch(
            `${process.env.REACT_APP_API_URL}/api/vendor-requests`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event_id: eventData.event_id,
                vendor_id: vendor.vendor_id,
                message: `Request to join event ${formData.name}`,
                status: "pending",
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            console.error("Failed to send vendor request:", data.error);
            throw new Error(
              data.error ||
                `Failed to send request for vendor ${vendor.vendor_id}`
            );
          }
        }
      }
      // 4️⃣ Add documents to files table if any are uploaded
      if (uploadedDocuments.length > 0) {
        const fileRecords = uploadedDocuments.map((doc) => ({
          event_id: eventData.event_id,
          uploaded_by: user.id,
          file_name: doc.name,
          file_type: doc.file_type,
          file_url: doc.url,
        }));

        const { error: fileError } = await supabase
          .from("files")
          .insert(fileRecords);

        if (fileError) throw fileError;
      }

      setShowSuccess(true);
    } catch (error) {
      console.error("Error creating event:", error);
      setWarningMessage("Failed to create event. Please try again.");
      setShowWarning(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVenueDropdown && !event.target.closest('.form-group')) {
        setShowVenueDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
              Event created successfully!
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

            <div className="form-group" style={{ flex: 1, position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  className="form-input"
                  disabled={usingVenueVendor}
                  onFocus={() => usingVenueVendor && setShowVenueDropdown(true)}
                  style={usingVenueVendor ? { 
                    backgroundColor: '#f5f5f5',
                    cursor: 'pointer',
                    paddingRight: '35px'
                  } : {}}
                />
                <label className="form-label">
                  {usingVenueVendor ? 'Venue (Selected from Vendor)' : 'Venue (Optional)'}
                </label>
                {usingVenueVendor && selectedVenueVendor?.venue_names?.length > 1 && (
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowVenueDropdown(!showVenueDropdown)}
                      style={{
                        position: 'absolute',
                        right: '30px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => (e.target.style.background = 'rgba(0,0,0,0.05)')}
                      onMouseOut={(e) => (e.target.style.background = 'transparent')}
                      title="Select a different venue"
                    >
                      ▼
                    </button>
                    {showVenueDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}>
                        {selectedVenueVendor.venue_names.map((venue, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, venue }));
                              setSelectedVenueIndex(idx);
                              setShowVenueDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              backgroundColor: idx === selectedVenueIndex ? '#f0f0f0' : 'transparent',
                              ':hover': {
                                backgroundColor: '#f5f5f5'
                              }
                            }}
                          >
                            {venue}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {usingVenueVendor && (
                  <button
                    type="button"
                    onClick={() => {
                      setUsingVenueVendor(false);
                      setFormData(prev => ({ ...prev, venue: '' }));
                      setShowVenueDropdown(false);
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '5px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => (e.target.style.background = 'rgba(0,0,0,0.05)')}
                    onMouseOut={(e) => (e.target.style.background = 'transparent')}
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
              <FaUsers /> Vendors <span className="optional-tag">Optional</span>
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
                  placeholder="Search vendors by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="clear-search"
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

            {isLoading ? (
              <div className="loading">Loading vendors...</div>
            ) : filteredVendors.length === 0 ? (
              <div className="no-results">
                No vendors found. Try a different search term.
              </div>
            ) : (
              <div className="vendor-grid">
                {filteredVendors.map((vendor) => (
                  <div key={vendor.vendor_id} className="vendor-card">
                    <div className="vendor-info">
                      <h4>{vendor.business_name}</h4>
                      <span className="vendor-category">
                        {vendor.service_type}
                      </span>
                      {vendor.contact_number && (
                        <p className="vendor-contact">
                          {vendor.contact_number}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddVendor(vendor)}
                      className="add-vendor-btn"
                      disabled={selectedVendors.some(
                        (v) => v.vendor_id === vendor.vendor_id
                      )}
                    >
                      <FaPlus />
                      {selectedVendors.some(
                        (v) => v.vendor_id === vendor.vendor_id
                      )
                        ? "Added"
                        : "Add"}
                    </button>
                  </div>
                ))}
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
                        onClick={() => handleRemoveVendor(v.vendor_id)}
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
                <p className="upload-hint">Maximum file size: 10MB per file</p>
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
              onClick={() => {
                setShowWarning(false);
                navigate("/dashboard");
              }}
              className="cancel-btn"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-btn"
            >
              {isSubmitting ? "Creating Event..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
