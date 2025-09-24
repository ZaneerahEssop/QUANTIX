import React, { useState, useEffect, useCallback } from 'react';
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

// StarRating component for displaying and selecting ratings
const StarRating = ({ rating, onRatingChange, readOnly = false }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className={`star-rating ${readOnly ? 'read-only' : ''}`}>
      {stars.map((star) => (
        <span
          key={star}
          className={star <= rating ? 'filled' : 'empty'}
          onClick={() => !readOnly && onRatingChange(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const VendorServices = ({ session }) => {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [vendorData, setVendorData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  
  // State for reviews
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  const loggedInUserId = session?.user?.id;
  const targetVendorId = vendorId || loggedInUserId;
  const isOwner = loggedInUserId === targetVendorId;
  const isPlannerView = !isOwner;

  const fetchReviews = useCallback(async () => {
    if (!targetVendorId) return;
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          created_at,
          rating,
          comment,
          planner:planners(name)
        `)
        .eq('vendor_id', targetVendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setReviews(data);
        if (data.length > 0) {
          const totalRating = data.reduce((acc, review) => acc + review.rating, 0);
          setAverageRating(totalRating / data.length);
        } else {
          setAverageRating(0);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, [targetVendorId]);

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!targetVendorId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data: vendors, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('vendor_id', targetVendorId);
        
        if (vendorError) throw vendorError;

        if (vendors && vendors.length > 0) {
          const vendor = vendors[0];
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
          setError('Vendor profile not found.');
        }
      } catch (err) {
        setError('An error occurred while loading the profile.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorData();
    fetchReviews();
  }, [targetVendorId, navigate, fetchReviews]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (userRating === 0 || !userComment.trim()) {
      alert('Please select a rating and write a comment.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        vendor_id: targetVendorId,
        planner_id: loggedInUserId,
        rating: userRating,
        comment: userComment,
      });

      if (error) throw error;
      
      setUserRating(0);
      setUserComment('');
      await fetchReviews();

    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. You may have already reviewed this vendor.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  const vendorServices = vendorData.categories.map(service => ({
    original: service,
    display: capitalizeFirstLetter(service)
  }));
  const isReadOnly = !isOwner;

  return (
    <div className="vendor-services-container">
      <div className="vendor-services-content-wrapper">

        {isOwner && (
          <div className="back-button-container">
            <button 
              onClick={() => navigate('/vendor-dashboard')} 
              className="back-to-dashboard"
            >
              <span style={{ marginRight: '8px', fontSize: '16px' }}>←</span> Back to Dashboard
            </button>
          </div>
        )}
      
        <div className={`profile-reviews-container ${isOwner ? 'centered-profile' : ''}`}>
          <div className="vendor-profile-card content-card">
            {/* Top part: Picture and Name/Business Name */}
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
              </div>
            </div>

            {/* Bottom part: Contact, Categories, and About */}
            <div className="profile-details-bottom">
              <div className="details-grid">
                {vendorData.phone && (
                  <div className="contact-info">
                    <span className="contact-label">Contact:</span> {vendorData.phone}
                  </div>
                )}
                {vendorServices.length > 0 && (
                  <div className="service-tags-container">
                    <span className="contact-label">Services: </span>
                    <div className="tags-wrapper">
                      {vendorServices.map((service, index) => (
                        <span key={index} className="service-tag">
                          {service.display}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
          </div>

          {isPlannerView && (
            <div className="reviews-card">
              <h3>Reviews</h3>
              <div className="average-rating-section">
                <span className="average-rating-value">{averageRating.toFixed(1)}</span>
                <StarRating rating={averageRating} readOnly={true} />
                <span className="review-count">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
              </div>
              
              <form onSubmit={handleReviewSubmit} className="review-form">
                <h4>Leave a Review</h4>
                <StarRating rating={userRating} onRatingChange={setUserRating} />
                <textarea
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="Share your experience..."
                  required
                />
                <button type="submit" disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
              
              <div className="reviews-list">
                {reviews.length > 0 ? (
                  reviews.map(review => (
                    <div key={review.id} className="review-item">
                      <StarRating rating={review.rating} readOnly={true} />
                      <p className="review-comment">{review.comment}</p>
                      <small className="review-author">
                        - {review.planner?.name || 'A Planner'} on {new Date(review.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>No reviews yet. Be the first!</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="services-section content-card">
          <h2>{isOwner ? 'My Services' : 'Services Offered'}</h2>
          <div className="services-content">
            {vendorData.categories.length > 0 ? (
              <>
                {vendorData.categories.includes('photography') && (<PhotographyService vendorId={targetVendorId} isReadOnly={isReadOnly} />)}
                {vendorData.categories.includes('catering') && (<CateringService vendorId={targetVendorId} isReadOnly={isReadOnly} />)}
                {vendorData.categories.includes('flowers') && (<FlowerService vendorId={targetVendorId} isReadOnly={isReadOnly} />)}
                {vendorData.categories.includes('decor') && (<DecorService vendorId={targetVendorId} isReadOnly={isReadOnly} />)}
                {vendorData.categories.includes('music') && (<MusicService vendorId={targetVendorId} isReadOnly={isReadOnly} />)}
                {vendorData.categories.includes('venue') && (<VenueService vendorId={targetVendorId} venueNames={vendorData.venue_names} isReadOnly={isReadOnly}/>)}
              </>
            ) : (
              <div className="no-services">
                {isOwner ? (
                  <>
                    <p>You haven't added any services yet.</p>
                    <button onClick={() => navigate('/edit-vendor-profile')} className="primary-button">
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