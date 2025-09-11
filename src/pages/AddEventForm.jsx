import "../AddEventForm.css";
import React, { useState, useEffect } from "react";
import { supabase } from "../client";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaUpload,
  FaSearch,
  FaTimes,
  FaFileAlt,
  FaPlus,
  FaArrowLeft,
} from "react-icons/fa";

export default function AddEventForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", date: "", time: "" });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Add/remove has-value class for floating labels
    if (value) {
      e.target.classList.add("has-value");
    } else {
      e.target.classList.remove("has-value");
    }
  };

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select(
            "vendor_id, business_name, service_type, contact_number, description"
          )
          .order("business_name", { ascending: true });

        if (error) throw error;

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
    setSelectedVendors([...selectedVendors, vendor]);
  };

  const handleRemoveVendor = (vendorId) => {
    setSelectedVendors(selectedVendors.filter((v) => v.vendor_id !== vendorId));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const allowedFiles = newFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File is too large: ${file.name}. Maximum size is 10 MB.`);
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

    // Basic validation
    if (!formData.name || !formData.date) {
      return alert("Please fill in at least the event name and date.");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return alert("You must be logged in to create an event.");

    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) return alert("Please select a future date.");

    setIsSubmitting(true);

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

          return { name: docFile.name, url: publicUrl };
        })
      );

      // 2️⃣ Create payload for backend
      const payload = {
        name: formData.name,
        theme: formData.theme || null,
        start_time: formData.time
          ? `${formData.date}T${formData.time}`
          : `${formData.date}T00:00:00`,
        end_time: formData.end_time || null,
        venue: formData.venue || null,
        selectedVendors, // array of vendor objects with vendor_id
        documents: uploadedDocuments.map((doc) => ({
          ...doc,
          uploaded_by: user.id,
        })),
        planner_id: user.id,
      };

      // 3️⃣ POST to backend API
      const response = await fetch("http://localhost:5000/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(result);
        throw new Error(result.error || "Failed to create event");
      }

      alert("Event created successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

        {/* Vendors Section */}
        <div className="optional-section">
          <h3>
            <FaUsers /> Vendors <span className="optional-tag">Optional</span>
          </h3>
          <p className="section-description">
            Add vendors to your event to keep everything organized in one place
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
                      <p className="vendor-contact">{vendor.contact_number}</p>
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
            Upload contracts, invoices, or other important files related to your
            event
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
            onClick={() => navigate("/dashboard")}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="submit-btn">
            {isSubmitting ? "Creating Event..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
