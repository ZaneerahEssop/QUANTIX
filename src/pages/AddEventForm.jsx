// src/pages/AddEventForm.jsx
import "../App.css";
import "./AddEventForm.css";
import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaTrash,
  FaUpload,
  FaSearch,
  FaTimes,
  FaFileAlt,
} from "react-icons/fa";

export default function AddEventForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
  });
  // Vendor categories - must match VendorForm options
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
  const [documents, setDocuments] = useState([]); // To hold file objects
  const [requestStatus, setRequestStatus] = useState({}); // Track request status for each vendor

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch vendors from Firestore
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

  // Filter vendors based on search term and category
  useEffect(() => {
    let result = [...allVendors];

    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter((vendor) => vendor.category === selectedCategory);
    }

    // Filter by search term
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

      // Create a vendor request in the vendor's document
      const vendorRef = doc(db, "vendors", vendor.id);
      const requestData = {
        eventId: Date.now().toString(), // Temporary ID until event is created
        eventName: formData.name,
        eventDate: formData.date,
        eventTime: formData.time,
        status: "pending",
        requestedAt: new Date().toISOString(),
        plannerId: auth.currentUser.uid,
      };

      await updateDoc(vendorRef, {
        requests: arrayUnion(requestData),
      });

      // Add to selected vendors
      setSelectedVendors([
        ...selectedVendors,
        { ...vendor, requestStatus: "pending" },
      ]);
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
    // You might want to add validation here (file size, type, etc.)
    setDocuments((prevDocs) => [...prevDocs, ...newFiles]);
  };

  const handleRemoveDocument = (docToRemove) => {
    setDocuments(documents.filter((doc) => doc.name !== docToRemove.name));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create an event.");
      return;
    }
    if (!formData.name || !formData.date) {
      alert("Please fill in at least the event name and date.");
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part to compare dates only

    if (selectedDate < today) {
      alert("Please select a date that is still to come.");
      return;
    }
    setIsSubmitting(true);

    try {
      // 1. Upload documents to Firebase Storage and get their URLs
      const documentURLs = await Promise.all(
        documents.map(async (docFile) => {
          const fileRef = ref(
            storage,
            `events/${user.uid}/${Date.now()}_${docFile.name}`
          );
          await uploadBytes(fileRef, docFile);
          const downloadURL = await getDownloadURL(fileRef);
          return { name: docFile.name, url: downloadURL };
        })
      );

      // 2. Prepare the event data to save in Firestore
      const newEventRef = doc(collection(db, `planners/${user.uid}/events`));
      const eventData = {
        ...formData,
        vendors: selectedVendors.map((vendor) => ({
          id: vendor.id,
          name: vendor.name_of_business,
          category: vendor.category,
          contact: vendor.contact_number || "",
        })),
        documents: documentURLs, // Save the array of document objects
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      // 3. Save the event data to Firestore
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
      navigate("/planner-dashboard"); // Redirect after successful creation
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="profile-container">
      <h1>
        Create a New <span className="accent-text">Event</span>
      </h1>
      <p>Fill in the details below to add a new event to your dashboard.</p>

      <form className="profile-form" onSubmit={handleSubmit}>
        {/* Event Name */}
        <div className="form-group">
          <i className="form-icon fas fa-calendar-check"></i>
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

        {/* Date */}
        <div className="form-group">
          <FaCalendarAlt className="form-icon" />
          <input
            type="date"
            name="date"
            className={`form-input ${formData.date ? "has-value" : ""}`}
            value={formData.date}
            min={new Date().toISOString().split("T")[0]} // Set min to today's date
            onChange={(e) => {
              const selectedDate = new Date(e.target.value);
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              if (selectedDate < today) {
                alert("Please select a date that is still to come.");
                e.target.value = ""; // Clear the invalid date
                setFormData((prev) => ({ ...prev, date: "" }));
                return;
              }
              handleChange(e);
            }}
            required
          />
          <label className="form-label">Event Date</label>
        </div>

        {/* Time */}
        <div className="form-group">
          <FaClock className="form-icon" />
          <input
            type="time"
            name="time"
            className={`form-input ${formData.time ? "has-value" : ""}`}
            value={formData.time}
            onChange={handleChange}
          />
          <label className="form-label">Time</label>
        </div>

        {/* Vendors Section */}
        <div className="form-group-column optional-section">
          <div className="section-header">
            <h3>
              <FaUsers /> Vendors <span className="optional-tag">Optional</span>
            </h3>
            <p className="section-description">
              Search and add vendors from our directory
            </p>
          </div>

          {/* Search and Filter */}
          <div className="vendor-search-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
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
              {vendorCategories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor List */}
          {isLoading ? (
            <div className="loading">Loading vendors...</div>
          ) : filteredVendors.length > 0 ? (
            <div className="vendor-list">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="vendor-card">
                  <div className="vendor-info">
                    <h4>{vendor.name_of_business}</h4>
                    <span className="vendor-category">{vendor.category}</span>
                    {vendor.contact_number && (
                      <div className="vendor-contact">
                        <span>📞 {vendor.contact_number}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddVendor(vendor)}
                    className="add-vendor-btn"
                    disabled={
                      selectedVendors.some((v) => v.id === vendor.id) ||
                      requestStatus[vendor.id] === "sending"
                    }
                  >
                    {requestStatus[vendor.id] === "sending"
                      ? "Sending..."
                      : selectedVendors.some((v) => v.id === vendor.id)
                      ? "Request Sent"
                      : "Request Vendor"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              No vendors found. Try adjusting your search.
            </div>
          )}

          {/* Selected Vendors */}
          {selectedVendors.length > 0 && (
            <div className="selected-vendors">
              <h4>Selected Vendors ({selectedVendors.length})</h4>
              <ul className="selected-vendors-list">
                {selectedVendors.map((vendor) => (
                  <li key={vendor.id} className="selected-vendor-item">
                    <div>
                      <span className="vendor-name">
                        {vendor.name_of_business}
                      </span>
                      <span className="vendor-category">{vendor.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVendor(vendor.id)}
                      className="remove-vendor-btn"
                      aria-label={`Remove ${vendor.name_of_business}`}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Optional: Documents Section */}
        <div className="form-group-column optional-section">
          <div className="section-header">
            <h3>
              <FaFileAlt /> Documents{" "}
              <span className="optional-tag">Optional</span>
            </h3>
            <p className="section-description">
              Upload contracts, quotes, or other important files
            </p>
          </div>

          <div className="file-upload-area">
            <input
              type="file"
              id="fileUpload"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <label htmlFor="fileUpload" className="file-upload-label">
              <div className="upload-icon">
                <FaUpload size={24} />
              </div>
              <div className="upload-text">
                <p className="upload-title">Upload files</p>
                <p className="upload-subtitle">
                  Drag & drop files here or click to browse
                </p>
                <p className="upload-hint">PDF, JPG, PNG up to 10MB</p>
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
                      {doc.name.length > 30
                        ? `${doc.name.substring(0, 27)}...`
                        : doc.name}
                    </span>
                    <span className="file-size">
                      {(doc.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(doc)}
                      className="remove-item-btn"
                      aria-label={`Remove ${doc.name}`}
                    >
                      <FaTrash />
                    </button>
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
