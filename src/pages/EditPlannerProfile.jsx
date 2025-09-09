import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import '../ProfileForm.css';
import '../App.css';

const EditPlannerProfile = ({ session }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    profilePic: null
  });
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const successTimer = useRef(null);
  const navigate = useNavigate();


  useEffect(() => {
    const timer = successTimer.current;
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      setShowSuccess(false);
    };
  }, [successTimer]);

  useEffect(() => {
    const fetchPlannerData = async () => {
      try {
        const userId = session?.user?.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        const { data: planner, error } = await supabase
          .from('planners')
          .select('*')
          .eq('planner_id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching planner data:', error);
          setIsLoading(false);
          return;
        }

        if (planner) {
          setFormData({
            name: planner.name || '',
            phone: planner.contact_number || '',
            bio: planner.bio || '',
            profilePic: planner.profile_picture || null
          });

          if (planner.profile_picture) {
            setPreview(planner.profile_picture);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching planner data:', error);
      }
    };

    if (session) {
      fetchPlannerData();
    }
  }, [session]);

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePic: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setWarningMessage('');
    setShowWarning(false);
  };

  const handleCancel = (e) => {
    e?.preventDefault?.();
    navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted', formData);
    
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      setWarningMessage('Please enter a valid 10-digit phone number');
      setShowWarning(true);
      return;
    }
    
    if (!formData.name) {
      setWarningMessage('Please enter your name');
      setShowWarning(true);
      return;
    }
    
    setIsSubmitting(true);
    setWarningMessage('');
    setShowWarning(false);

    try {
      const userId = session?.user?.id;
      console.log('User ID:', userId);
      if (!userId) {
        console.error('No user ID found in session');
        setWarningMessage('No user session found. Please log in again.');
        setShowWarning(true);
        navigate('/login');
        return;
      }
      
      let profilePicUrl = preview?.startsWith('data:') ? null : preview;

      if (formData.profilePic && formData.profilePic.name) {
        const fileNameParts = formData.profilePic.name.split('.');
        const fileExt = fileNameParts.length > 1 ? fileNameParts.pop() : 'jpg';
        const baseName = fileNameParts.join('.');
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileName = `planners/${userId}-${randomString}-${baseName}.${fileExt}`;
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(fileName, formData.profilePic, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName);

          profilePicUrl = publicUrl;
          console.log('Profile picture uploaded successfully:', publicUrl);
        } catch (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          profilePicUrl = null;
        }
      }

      const plannerData = {
        planner_id: userId,
        name: formData.name || '',
        contact_number: formData.phone || '',
        bio: formData.bio || '',
        ...(profilePicUrl && { profile_picture: profilePicUrl })
      };

      const { data: existingPlanner, error: fetchError } = await supabase
        .from('planners')
        .select('*')
        .eq('planner_id', userId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingPlanner) {
        const { error: createError } = await supabase
          .from('planners')
          .insert([plannerData]);
        if (createError) {
          throw new Error('Failed to create planner profile');
        }
      } else {
        const { error: updateError } = await supabase
          .from('planners')
          .update(plannerData)
          .eq('planner_id', userId);
          
        if (updateError) {
          throw updateError;
        }
      }

      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: { name: formData.name }
        });
        if (authError) throw authError;
        console.log('Auth user updated');
      } catch (authError) {
        console.error('Error updating auth user:', authError);
      }

      console.log('Profile update successful');
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Error updating planner profile:', error);
      setWarningMessage(error.message || 'Failed to update profile. Please try again.');
      setShowWarning(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-container" style={{ textAlign: 'center' }}>
        <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading your profile...</p>
      </div>
    );
  }

  const handleCloseAndRedirect = () => {
    setShowSuccess(false);
    navigate('/dashboard');
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      width: "100vw", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "linear-gradient(135deg, #E5ACBF 0%, #E8B180 100%)" 
    }}>
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-out',
          pointerEvents: 'auto',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            padding: '2.5rem 3rem',
            position: 'relative',
            minWidth: '350px',
            maxWidth: '90%',
            textAlign: 'center',
            border: '2px solid #E5ACBF',
            zIndex: 10001
          }}>
            <button 
              onClick={handleCloseAndRedirect}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666',
                padding: '0.25rem 0.5rem',
                lineHeight: 1,
                fontWeight: 'bold',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = '#E5ACBF'}
              onMouseOut={(e) => e.target.style.color = '#666'}
            >
              &times;
            </button>
            <p style={{ 
              margin: '1rem 0 0',
              color: '#333',
              fontWeight: 500,
              fontSize: '1.1rem',
              padding: '0 1rem'
            }}>
              Profile updated successfully!
            </p>
          </div>
        </div>
      )}

      {showWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-out',
          pointerEvents: 'auto',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            padding: '2.5rem 3rem',
            position: 'relative',
            minWidth: '350px',
            maxWidth: '90%',
            textAlign: 'center',
            border: '2px solid #E5ACBF',
            zIndex: 10001
          }}>
            <button 
              onClick={() => setShowWarning(false)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666',
                padding: '0.25rem 0.5rem',
                lineHeight: 1,
                fontWeight: 'bold',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = '#E5ACBF'}
              onMouseOut={(e) => e.target.style.color = '#666'}
            >
              &times;
            </button>
            <p style={{ 
              margin: '1rem 0 0',
              color: '#333',
              fontWeight: 500,
              fontSize: '1.1rem',
              padding: '0 1rem'
            }}>
              {warningMessage}
            </p>
          </div>
        </div>
      )}
      
      <div className="profile-container" style={{ maxWidth: "600px", padding: "3.5rem 2.5rem" }}>
        <h1 style={{ textAlign: "center", fontSize: "2.3rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Edit your <span style={{ color: "#E5ACBF" }}>Planner</span> profile
        </h1>
        <p className="accent-text" style={{ textAlign: "center", fontSize: "1.1rem", marginBottom: "2rem" }}>
          Update your details to connect with vendors
        </p>
        
        <form onSubmit={handleSubmit} className="profile-form">
          {/* Profile Picture Upload */}
          <div className="profile-pic-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="profilePic" className="pic-upload-label" style={{
              display: 'block',
              width: '150px',
              height: '150px',
              margin: '0 auto',
              borderRadius: '50%',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              border: '3px solid #fff',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: preview 
                  ? `url(${preview}) center/cover no-repeat` 
                  : 'linear-gradient(135deg, #E5ACBF 0%, #E8B180 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {!preview ? (
                  <div style={{ 
                    color: '#fff', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '1rem'
                  }}>
                    <i className="fas fa-camera" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                    <span style={{ fontSize: '0.85rem' }}>Change Photo</span>
                  </div>
                ) : (
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    textAlign: 'center',
                    padding: '8px',
                    fontSize: '0.85rem'
                  }}>
                    <i className="fas fa-camera"></i> Change
                  </div>
                )}
              </div>
              <input
                id="profilePic"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePicChange}
              />
            </label>
          </div>

          {/* Name Field */}
          <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <span className="form-icon" style={{
              position: 'absolute',
              left: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#E5ACBF',
              fontSize: '1.1rem'
            }}>
              <i className="fas fa-user"></i>
            </span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 15px 12px 45px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'all 0.3s',
                backgroundColor: 'rgba(255,255,255,0.9)',
                ':focus': {
                  borderColor: '#E5ACBF',
                  boxShadow: '0 0 0 2px rgba(229, 172, 191, 0.2)'
                }
              }}
              placeholder=" "
            />
            <label style={{
              position: 'absolute',
              left: '45px',
              top: '12px',
              color: '#999',
              transition: 'all 0.3s',
              pointerEvents: 'none',
              ...(formData.name && {
                top: '-10px',
                left: '10px',
                fontSize: '0.8rem',
                background: 'white',
                padding: '0 5px',
                color: '#E5ACBF'
              })
            }}>Full Name</label>
          </div>

          {/* Phone Number Field */}
          <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <span className="form-icon" style={{
              position: 'absolute',
              left: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#E5ACBF',
              fontSize: '1.1rem'
            }}>
              <i className="fas fa-phone"></i>
            </span>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 15px 12px 45px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'all 0.3s',
                backgroundColor: 'rgba(255,255,255,0.9)',
                ':focus': {
                  borderColor: '#E5ACBF',
                  boxShadow: '0 0 0 2px rgba(229, 172, 191, 0.2)'
                }
              }}
              placeholder=" "
            />
            <label style={{
              position: 'absolute',
              left: '45px',
              top: '12px',
              color: '#999',
              transition: 'all 0.3s',
              pointerEvents: 'none',
              ...(formData.phone && {
                top: '-10px',
                left: '10px',
                fontSize: '0.8rem',
                background: 'white',
                padding: '0 5px',
                color: '#E5ACBF'
              })
            }}>Phone Number</label>
          </div>

          {/* Bio Field */}
          <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <span className="form-icon" style={{
              position: 'absolute',
              left: '15px',
              top: '18px',
              color: '#E5ACBF',
              fontSize: '1.1rem'
            }}>
              <i className="fas fa-edit"></i>
            </span>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px 15px 12px 45px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical',
                transition: 'all 0.3s',
                backgroundColor: 'rgba(255,255,255,0.9)',
                ':focus': {
                  borderColor: '#E5ACBF',
                  boxShadow: '0 0 0 2px rgba(229, 172, 191, 0.2)'
                }
              }}
              placeholder=" "
            ></textarea>
            <label style={{
              position: 'absolute',
              left: '45px',
              top: '12px',
              color: '#999',
              transition: 'all 0.3s',
              pointerEvents: 'none',
              ...(formData.bio && {
                top: '-10px',
                left: '10px',
                fontSize: '0.8rem',
                background: 'white',
                padding: '0 5px',
                color: '#E5ACBF'
              })
            }}>Bio</label>
          </div>

          {/* Submit Button */}
          <div className="form-actions" style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'center',
            marginTop: '2rem'
          }}>
            <button 
              type="button" 
              style={{
                padding: '0.8rem 2rem',
                borderRadius: '50px',
                border: '2px solid #E5ACBF',
                backgroundColor: 'transparent',
                color: '#E5ACBF',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '180px',
                ':hover': {
                  backgroundColor: 'rgba(229, 172, 191, 0.1)'
                },
                ':disabled': {
                  opacity: 0.7,
                  cursor: 'not-allowed'
                }
              }}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{
                padding: '0.8rem 2rem',
                borderRadius: '50px',
                border: 'none',
                background: 'linear-gradient(135deg, #E5ACBF 0%, #E8B180 100%)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '180px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                ':hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
                },
                ':disabled': {
                  opacity: 0.7,
                  cursor: 'not-allowed',
                  transform: 'none',
                  boxShadow: 'none'
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlannerProfile;
