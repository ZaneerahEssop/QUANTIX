import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../client';
import '../ProfileForm.css';
import '../App.css';
import '../styling/VendorServices.css';
import PhotographyService from '../components/services/PhotographyService';
import CateringService from '../components/services/CateringService';
import FlowerService from '../components/services/FlowerService';
import DecorService from '../components/services/DecorService';
import MusicService from '../components/services/MusicService';
import VenueService from '../components/services/VenueService';

const VendorServices = ({ session }) => {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [vendorData, setVendorData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  
  const loggedInUserId = session?.user?.id;
  const targetVendorId = vendorId || loggedInUserId;
  const isOwner = loggedInUserId === targetVendorId;

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!targetVendorId) {
        setError('User not authenticated or vendor not specified.');
        setIsLoading(false);
        navigate('/login');
        return;
      }

      try {
        // Fetches an array of vendors instead of a single object to prevent errors
        const { data: vendors, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('vendor_id', targetVendorId);
        
        if (vendorError) {
          throw vendorError;
        }

        // Checks if the returned array contains any vendors
        if (vendors && vendors.length > 0) {
          const vendor = vendors[0]; // Use the first record found
          const categories = vendor.service_type ? vendor.service_type.toLowerCase().split(',').map(s => s.trim()) : [];
          
          setVendorData({
            name: vendor.name || '',
            businessName: vendor.business_name || '',
            phone: vendor.contact_number || '',
            description: vendor.description || '',
            categories: categories,
            profilePicture: vendor.profile_picture || null,
            venue_names: vendor.venue_names || []
          });
        } else {
          // If no vendors are found, set a clear error message
          setError('Vendor profile not found.');
        }
      } catch (error) {
        console.error('Error in fetchVendorData:', error);
        setError('An error occurred while loading the profile.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorData();
  }, [targetVendorId, navigate]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading vendor information...</p>
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div className="error-container">
        <p className="error-message">{error || 'Could not load vendor data.'}</p>
        <button onClick={() => navigate('/dashboard')} className="retry-button">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const vendorServices = vendorData.categories.map(service => ({
    original: service,
    display: capitalizeFirstLetter(service)
  }));

  const isReadOnly = !isOwner;

  return (
    <div className="vendor-services-container">
      {isOwner && (
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <button 
            onClick={() => navigate('/vendor-dashboard')} 
            className="back-to-dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', padding: '10px 20px',
              backgroundColor: '#FFB6C1', color: 'white', border: 'none', borderRadius: '25px',
              cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.3s ease',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ marginRight: '8px', fontSize: '16px' }}>←</span> Back to Dashboard
          </button>
        </div>
      )}
      <div className="vendor-profile-card">
        <div className="profile-header">
          <div 
            className="profile-picture-container"
            onClick={() => vendorData.profilePicture && setShowImageModal(true)}
            style={{ cursor: vendorData.profilePicture ? 'pointer' : 'default' }}
          >
            {vendorData.profilePicture ? (
              <img src={vendorData.profilePicture} alt={`${vendorData.name}'s profile`} className="profile-picture"/>
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
        <h2>{isOwner ? 'My Services' : 'Services Offered'}</h2>
        <div className="services-content">
          {vendorData.categories.length > 0 ? (
            <>
              {vendorData.categories.includes('photography') && (
                <PhotographyService vendorId={targetVendorId} isReadOnly={isReadOnly} />
              )}
              {vendorData.categories.includes('catering') && (
                <CateringService vendorId={targetVendorId} isReadOnly={isReadOnly} />
              )}
              {vendorData.categories.includes('flowers') && (
                <FlowerService vendorId={targetVendorId} isReadOnly={isReadOnly} />
              )}
              {vendorData.categories.includes('decor') && (
                <DecorService vendorId={targetVendorId} isReadOnly={isReadOnly} />
              )}
              {vendorData.categories.includes('music') && (
                <MusicService vendorId={targetVendorId} isReadOnly={isReadOnly} />
              )}
              {vendorData.categories.includes('venue') && (
                <VenueService 
                  vendorId={targetVendorId} 
                  venueNames={vendorData.venue_names} 
                  isReadOnly={isReadOnly}
                />
              )}
            </>
          ) : (
            <div className="no-services">
              {isOwner ? (
                <>
                  <p>You haven't added any services yet.</p>
                  <button 
                    onClick={() => navigate('/edit-vendor-profile')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', padding: '10px 20px',
                      backgroundColor: '#FFB6C1', color: 'white', border: 'none', borderRadius: '25px',
                      cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.3s ease',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginTop: '10px'
                    }}
                  >
                    Add Services to Your Profile
                  </button>
                </>
              ) : (
                <p>{vendorData.businessName} has not listed any specific services yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {showImageModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowImageModal(false); }}
              style={{
                position: 'absolute', top: '-40px', right: '0', background: 'none',
                border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer',
                padding: '8px', zIndex: 1001
              }}
            >
              ✕
            </button>
            {vendorData.profilePicture && (
              <img src={vendorData.profilePicture} alt="Profile Preview" style={{ 
                  maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px',
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