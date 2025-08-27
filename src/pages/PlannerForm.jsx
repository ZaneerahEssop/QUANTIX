import React, { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaUserCircle, FaCamera } from 'react-icons/fa';

function PlannerForm() {
  const [profilePic, setProfilePic] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: ""
  });
  const navigate = useNavigate();

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
    // We'll implement the actual upload logic when needed
    setFormData(prev => ({
      ...prev,
      profilePicFile: file
    }));
  };



  const validatePhoneNumber = (phone) => {
    // Remove any non-digit characters and check if length is 10
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number
    if (!validatePhoneNumber(formData.phone)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be signed in to submit your profile.");
        return;
      }

      // Save profile data in Firestore under /planners/{uid}
      await setDoc(doc(db, "planners", user.uid), {
        ...formData,
        email: user.email,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });

      alert("Profile submitted!");
      navigate("/planner-dashboard"); // redirect after saving
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Something went wrong. Try again.");
    }
  };

  return (
    <main className="profile-container">
      <h1>
        Set Up Your <span className="accent-text">Planner</span> Profile
      </h1>
      <p>Fill out your details to get started and connect with vendors.</p>

      <form className="profile-form" onSubmit={handleSubmit}>
        {/* Profile Picture */}
        <div className="form-group profile-pic-group">
          <label htmlFor="profile_pic" className="pic-upload-label">
            <div
              className="pic-preview"
              style={{
                backgroundImage: profilePic ? `url(${profilePic})` : "none",
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
                backgroundColor: '#f0f2f5',
                overflow: 'hidden'
              }}
            >
              <div className="default-state">
                {!profilePic ? (
                  <>
                    <FaUserCircle size={60} color="#ffffff" />
                    <span style={{ display: 'block', marginTop: '8px' }}>Add Profile Picture</span>
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

        {/* Full Name */}
        <div className="form-group">
          <i className="form-icon fas fa-user"></i>
          <input
            type="text"
            name="full_name"
            className={`form-input ${
              formData.full_name ? "has-value" : ""
            }`}
            value={formData.full_name}
            onChange={handleChange}
            required
          />
          <label className="form-label">Full Name</label>
        </div>

{/* Phone */}
        <div className="form-group">
          <i className="form-icon fas fa-phone"></i>
          <input
            type="tel"
            name="phone"
            className={`form-input ${formData.phone ? "has-value" : ""}`}
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <label className="form-label">Phone Number</label>
        </div>

{/* Bio */}
        <div className="form-group">
          <i className="form-icon fas fa-align-left"></i>
          <textarea
            name="bio"
            className={`form-input ${formData.bio ? "has-value" : ""}`}
            value={formData.bio}
            onChange={handleChange}
          ></textarea>
          <label className="form-label">Short Bio</label>
        </div>

        <button type="submit" className="submit-btn">
          Save & Continue
        </button>
      </form>
    </main>
  );
}

export default PlannerForm;
