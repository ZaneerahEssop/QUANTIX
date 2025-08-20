import React, { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function PlannerForm() {
  const [profilePic, setProfilePic] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    company_name: "",
    phone: "",
    website: "",
    bio: ""
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) setProfilePic(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be signed in to submit your profile.");
        return;
      }

      // Save profile data in Firestore under /planners/{uid}
      await setDoc(doc(db, "planners", user.uid), {
        ...formData,
        profilePic: profilePic || "",
        email: user.email,
        uid: user.uid,
    
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
        {/* Profile pic */}
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

        {/* Company Name */}
        <div className="form-group">
          <i className="form-icon fas fa-building"></i>
          <input
            type="text"
            name="company_name"
            className={`form-input ${
              formData.company_name ? "has-value" : ""
            }`}
            value={formData.company_name}
            onChange={handleChange}
          />
          <label className="form-label">Company Name (Optional)</label>
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

        {/* Website */}
        <div className="form-group">
          <i className="form-icon fas fa-link"></i>
          <input
            type="url"
            name="website"
            className={`form-input ${formData.website ? "has-value" : ""}`}
            value={formData.website}
            onChange={handleChange}
          />
          <label className="form-label">Website / Portfolio</label>
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
