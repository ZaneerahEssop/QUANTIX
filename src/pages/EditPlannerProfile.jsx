import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FaUserCircle, FaCamera, FaArrowLeft, FaUser, FaPhone, FaAlignLeft } from 'react-icons/fa';
import './ProfileForm.css';

function EditPlannerProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: ''
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
          const userDoc = await getDoc(doc(db, 'planners', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData({
              full_name: userData.full_name || '',
              email: user.email || '',
              phone: userData.phone || '',
              bio: userData.bio || ''
            });
            if (userData.profilePic) {
              setProfilePic(userData.profilePic);
              setOriginalProfilePic(userData.profilePic);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
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
      const userRef = doc(db, 'planners', user.uid);
      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        bio: formData.bio
      };
      if (profilePic && profilePic !== originalProfilePic) {
        updateData.profilePic = typeof profilePic === 'string' ? profilePic : URL.createObjectURL(profilePic);
      }
      await updateDoc(userRef, updateData);
      alert('Profile updated successfully!');
      navigate('/planner-dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
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
      
      <h1>Edit Your <span style={{color: '#FFB6C1'}}>Planner</span> Profile</h1>
      <p>Update your personal information</p>
      
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
          <input type="text" name="full_name" className={`form-input ${formData.full_name ? "has-value" : ""}`} value={formData.full_name} onChange={handleChange} required />
          <label className="form-label">Full Name</label>
        </div>
        <div className="form-group">
          <i className="form-icon"><FaPhone /></i>
          <input type="tel" name="phone" className={`form-input ${formData.phone ? "has-value" : ""}`} value={formData.phone} onChange={handleChange} required />
          <label className="form-label">Phone Number</label>
        </div>
        <div className="form-group">
          <i className="form-icon"><FaAlignLeft /></i>
          <textarea name="bio" className={`form-input ${formData.bio ? "has-value" : ""}`} value={formData.bio} onChange={handleChange} rows="4" required></textarea>
          <label className="form-label">Bio</label>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/planner-dashboard')}>
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

export default EditPlannerProfile;