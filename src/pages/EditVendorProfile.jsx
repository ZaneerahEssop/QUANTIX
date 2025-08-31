import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FaUserCircle, FaCamera, FaArrowLeft, FaBuilding, FaUser, FaPhone, FaAlignLeft, FaCheck } from 'react-icons/fa';
import './ProfileForm.css';

const CATEGORIES = ['Catering', 'Music', 'Flowers', 'Decor', 'Photography', 'Venue'];

function EditVendorProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name_of_vendor: '',
    name_of_business: '',
    email: '',
    contact_number: '',
    category: [],
    description: ''
  });
  
  const [originalProfilePic, setOriginalProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePic, setProfilePic] = useState(null); // Can be URL string or File object
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Fetch user data logic remains the same...
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'vendors', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData({
              name_of_vendor: data.name_of_vendor || '',
              name_of_business: data.name_of_business || '',
              email: user.email || '',
              contact_number: data.contact_number || '',
              category: data.category || [],
              description: data.description || ''
            });
            if (data.profilePic) {
              setProfilePic(data.profilePic);
              setOriginalProfilePic(data.profilePic);
            }
          }
        } catch (error) {
          console.error('Error fetching vendor data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter(cat => cat !== category)
        : [...prev.category, category]
    }));
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file); // Store the file object
    }
  };

  const handleSubmit = async (e) => {
    // Submit logic remains the same...
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    try {
      setIsUploading(true);
      const userRef = doc(db, 'vendors', user.uid);
      const updateData = {
        name_of_vendor: formData.name_of_vendor,
        name_of_business: formData.name_of_business,
        contact_number: formData.contact_number,
        category: formData.category,
        description: formData.description
      };
      if (profilePic && profilePic !== originalProfilePic) {
        updateData.profilePic = typeof profilePic === 'string' ? profilePic : URL.createObjectURL(profilePic);
      }
      await updateDoc(userRef, updateData);
      alert('Profile updated successfully!');
      navigate('/vendor-dashboard');
    } catch (error) {
      console.error('Error updating vendor profile:', error);
      alert('Failed to update profile.');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Determine the correct URL for the preview image
  const profilePicUrl = profilePic ? (typeof profilePic === 'string' ? profilePic : URL.createObjectURL(profilePic)) : null;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <main className="profile-container">
      <button onClick={() => navigate(-1)} className="back-button">
        <FaArrowLeft /> Back
      </button>
      
      <h1>Edit Your <span style={{color: '#FFB6C1'}}>Vendor</span> Profile</h1>
      <p>Update your business information and services</p>
      
      <form className="profile-form" onSubmit={handleSubmit}>

        {/* --- EXACT MATCH PROFILE PICTURE UPLOADER --- */}
        <div className="form-group profile-pic-group">
          <label htmlFor="profile_pic" className="pic-upload-label">
            <div
              className="pic-preview"
              style={{
                backgroundImage: profilePicUrl ? `url(${profilePicUrl})` : 'var(--primary-gradient)',
              }}
            >
              {!profilePicUrl && (
                <div className="default-state">
                  <FaUserCircle size={60} />
                  <span>Add Profile Picture</span>
                </div>
              )}
              {profilePicUrl && (
                <div className="change-overlay">
                  <FaCamera />
                  <span>Change</span>
                </div>
              )}
            </div>
          </label>
          <input 
            type="file" 
            id="profile_pic"
            accept="image/*" 
            onChange={handlePicChange} 
            style={{ display: 'none' }} 
            disabled={isUploading}
          />
        </div>

        {/* --- Form fields --- */}
        <div className="form-group">
          <i className="form-icon"><FaUser /></i>
          <input type="text" name="name_of_vendor" className={`form-input ${formData.name_of_vendor ? "has-value" : ""}`} value={formData.name_of_vendor} onChange={handleChange} required />
          <label className="form-label">Your Name</label>
        </div>
        <div className="form-group">
          <i className="form-icon"><FaBuilding /></i>
          <input type="text" name="name_of_business" className={`form-input ${formData.name_of_business ? "has-value" : ""}`} value={formData.name_of_business} onChange={handleChange} required />
          <label className="form-label">Business Name</label>
        </div>
        <div className="form-group">
          <i className="form-icon"><FaPhone /></i>
          <input type="tel" name="contact_number" className={`form-input ${formData.contact_number ? "has-value" : ""}`} value={formData.contact_number} onChange={handleChange} required />
          <label className="form-label">Contact Number</label>
        </div>
        <div className="form-group category-group">
          <label>Services Offered</label>
          <div className="category-grid">
            {CATEGORIES.map((category) => (
              <label key={category} className={`category-label ${formData.category.includes(category) ? 'selected' : ''}`}>
                <div className="checkbox-custom">
                  {formData.category.includes(category) && <FaCheck size={12} color="white" />}
                </div>
                <input type="checkbox" checked={formData.category.includes(category)} onChange={() => handleCategoryChange(category)} style={{ display: 'none' }} />
                <span>{category}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <i className="form-icon"><FaAlignLeft /></i>
          <textarea name="description" className={`form-input ${formData.description ? "has-value" : ""}`} value={formData.description} onChange={handleChange} required></textarea>
          <label className="form-label">Business Description</label>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/vendor-dashboard')}>
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={isUploading}>
            {isUploading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EditVendorProfile;