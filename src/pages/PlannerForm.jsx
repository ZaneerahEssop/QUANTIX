import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import "../ProfileForm.css";

const PlannerForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    profilePic: null,
  });
  const [preview, setPreview] = useState(null);
  const [warning, setWarning] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, profilePic: file });
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      setWarning("Phone number must be exactly 10 digits.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setWarning("Please enter a valid email address (e.g., example@email.com)");
      return;
    }

    // Save to Supabase
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = user?.id;
    console.log('PlannerForm: userId for planner_id insert:', userId);
    if (!userId) {
      setWarning("User not authenticated");
      return;
    }

    // Check if user exists in users table
    const { data: userExists, error: userSelectError } = await supabase
      .from("users")
      .select("user_id")
      .eq("user_id", userId)
      .single();
    if (userSelectError || !userExists) {
    setWarning("User does not exist in users table. Please refresh the page or contact support if this persists.");
      return;
    }

    let profilePicUrl = null;
    if (formData.profilePic) {
      const fileExt = formData.profilePic.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, formData.profilePic);
      if (uploadError) {
        setWarning("Error uploading profile picture: " + uploadError.message);
        return;
      }
      profilePicUrl = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName).data.publicUrl;
    }

    // Check if planner profile already exists
    const { data: existing, error: selectError } = await supabase
      .from("planners")
      .select("planner_id")
      .eq("planner_id", userId)
      .single();
    if (selectError && selectError.code !== 'PGRST116') {
      setWarning("Error checking existing profile: " + selectError.message);
      return;
    }

    let upsertError = null;
    if (existing) {
      // Update existing profile
      const { error } = await supabase
        .from("planners")
        .update({
          name: formData.name,
          contact_number: formData.phone,
          bio: formData.bio,
          profile_picture: profilePicUrl,
        })
        .eq("planner_id", userId);
      upsertError = error;
    } else {
      // Insert new profile
      const { error } = await supabase
        .from("planners")
        .insert([
          {
            planner_id: userId,
            name: formData.name,
            email: formData.email,
            contact_number: formData.phone,
            bio: formData.bio,
            profile_picture: profilePicUrl,
          },
        ]);
      upsertError = error;
    }
    if (upsertError) {
      setWarning("Error saving profile: " + upsertError.message);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #E5ACBF 0%, #E8B180 100%)" }}>
  <div className="profile-container" style={{ maxWidth: "1600px", padding: "3.5rem 2.5rem" }}>
        <h1 style={{ textAlign: "center", fontSize: "2.3rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Create your <span style={{ color: "#E5ACBF" }}>Planner</span> profile
        </h1>
        <p className="accent-text" style={{ textAlign: "center", fontSize: "1.1rem", marginBottom: "2rem" }}>
          Fill out your details to get started and connect with vendors.
        </p>
        {warning && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div style={{
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              padding: "2.5rem 2rem",
              minWidth: "320px",
              maxWidth: "90vw",
              textAlign: "center",
              borderTop: "5px solid #E5ACBF",
            }}>
              <div style={{ fontSize: "1.15rem", color: "#E5ACBF", fontWeight: 600, marginBottom: "1rem" }}>Error</div>
              <div style={{ color: "#333", marginBottom: "1.5rem" }}>{warning}</div>
              <button
                className="submit-btn"
                style={{ background: "linear-gradient(135deg, #E5ACBF 0%, #E8B180 100%)", color: "#fff", minWidth: "120px" }}
                onClick={() => setWarning("")}
              >OK</button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-pic-group">
            <label htmlFor="profilePic" className="pic-upload-label">
              <div
                className="pic-preview"
                style={{
                  background: preview
                    ? `url(${preview}) center/cover no-repeat`
                    : "linear-gradient(135deg, #E5ACBF 0%, #E8B180 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {!preview && (
                  <div className="default-state" style={{ color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                    <i className="fas fa-camera" style={{ fontSize: "2.5rem", color: "#fff" }}></i>
                    <span style={{ color: "#fff", marginTop: "6px", fontSize: "0.95rem", fontWeight: 500, textAlign: "center", lineHeight: "1.2", maxWidth: "110px", wordBreak: "break-word" }}>Add Profile Picture</span>
                  </div>
                )}
                {preview && (
                  <div className="change-overlay">
                    <i className="fas fa-camera"></i> Change
                  </div>
                )}
              </div>
              <input
                id="profilePic"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePicChange}
              />
            </label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-user"></i></span>
            <input
              id="name"
              type="text"
              name="name"
              className={"form-input" + (formData.name ? " has-value" : "")}
              placeholder=" "
              value={formData.name}
              onChange={handleChange}
              required
            />
            <label className="form-label" htmlFor="name">Name</label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-envelope"></i></span>
            <input
              id="email"
              type="email"
              name="email"
              className={"form-input" + (formData.email ? " has-value" : "")}
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
            />
            <label className="form-label" htmlFor="email">Email</label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-phone"></i></span>
            <input
              id="phone"
              type="tel"
              name="phone"
              className={"form-input" + (formData.phone ? " has-value" : "")}
              placeholder=" "
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <label className="form-label" htmlFor="phone">Phone Number</label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-align-left"></i></span>
            <textarea
              id="bio"
              name="bio"
              className={"form-input" + (formData.bio ? " has-value" : "")}
              placeholder=" "
              value={formData.bio || ""}
              onChange={handleChange}
              required
              style={{ minHeight: "80px", resize: "vertical", paddingLeft: "45px" }}
            />
            <label className="form-label" htmlFor="bio">Bio</label>
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              style={{ background: "linear-gradient(135deg, #F6A28C 0%, #FFDAB9 100%)", color: "#fff", minWidth: "260px", padding: "1rem 0", fontSize: "1.1rem" }}
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlannerForm;
