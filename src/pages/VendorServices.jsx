import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import '../ProfileForm.css';
import '../App.css';
import '../styling/VendorServices.css';
import PhotographyService from '../components/services/PhotographyService';
import CateringService from '../components/services/CateringService';

const VendorServices = ({ session }) => {
  const [vendorData, setVendorData] = useState({
    name: '',
    businessName: '',
    phone: '',
    description: '',
    categories: [],
    profilePicture: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const userId = session?.user?.id;
        if (!userId) {
          setError('User not authenticated');
          setIsLoading(false);
          navigate('/login');
          return;
        }

        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('vendor_id', userId)
          .single();
        
        if (vendorError) {
          console.error('Error fetching vendor data:', vendorError);
          setError('Failed to load vendor profile. Please try again.');
          setIsLoading(false);
          return;
        }

        if (vendor) {
          const categories = vendor.service_type ? vendor.service_type.split(',').map(s => s.trim()) : [];
          
          setVendorData({
            name: vendor.name || '',
            businessName: vendor.business_name || '',
            phone: vendor.contact_number || '',
            description: vendor.description || '',
            categories: categories,
            profilePicture: vendor.profile_picture || null
          });
        }
      } catch (error) {
        console.error('Error in fetchVendorData:', error);
        setError('An error occurred while loading your profile.');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchVendorData();
    } else {
      navigate('/login');
    }
  }, [session, navigate]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading vendor information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  // Helper function to capitalize the first letter of each word
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get the vendor's services with proper capitalization
  const vendorServices = vendorData.categories.map(service => ({
    original: service,
    display: capitalizeFirstLetter(service)
  }));

  return (
    <div className="vendor-services-container">
      <div style={{ marginBottom: '20px', textAlign: 'left' }}>
        <button 
          onClick={() => navigate('/vendor-dashboard')} 
          className="back-to-dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 20px',
            backgroundColor: '#FFB6C1', /* Peach color */
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#FFA07A';
            e.currentTarget.style.transform = 'translateX(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#FFB6C1';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
          }}
        >
          <span style={{ marginRight: '8px', fontSize: '16px' }}>←</span> Back to Dashboard
        </button>
      </div>
      <div className="vendor-profile-card">
        <div className="profile-header">
          <div 
            className="profile-picture-container"
            onClick={() => vendorData.profilePicture && setShowImageModal(true)}
            style={{ cursor: vendorData.profilePicture ? 'pointer' : 'default' }}
          >
            {vendorData.profilePicture ? (
              <img 
                src={vendorData.profilePicture} 
                alt={`${vendorData.name}'s profile`} 
                className="profile-picture"
                style={{ transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            ) : (
              <div className="profile-picture-placeholder">
                {vendorData.name ? vendorData.name.charAt(0).toUpperCase() : 'V'}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1 className="vendor-name">{vendorData.name || 'Vendor'}</h1>
            <h2 className="business-name">{vendorData.businessName || 'Business Name'}</h2>
            {vendorData.phone && (
              <div className="contact-info">
                <span className="contact-label">Contact:</span> {vendorData.phone}
              </div>
            )}
            {vendorServices.length > 0 && (
              <div className="categories">
                <span className="categories-label">Services: </span>
                {vendorServices.map((service, index) => (
                  <span key={index}>
                    {service.display}
                    {index < vendorServices.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {vendorData.description && (
          <div className="profile-description">
            <h3>About</h3>
            <div className="description-text">
              {vendorData.description.split('\n').map((paragraph, index) => 
                paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="services-section">
        <h2>My Services</h2>
        <div className="services-content">
          {vendorData.categories.length > 0 ? (
            <>
              {console.log('Vendor categories array:', JSON.stringify(vendorData.categories, null, 2))}
              {console.log('Should render CateringService:', vendorData.categories.some(cat => cat.trim().toLowerCase() === 'catering'))}
              {vendorData.categories.some(cat => cat.trim().toLowerCase() === 'photography') && (
                <PhotographyService vendorId={session?.user?.id} />
              )}
              {vendorData.categories.some(cat => cat.trim().toLowerCase() === 'catering') && (
                <div data-testid="catering-service-container">
                  <CateringService vendorId={session?.user?.id} />
                </div>
              )}
              {/* Add more service components here as needed */}
            </>
          ) : (
            <div className="no-services">
              <p>You haven't added any services yet.</p>
              <button 
                onClick={() => navigate('/edit-vendor-profile')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  backgroundColor: '#FFB6C1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  marginTop: '10px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFA07A';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFB6C1';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                }}
              >
                <i className="fas fa-plus" style={{ marginRight: '8px' }}></i> Add Services to Your Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Picture Modal */}
      {showImageModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowImageModal(false);
              }}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                zIndex: 1001
              }}
            >
              ✕
            </button>
            {vendorData.profilePicture && (
              <img 
                src={vendorData.profilePicture} 
                alt="Profile Preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '80vh',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorServices;
