// src/pages/AddEventForm.jsx
import "../App.css";
import "./AddEventForm.css";
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaClock, FaUsers, FaTrash, FaUpload, FaSearch, FaTimes, FaFileAlt } from "react-icons/fa";

export default function AddEventForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
  });
  const vendorCategories = ["Catering", "Flowers", "Venue", "Photography", "Music", "Decor"];

  const [allVendors, setAllVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [requestStatus, setRequestStatus] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    let result = [...allVendors];
    if (selectedCategory !== "All") {
      result = result.filter((vendor) => vendor.category === selectedCategory);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (vendor) =>
          vendor.name_of_business.toLowerCase().includes(term) ||
          (vendor.category && vendor.category.toLowerCase().includes(term))
      );
    }
    setFilteredVendors(result);
  }, [searchTerm, selectedCategory, allVendors]);

  const handleAddVendor = async (vendor) => {
    if (selectedVendors.some((v) => v.id === vendor.id)) return;
    try {
      setRequestStatus((prev) => ({ ...prev, [vendor.id]: "sending" }));
      const vendorRef = doc(db, "vendors", vendor.id);
      const requestData = {
        eventId: Date.now().toString(),
        eventName: formData.name,
        eventDate: formData.date,
        eventTime: formData.time,
        status: "pending",
        requestedAt: new Date().toISOString(),
        plannerId: auth.currentUser.uid,
      };
      await updateDoc(vendorRef, { requests: arrayUnion(requestData) });
      setSelectedVendors([...selectedVendors, { ...vendor, requestStatus: "pending" }]);
      setRequestStatus((prev) => ({ ...prev, [vendor.id]: "sent" }));
    } catch (error) {
      console.error("Error sending vendor request:", error);
      setRequestStatus((prev) => ({ ...prev, [vendor.id]: "error" }));
    }
  };

  const handleRemoveVendor = (vendorId) => {
    setSelectedVendors(selectedVendors.filter((v) => v.id !== vendorId));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const allowedFiles = newFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File is too large: ${file.name}. Maximum size is 10 MB.`);
        return false;
      }
      return true;
    });
    setDocuments((prevDocs) => [...prevDocs, ...allowedFiles]);
  };

  const handleRemoveDocument = (docToRemove) => {
    setDocuments(documents.filter((doc) => doc.name !== docToRemove.name));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.date) {
      alert("Please fill in at least the event name and date.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create an event.");
      return;
    }
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      alert("Please select a date that is still to come.");
      return;
    }
    setIsSubmitting(true);

    try {
      // Upload documents to Cloudinary
      const documentURLs = await Promise.all(
        documents.map(async (docFile) => {
          const formDataForUpload = new FormData();
          formDataForUpload.append("file", docFile);

          // 🔹 Make sure your preset exists in Cloudinary dashboard
          formDataForUpload.append("upload_preset", "event_uploads");

          // Organize into folders per planner/event
          const safeEventName = formData.name.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
          const folderPath = `planners/${user.uid}/${safeEventName}`;
          formDataForUpload.append("folder", folderPath);

          const response = await fetch(
            "https://api.cloudinary.com/v1_1/db4slx3ga/auto/upload",
            {
              method: "POST",
              body: formDataForUpload,
            }
          );

          const data = await response.json();
          if (!response.ok) {
            console.error("Cloudinary error:", data);
            throw new Error(data.error?.message || "Cloudinary upload failed");
          }

          return { name: docFile.name, url: data.secure_url };
        })
      );

      // Save event to backend
      const response = await fetch("http://localhost:5000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          planner_id: auth.currentUser.uid,
          vendors_id: selectedVendors.map((v) => v.id),
          documents: documentURLs,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      alert("Event created successfully!");
      navigate("/planner-dashboard");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="profile-container">
      <h1>Create a New <span className="accent-text">Event</span></h1>
      <p>Fill in the details below to add a new event to your dashboard.</p>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <i className="form-icon fas fa-calendar-check"></i>
          <input type="text" name="name" className={`form-input ${formData.name ? "has-value" : ""}`} value={formData.name} onChange={handleChange} required />
          <label className="form-label">Event Name</label>
        </div>
        <div className="form-group">
          <FaCalendarAlt className="form-icon" />
          <input type="date" name="date" className={`form-input ${formData.date ? "has-value" : ""}`} value={formData.date} min={new Date().toISOString().split("T")[0]} onChange={handleChange} required />
          <label className="form-label">Event Date</label>
        </div>
        <div className="form-group">
          <FaClock className="form-icon" />
          <input type="time" name="time" className={`form-input ${formData.time ? "has-value" : ""}`} value={formData.time} onChange={handleChange} />
          <label className="form-label">Time</label>
        </div>

        {/* Vendors Section */}
        <div className="form-group-column optional-section">
          <div className="section-header">
            <h3><FaUsers /> Vendors <span className="optional-tag">Optional</span></h3>
            <p className="section-description">Search and add vendors from our directory</p>
          </div>
          <div className="vendor-search-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input type="text" placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              {searchTerm && (<button type="button" onClick={() => setSearchTerm("")} className="clear-search" aria-label="Clear search"><FaTimes /></button>)}
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="category-filter">
              <option value="All">All Categories</option>
              {vendorCategories.map((category, index) => (<option key={index} value={category}>{category}</option>))}
            </select>
          </div>
          {isLoading ? (
            <div className="loading">Loading vendors...</div>
          ) : filteredVendors.length > 0 ? (
            <div className="vendor-list">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="vendor-card">
                  <div className="vendor-info">
                    <h4>{vendor.name_of_business}</h4>
                    <span className="vendor-category">{vendor.category}</span>
                    {vendor.contact_number && (<div className="vendor-contact"><span>📞 {vendor.contact_number}</span></div>)}
                  </div>
                  <button type="button" onClick={() => handleAddVendor(vendor)} className="add-vendor-btn" disabled={selectedVendors.some((v) => v.id === vendor.id) || requestStatus[vendor.id] === "sending"}>
                    {requestStatus[vendor.id] === "sending" ? "Sending..." : selectedVendors.some((v) => v.id === vendor.id) ? "Request Sent" : "Request Vendor"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">No vendors found. Try adjusting your search.</div>
          )}
          {selectedVendors.length > 0 && (
            <div className="selected-vendors">
              <h4>Selected Vendors ({selectedVendors.length})</h4>
              <ul className="selected-vendors-list">
                {selectedVendors.map((vendor) => (
                  <li key={vendor.id} className="selected-vendor-item">
                    <div>
                      <span className="vendor-name">{vendor.name_of_business}</span>
                      <span className="vendor-category">{vendor.category}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveVendor(vendor.id)} className="remove-vendor-btn" aria-label={`Remove ${vendor.name_of_business}`}><FaTimes /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="form-group-column optional-section">
          <div className="section-header">
            <h3><FaFileAlt /> Documents <span className="optional-tag">Optional</span></h3>
            <p className="section-description">Upload contracts, quotes, or other important files</p>
          </div>
          <div className="file-upload-area">
            <input type="file" id="fileUpload" multiple onChange={handleFileChange} style={{ display: "none" }} />
            <label htmlFor="fileUpload" className="file-upload-label">
              <div className="upload-icon"><FaUpload size={24} /></div>
              <div className="upload-text">
                <p className="upload-title">Upload files</p>
                <p className="upload-subtitle">Drag & drop files here or click to browse</p>
                <p className="upload-hint">PDF, DOCX, JPG, PNG up to 10MB</p>
              </div>
            </label>
          </div>
          {documents.length > 0 && (
            <div className="documents-list">
              <h4>Selected Files:</h4>
              <ul className="item-list">
                {documents.map((doc, index) => (
                  <li key={index} className="document-item">
                    <FaFileAlt className="file-icon" />
                    <span className="file-name" title={doc.name}>
                      {doc.name.length > 30 ? `${doc.name.substring(0, 27)}...` : doc.name}
                    </span>
                    <span className="file-size">{(doc.size / 1024).toFixed(1)} KB</span>
                    <button type="button" onClick={() => handleRemoveDocument(doc)} className="remove-item-btn" aria-label={`Remove ${doc.name}`}><FaTrash /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Creating Event..." : "Save Event"}
        </button>
      </form>
    </main>
  );
}
