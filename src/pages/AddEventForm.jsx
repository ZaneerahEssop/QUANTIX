// src/pages/AddEventForm.jsx
import "../App.css";
import "./AddEventForm.css";
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, doc, setDoc, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaClock, FaUsers, FaFileAlt } from "react-icons/fa";

export default function AddEventForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", date: "", time: "" });
  const vendorCategories = ["Catering", "Flowers", "Venue", "Photography", "Music", "Decor"];

  const [allVendors, setAllVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [documents, setDocuments] = useState([]);

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
        const vendorsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    if (selectedCategory !== "All") result = result.filter(v => v.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(v =>
        v.name_of_business.toLowerCase().includes(term) ||
        (v.category && v.category.toLowerCase().includes(term))
      );
    }
    setFilteredVendors(result);
  }, [searchTerm, selectedCategory, allVendors]);

  const handleAddVendor = (vendor) => {
    if (selectedVendors.some(v => v.id === vendor.id)) return;
    setSelectedVendors([...selectedVendors, vendor]);
  };

  const handleRemoveVendor = (vendorId) => {
    setSelectedVendors(selectedVendors.filter(v => v.id !== vendorId));
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
    setDocuments(prev => [...prev, ...allowedFiles]);
  };

  const handleRemoveDocument = (docToRemove) => {
    setDocuments(documents.filter(doc => doc.name !== docToRemove.name));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.date) return alert("Please fill in at least the event name and date.");
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to create an event.");

    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) return alert("Please select a date that is still to come.");

    setIsSubmitting(true);

    try {
      // Upload documents to Cloudinary
      const documentURLs = await Promise.all(
        documents.map(async (docFile) => {
          const formDataForUpload = new FormData();
          formDataForUpload.append("file", docFile);
          formDataForUpload.append("upload_preset", "event_uploads");

          const safeEventName = formData.name.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
          const folderPath = `planners/${user.uid}/${safeEventName}`;
          formDataForUpload.append("folder", folderPath);

          const response = await fetch(
            "https://api.cloudinary.com/v1_1/db4slx3ga/auto/upload",
            { method: "POST", body: formDataForUpload }
          );

          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message || "Cloudinary upload failed");
          return { name: docFile.name, url: data.secure_url };
        })
      );

      // Save event to Firestore
      const eventRef = doc(collection(db, `planners/${user.uid}/events`));
      await setDoc(eventRef, {
        name: formData.name,
        date: formData.date,
        time: formData.time || "All day",
        vendors_id: selectedVendors.map(v => v.id),
        documents: documentURLs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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
      <form className="profile-form" onSubmit={handleSubmit}>
        {/* Event Name */}
        <div className="form-group">
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          <label>Event Name</label>
        </div>

        {/* Event Date */}
        <div className="form-group">
          <FaCalendarAlt />
          <input type="date" name="date" value={formData.date} min={new Date().toISOString().split("T")[0]} onChange={handleChange} required />
        </div>

        {/* Event Time */}
        <div className="form-group">
          <FaClock />
          <input type="time" name="time" value={formData.time} onChange={handleChange} />
        </div>

        {/* Vendors */}
        <div className="form-group-column optional-section">
          <h3><FaUsers /> Vendors</h3>
          <input type="text" placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {vendorCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
          </select>
          <div className="vendor-list">
            {filteredVendors.map(vendor => (
              <div key={vendor.id} className="vendor-card">
                <span>{vendor.name_of_business} ({vendor.category})</span>
                <button type="button" onClick={() => handleAddVendor(vendor)}>Add</button>
              </div>
            ))}
          </div>
          {selectedVendors.length > 0 && (
            <div>
              <h4>Selected Vendors:</h4>
              <ul>
                {selectedVendors.map(v => (
                  <li key={v.id}>
                    {v.name_of_business} 
                    <button type="button" onClick={() => handleRemoveVendor(v.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="form-group-column optional-section">
          <h3><FaFileAlt /> Documents</h3>
          <input type="file" multiple onChange={handleFileChange} />
          {documents.length > 0 && (
            <ul>
              {documents.map((doc, idx) => (
                <li key={idx}>
                  {doc.name} ({(doc.size / 1024).toFixed(1)} KB)
                  <button type="button" onClick={() => handleRemoveDocument(doc)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating Event..." : "Save Event"}
        </button>
      </form>
    </main>
  );
}
