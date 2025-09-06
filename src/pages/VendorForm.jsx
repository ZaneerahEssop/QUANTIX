import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import "../ProfileForm.css";

const VendorForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    phone: "",
    description: "",
    category: "",
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

    // Get user
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      setWarning("User not authenticated");
      return;
    }

    // Upload profile picture if present
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

    // Insert vendor profile into vendors table
    const { error } = await supabase
      .from("vendors")
      .insert([
        {
          vendor_id: userId,
          created_at: new Date().toISOString(),
          service_type: formData.category,
          name: formData.name,
          contact_number: formData.phone,
          description: formData.description,
          business_name: formData.businessName,
          profile_picture: profilePicUrl,
        },
      ]);
    if (error) {
      setWarning("Error saving profile: " + error.message);
      return;
    }
    navigate("/vendor-dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #E5ACBF 0%, #E8B180 100%)" }}>
      <div className="profile-container" style={{ maxWidth: "1600px", padding: "3.5rem 2.5rem" }}>
        <h1 style={{ textAlign: "center", fontSize: "2.3rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Create your <span style={{ color: "#E5ACBF" }}>Vendor</span> profile
        </h1>
        <p className="accent-text" style={{ textAlign: "center", fontSize: "1.1rem", marginBottom: "2rem" }}>
          Provide your business details to be discovered by event planners.
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
              type="text"
              name="name"
              className={"form-input" + (formData.name ? " has-value" : "")}
              placeholder=" "
              value={formData.name}
              onChange={handleChange}
              required
            />
            <label className="form-label">Name</label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-building"></i></span>
            <input
              type="text"
              name="businessName"
              className={"form-input" + (formData.businessName ? " has-value" : "")}
              placeholder=" "
              value={formData.businessName}
              onChange={handleChange}
              required
            />
            <label className="form-label">Business Name</label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-phone"></i></span>
            <input
              type="tel"
              name="phone"
              className={"form-input" + (formData.phone ? " has-value" : "")}
              placeholder=" "
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <label className="form-label">Phone Number</label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-tag"></i></span>
            <select
              name="category"
              className={"form-input" + (formData.category ? " has-value" : "")}
              value={formData.category}
              onChange={handleChange}
              required
              style={{ color: formData.category ? "#333" : "#999" }}
            >
              <option value="" disabled></option>
              <option value="venue">Venue</option>
              <option value="music">Music</option>
              <option value="catering">Catering</option>
              <option value="flowers">Flowers</option>
              <option value="photography">Photography</option>
              <option value="decor">Decor</option>
            </select>
            <label className="form-label">Service Category</label>
          </div>
          <div className="form-group">
            <span className="form-icon"><i className="fas fa-align-left"></i></span>
            <textarea
              name="description"
              className={"form-input" + (formData.description ? " has-value" : "")}
              placeholder=" "
              value={formData.description}
              onChange={handleChange}
              required
              style={{ minHeight: "80px", resize: "vertical", paddingLeft: "45px" }}
            />
            <label className="form-label">Description of Services</label>
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

export default VendorForm;
