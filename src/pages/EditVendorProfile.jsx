import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import '../ProfileForm.css';
import '../App.css';

const EditVendorProfile = ({ session }) => {
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    phone: '',
    description: '',
    categories: [],
    profilePic: null,
  });
  const [preview, setPreview] = useState(null);
  const [warning, setWarning] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef(null);

  useEffect(() => {
    const timer = successTimer.current;
    
    // Clear any pending timeouts when component unmounts
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      setShowSuccess(false);
    };
  }, [successTimer]);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const userId = session?.user?.id;
        if (!userId) {
          setWarning('User not authenticated');
          setIsLoading(false);
          return;
        }

        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('vendor_id', userId)
          .single();
        
        if (vendorError) {
          console.error('Error fetching vendor data:', vendorError);
          setWarning('Failed to load vendor profile. Please try again.');
          setIsLoading(false);
          return;
        }

        if (vendor) {
          const categories = vendor.service_type ? vendor.service_type.split(',').map(s => s.trim()) : [];
          
          setFormData({
            name: vendor.name || '',
            businessName: vendor.business_name || '',
            phone: vendor.contact_number || '',
            description: vendor.description || '',
            categories: categories,
            profilePic: null,
          });

          if (vendor.profile_picture) {
            setPreview(vendor.profile_picture);
          }
        }
      } catch (error) {
        console.error('Error in fetchVendorData:', error);
        setWarning('An error occurred while loading your profile.');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchVendorData();
    }
  }, [session]);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'category') {
      setFormData(prev => {
        const valueLower = value.toLowerCase();
        let newCategories = [...prev.categories];
        
        const categoryIndex = newCategories.findIndex(cat => 
          cat.toLowerCase() === valueLower
        );
        
        if (checked && categoryIndex === -1) {
          newCategories.push(value);
        } else if (!checked && categoryIndex !== -1) {
          newCategories.splice(categoryIndex, 1);
        }
        
        return { ...prev, categories: newCategories };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      setWarning('Please enter 10 digits for the phone number');
      return;
    }

    setIsSubmitting(true);
    setWarning('');

    try {
      const userId = session?.user?.id;
      if (!userId) {
        setWarning('User not authenticated');
        return;
      }

      let profilePicUrl = preview?.startsWith('data:') ? null : preview;

      if (formData.profilePic) {
        const fileExt = formData.profilePic.name.split('.').pop();
        const fileName = `${userId}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(`vendors/${fileName}`, formData.profilePic);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(`vendors/${fileName}`);
        
        profilePicUrl = publicUrl;
      }

      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('vendor_id', userId)
        .single();
        
      if (vendorError) {
        throw new Error('Failed to fetch vendor profile');
      }

      if (!vendor) {
        const newVendorData = {
          vendor_id: userId,
          name: formData.name || '',
          business_name: formData.businessName || '',
          contact_number: formData.phone || '',
          description: formData.description || '',
          service_type: formData.categories.map(cat => cat.toLowerCase()).join(','),
          ...(profilePicUrl && { profile_picture: profilePicUrl })
        };
        
        const { error: createError } = await supabase
          .from('vendors')
          .insert([newVendorData]);
          
        if (createError) {
          throw new Error('Failed to create vendor profile');
        }
      } else {
        const updates = {
          name: formData.name || '',
          business_name: formData.businessName || '',
          contact_number: formData.phone || '',
          description: formData.description || '',
          service_type: formData.categories.map(cat => cat.toLowerCase()).join(','),
          ...(profilePicUrl && { profile_picture: profilePicUrl })
        };
        
        const { error: updateError } = await supabase
          .from('vendors')
          .update(updates)
          .eq('vendor_id', userId);
        
        if (updateError) {
          throw updateError;
        }
      }

      await supabase.auth.updateUser({
        data: { name: formData.name }
      });

      setShowSuccess(true);
    } catch (error) {
      console.error('Error updating vendor profile:', error);
      setWarning(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-container" style={{ textAlign: 'center' }}>
        {warning && <div className="warning-message">{warning}</div>}
        <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading your profile...</p>
      </div>
    );
  }

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
              onClick={() => {
                setShowSuccess(false);
                navigate('/vendor-dashboard');
              }}
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
      <div className="profile-container" style={{ maxWidth: "600px", padding: "3.5rem 2.5rem" }}>
        <h1 style={{ textAlign: "center", fontSize: "2.3rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Edit your <span style={{ color: "#E5ACBF" }}>Vendor</span> profile
        </h1>
        <p className="accent-text" style={{ textAlign: "center", fontSize: "1.1rem", marginBottom: "2rem" }}>
          Update your business details to be discovered by event planners.
        </p>
        
        {warning && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            color: '#d32f2f',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #d32f2f'
          }}>
            {warning}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="profile-form">
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
                backgroundColor: 'rgba(255,255,255,0.9)'
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

          <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <span className="form-icon" style={{
              position: 'absolute',
              left: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#E5ACBF',
              fontSize: '1.1rem'
            }}>
              <i className="fas fa-building"></i>
            </span>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 15px 12px 45px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'all 0.3s',
                backgroundColor: 'rgba(255,255,255,0.9)'
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
              ...(formData.businessName && {
                top: '-10px',
                left: '10px',
                fontSize: '0.8rem',
                background: 'white',
                padding: '0 5px',
                color: '#E5ACBF'
              })
            }}>Business Name</label>
          </div>

          <div className="form-group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-control"
              style={{
                paddingLeft: '45px',
                width: '100%',
                height: '45px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s',
                '&:focus': {
                  borderColor: '#E5ACBF',
                  boxShadow: '0 0 0 2px rgba(229, 172, 191, 0.2)'
                }
              }}
              pattern="[0-9]{10}"
              title="Phone number must be exactly 10 digits"
              required
            />
            <span className="form-icon" style={{
              position: 'absolute',
              left: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#E5ACBF',
              fontSize: '1.1rem',
              pointerEvents: 'none'
            }}>
              <i className="fas fa-phone"></i>
            </span>
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

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              color: '#555',
              fontSize: '0.9rem'
            }}>Service Categories <span style={{ color: '#E5ACBF' }}>*</span></label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '10px',
              maxWidth: '500px',
              margin: '0 auto 10px auto'
            }}>
              {['Catering', 'Photography', 'Venue', 'Entertainment', 'Decoration', 'Music'].map((category) => {
                const isSelected = formData.categories.some(cat => 
                  cat.toLowerCase() === category.toLowerCase()
                );
                return (
                  <label key={category} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(229, 172, 191, 0.2)' : 'rgba(255,255,255,0.9)',
                    border: `2px solid ${isSelected ? '#E5ACBF' : '#ddd'}`,
                    color: isSelected ? '#E5ACBF' : '#555',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    justifyContent: 'center',
                    fontSize: '0.95rem',
                    fontWeight: isSelected ? '600' : '400'
                  }}>
                    <input
                      type="checkbox"
                      name="category"
                      value={category}
                      checked={isSelected}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    {category}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontSize: '0.9rem'
            }}>Business Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical',
                minHeight: '100px',
                backgroundColor: 'rgba(255,255,255,0.9)'
              }}
            ></textarea>
          </div>

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
              }
            }}
            onClick={() => navigate(-1)}
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
                cursor: 'not-allowed'
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};

export default EditVendorProfile;