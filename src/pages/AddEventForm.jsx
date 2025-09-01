import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import axios from "axios";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import {
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaFileAlt,
  FaRegCalendarCheck,
  FaArrowLeft,
  FaSearch,
  FaTimes,
  FaFileUpload,
  FaFilePdf,
  FaFileWord,
  FaFileImage,
} from "react-icons/fa";

// Import CSS for consistent styling with other forms
import "./ProfileForm.css";
import "./AddEventForm.css";

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
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendorsRef = collection(db, "vendors");
        const q = query(vendorsRef, orderBy("name_of_business"));
        const querySnapshot = await getDocs(q);
        const vendorsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllVendors(vendorsData);
        setFilteredVendors(vendorsData);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    let result = [...allVendors];

    // Category filtering
    if (selectedCategory !== "All") {
      result = result.filter((vendor) => {
        // Handle both array and string data types for category
        if (Array.isArray(vendor.category)) {
          return vendor.category.includes(selectedCategory);
        }
        if (typeof vendor.category === "string") {
          return vendor.category === selectedCategory;
        }
        return false;
      });
    }

    // Search term filtering
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((vendor) => {
        const nameMatch = vendor.name_of_business.toLowerCase().includes(term);
        let categoryMatch = false;

        // Handle both array and string data types for category search
        if (Array.isArray(vendor.category)) {
          categoryMatch = vendor.category.some((c) =>
            c.toLowerCase().includes(term)
          );
        }
        if (typeof vendor.category === "string") {
          categoryMatch = vendor.category.toLowerCase().includes(term);
        }

        return nameMatch || categoryMatch;
      });
    }

    setFilteredVendors(result);
  }, [searchTerm, selectedCategory, allVendors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddVendor = (vendor) => {
    if (!selectedVendors.some((v) => v.id === vendor.id)) {
      setSelectedVendors([...selectedVendors, vendor]);
    }
  };

  const handleRemoveVendor = (vendorId) => {
    setSelectedVendors(selectedVendors.filter((v) => v.id !== vendorId));
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    if (["pdf"].includes(extension)) return <FaFilePdf />;
    if (["doc", "docx"].includes(extension)) return <FaFileWord />;
    if (["png", "jpg", "jpeg", "gif"].includes(extension))
      return <FaFileImage />;
    return <FaFileAlt />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic form validation
    if (!formData.name || !formData.date || !formData.time) {
      alert("Please fill in the Event Name, Date, and Time.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create an event.");
      return;
    }

    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    if (selectedDateTime < new Date()) {
      alert("Please select a date and time that is in the future.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload files to Cloudinary
      const uploadedURLs = [];
      if (documents && documents.length > 0) {
        for (const file of documents) {
          const data = new FormData();
          data.append("file", file);
          data.append("upload_preset", "event_uploads"); // replace with your preset

          const cloudRes = await axios.post(
            "https://api.cloudinary.com/v1_1/db4slx3ga/upload",
            data
          );

          uploadedURLs.push(cloudRes.data.secure_url);
        }
      }

      // Prepare event data
      const eventData = {
        name: formData.name,
        date: formData.date,
        time: formData.time,
        planner_id: user.uid, // send planner_id for backend to know where to save
        vendors_id: selectedVendors.map((v) => v.id),
        documents: uploadedURLs,
      };

      // Send to your API
      const token = await user.getIdToken();
      const response = await axios.post(
        "http://localhost:5000/api/events",
        eventData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201) {
        alert("Event created successfully via API!");
        navigate("/planner-dashboard");
      } else {
        alert("Failed to create event via API.");
      }
    } catch (error) {
      console.error("API Error creating event:", error);
      alert("Error creating event. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="profile-container">
      <div style={{ textAlign: "left", marginBottom: "1rem" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--peach)",
            cursor: "pointer",
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <FaArrowLeft /> Back
        </button>
      </div>
      <h1>
        Create a New <span className="accent-text">Event</span>
      </h1>
      <p>Fill in the details for your new event and assign vendors.</p>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <i className="form-icon">
            <FaRegCalendarCheck />
          </i>
          <input
            type="text"
            name="name"
            className={`form-input ${formData.name ? "has-value" : ""}`}
            value={formData.name}
            onChange={handleChange}
            required
          />
          <label className="form-label">Event Name</label>
        </div>

        <div className="form-group">
          <i className="form-icon">
            <FaCalendarAlt />
          </i>
          <input
            type="date"
            name="date"
            className={`form-input ${formData.date ? "has-value" : ""}`}
            value={formData.date}
            min={new Date().toISOString().split("T")[0]}
            onChange={handleChange}
            required
          />
          <label className="form-label">Event Date</label>
        </div>

        <div className="form-group">
          <i className="form-icon">
            <FaClock />
          </i>
          <input
            type="time"
            name="time"
            className={`form-input ${formData.time ? "has-value" : ""}`}
            value={formData.time}
            onChange={handleChange}
            required
          />
          <label className="form-label">Event Time</label>
        </div>

        <div className="optional-section">
          <h3>
            <FaUsers /> Assign Vendors
          </h3>
          <div className="vendor-search-container">
            <div className="search-box">
              <i
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#999",
                }}
              >
                <FaSearch />
              </i>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {vendorCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {selectedVendors.length > 0 && (
            <div className="selected-vendors">
              <h4>Requested Vendors:</h4>
              <ul>
                {selectedVendors.map((v) => (
                  <li key={v.id}>
                    {v.name_of_business}
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => handleRemoveVendor(v.id)}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="vendor-list">
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <div key={vendor.id} className="vendor-card">
                  <div className="vendor-info">
                    <h4>{vendor.name_of_business}</h4>
                    <span className="vendor-category">
                      {Array.isArray(vendor.category)
                        ? vendor.category.join(", ")
                        : vendor.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-request-vendor"
                    onClick={() => handleAddVendor(vendor)}
                    disabled={selectedVendors.some((v) => v.id === vendor.id)}
                  >
                    {selectedVendors.some((v) => v.id === vendor.id)
                      ? "Requested"
                      : "Request Vendor"}
                  </button>
                </div>
              ))
            ) : (
              <div className="no-results">No vendors found.</div>
            )}
          </div>
        </div>

        <div className="optional-section">
          <h3>
            <FaFileAlt /> Upload Documents
          </h3>
          <div className="file-upload-area">
            <input
              type="file"
              id="file_upload"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <label htmlFor="file_upload" className="file-upload-label">
              <FaFileUpload className="upload-icon" />
              <span className="upload-title">Click to upload files</span>
              <span className="upload-subtitle">
                PDF, DOCX, PNG, JPG up to 10MB
              </span>
            </label>
          </div>
          {documents.length > 0 && (
            <div className="documents-list">
              <h4>Uploaded Files:</h4>
              <ul>
                {documents.map((doc, idx) => (
                  <li key={idx} className="document-item">
                    <span className="file-icon">{getFileIcon(doc.name)}</span>
                    <span className="file-name">{doc.name}</span>
                    <span className="file-size">
                      {formatFileSize(doc.size)}
                    </span>
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => handleRemoveDocument(doc)}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Saving Event..." : "Save Event"}
        </button>
      </form>
    </main>
  );
}
