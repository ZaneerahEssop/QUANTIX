import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase"; // 👈 Import auth and db
import { doc, setDoc } from "firebase/firestore"; // 👈 Import Firestore functions

function VendorForm() {
  const navigate = useNavigate();
  const [profilePic, setProfilePic] = useState(null);
  const [formData, setFormData] = useState({
    category: "",
    contact_number: "",
    description: "",
    name_of_business: "",
    name_of_vendor: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) setProfilePic(URL.createObjectURL(file));
  };

  // 👇 Make the function async and add the Firebase logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be signed in to submit your profile.");
        return;
      }

      // Save vendor data in Firestore under /vendors/{uid}
      await setDoc(doc(db, "vendors", user.uid), {
        ...formData,
        profilePic: profilePic || "",
        email: user.email,
        uid: user.uid,
      });

      alert("Profile submitted!");
      navigate("/vendor-dashboard"); // Redirect after saving
    } catch (error) {
      console.error("Error saving vendor profile:", error);
      alert("Something went wrong. Try again.");
    }
  };

  return (
    <main className="profile-container">
      <h1>
        Set Up Your <span className="accent-text">Vendor</span> Profile
      </h1>
      <p>Fill out your details to get started and connect with planners.</p>

      <form className="profile-form" onSubmit={handleSubmit}>
        {/* Profile pic - No changes needed here */}
        <div className="form-group profile-pic-group">
          <div
            className="pic-preview"
            style={{
              backgroundImage: profilePic ? `url(${profilePic})` : "none",
            }}
          >
            {!profilePic && <i className="fas fa-camera default-icon"></i>}
          </div>
          <label htmlFor="profile_pic">Upload Profile Picture</label>
          <input type="file" id="profile_pic" onChange={handlePicChange} />
        </div>

        {/* Name of Vendor */}
        <div className="form-group">
          <i className="form-icon fas fa-user"></i>
          <input
            type="text"
            name="name_of_vendor"
            className={`form-input ${
              formData.name_of_vendor ? "has-value" : ""
            }`}
            value={formData.name_of_vendor}
            onChange={handleChange}
            required
          />
          <label className="form-label">Name of Vendor</label>
        </div>

        {/* Name of Business */}
        <div className="form-group">
          <i className="form-icon fas fa-building"></i>
          <input
            type="text"
            name="name_of_business"
            className={`form-input ${
              formData.name_of_business ? "has-value" : ""
            }`}
            value={formData.name_of_business}
            onChange={handleChange}
          />
          <label className="form-label">Name of Business (Optional)</label>
        </div>

        {/* Contact Number */}
        <div className="form-group">
          <i className="form-icon fas fa-phone"></i>
          <input
            type="tel"
            name="contact_number"
            className={`form-input ${
              formData.contact_number ? "has-value" : ""
            }`}
            value={formData.contact_number}
            onChange={handleChange}
            required
          />
          <label className="form-label">Contact Number</label>
        </div>

        {/* Category */}
        <div className="form-group">
          <i className="form-icon fas fa-tag"></i>
          <input
            type="text"
            name="category"
            className={`form-input ${formData.category ? "has-value" : ""}`}
            value={formData.category}
            onChange={handleChange}
          />
          <label className="form-label">Category (e.g., Catering, Photography)</label>
        </div>

        {/* Description */}
        <div className="form-group">
          <i className="form-icon fas fa-align-left"></i>
          <textarea
            name="description"
            className={`form-input ${
              formData.description ? "has-value" : ""
            }`}
            value={formData.description}
            onChange={handleChange}
          ></textarea>
          <label className="form-label">Description</label>
        </div>

        <button type="submit" className="submit-btn">
          Save & Continue
        </button>
      </form>
    </main>
  );
}

export default VendorForm;