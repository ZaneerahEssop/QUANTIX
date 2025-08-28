import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { FaUserCircle, FaCamera } from 'react-icons/fa';

function VendorForm() {
  const navigate = useNavigate();
  const [profilePic, setProfilePic] = useState(null);
  const [isUploading] = useState(false);
  const [formData, setFormData] = useState({
    category: [],
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
    if (!file) return;

    // Basic validation
    if (!file.type.match('image.*')) {
      alert('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Create a preview URL for the image
    const previewUrl = URL.createObjectURL(file);
    setProfilePic(previewUrl);
    
    // Store the file object for later use
    setFormData(prev => ({
      ...prev,
      profilePicFile: file
    }));
  };

  // 👇 Make the function async and add the Firebase logic
  const validatePhoneNumber = (phone) => {
    // Remove any non-digit characters and check if length is 10
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number
    if (!validatePhoneNumber(formData.contact_number)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    
    // Ensure all required fields are filled
    if (!formData.name_of_vendor || !formData.name_of_business || !formData.category) {
      alert("Please fill in all required fields");
      return;
    }
    
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
        {/* Profile Picture */}
        <div className="form-group profile-pic-group">
          <label htmlFor="profile_pic" className="pic-upload-label">
            <div
              className="pic-preview"
              style={{
                backgroundImage: profilePic ? `url(${profilePic})` : 'none',
                background: profilePic ? 'none' : 'linear-gradient(135deg, #FF7F50 0%, #FFDAB9 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: 'pointer',
                position: 'relative',
                margin: '0 auto',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '2px solid #fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              aria-label="Profile picture preview"
              role="img"
            >
              <div className="default-state">
                {!profilePic ? (
                  <>
                    <FaUserCircle size={60} color="#ffffff" />
                    <span style={{ display: 'block', marginTop: '8px', color: 'white' }}>Add Profile Picture</span>
                  </>
                ) : (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      textAlign: 'center',
                      padding: '5px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      <FaCamera style={{ fontSize: '12px', color: '#ffffff' }} />
                      <span>Change</span>
                    </div>
                  </div>
                )}
              </div>
              {isUploading && (
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div className="spinner"></div>
                </div>
              )}
            </div>
          </label>
          <input 
            type="file" 
            id="profile_pic" 
            onChange={handlePicChange} 
            accept="image/*"
            style={{ display: 'none' }}
            disabled={isUploading}
          />
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
          <label className="form-label">Name</label>
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
          <label className="form-label">Name of Business</label>
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
          <select
            name="category"
            className={`form-input ${formData.category ? "has-value" : ""}`}
            value={formData.category[0] || ""}
            onChange={(e) =>
            setFormData({ ...formData, category: [e.target.value] }) // store as array
            }
            required
          >
            <option value=""></option>
            <option value="Catering">Catering</option>
            <option value="Flowers">Flowers</option>
            <option value="Venue">Venue</option>
            <option value="Photography">Photography</option>
            <option value="Music">Music</option>
            <option value="Decor">Decor</option>
          </select>
          <label className="form-label">Category</label>
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