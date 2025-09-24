import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../client';
import './VenueService.css';

// Reusable SimpleTextEditor component (unchanged)
const SimpleTextEditor = ({ value, onChange, placeholder, height = '150px' }) => {
  const textareaRef = useRef(null);
  
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const applyFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    let newValue = value;
    let newCursorPos = end;
    switch(format) {
      case 'bold': newValue = `${value.substring(0, start)}**${selectedText}**${value.substring(end)}`; newCursorPos = selectedText ? end + 4 : start + 2; break;
      case 'italic': newValue = `${value.substring(0, start)}*${selectedText}*${value.substring(end)}`; newCursorPos = selectedText ? end + 2 : start + 1; break;
      case 'bullet': newValue = `${value.substring(0, start)}- ${selectedText}${value.substring(end)}`; newCursorPos = selectedText ? end + 2 : start + 2; break;
      case 'number': newValue = `${value.substring(0, start)}1. ${selectedText}${value.substring(end)}`; newCursorPos = selectedText ? end + 3 : start + 3; break;
      default: return;
    }
    onChange(newValue);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  };

  return (
    <div className="text-editor-wrapper">
      <div className="editor-toolbar">
        <button type="button" onClick={() => applyFormat('bold')} title="Bold" className="format-button"><strong>B</strong></button>
        <button type="button" onClick={() => applyFormat('italic')} title="Italic" className="format-button"><em>I</em></button>
        <button type="button" onClick={() => applyFormat('bullet')} title="Bullet List" className="format-button">•</button>
        <button type="button" onClick={() => applyFormat('number')} title="Numbered List" className="format-button">1.</button>
      </div>
      <textarea ref={textareaRef} className="simple-textarea" value={value || ''} onChange={handleChange} placeholder={placeholder} style={{ minHeight: height }} />
    </div>
  );
};


const VenueService = ({ vendorId, venueNames, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceId, setServiceId] = useState(null);
  const [venues, setVenues] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const showToast = (message, type = 'info') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 5001);
  };

  const closeToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(null);
  };

  useEffect(() => () => { if (toastTimeout.current) clearTimeout(toastTimeout.current); }, []);

  // ✨ CHANGED: This function has been completely refactored to be read-only
  const fetchAndReconcileData = useCallback(async () => {
    if (!vendorId || !venueNames || venueNames.length === 0) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    try {
        // Step 1: ONLY READ from vendor_services to get the service ID.
        // We no longer use .upsert() here.
        const { data: serviceData, error: serviceError } = await supabase
            .from('vendor_services')
            .select('id')
            .eq('vendor_id', vendorId)
            .eq('service_type', 'venue')
            .maybeSingle(); // Use maybeSingle() to handle cases where the record doesn't exist without throwing an error.

        if (serviceError) throw serviceError;

        // If no service record exists, the vendor hasn't set up this service yet.
        // We can just show an empty state.
        if (!serviceData) {
            setVenues([]);
            setIsLoading(false);
            return;
        }
        
        const currentServiceId = serviceData.id;
        setServiceId(currentServiceId);

        // Step 2: Fetch venue details from the 'venues' table.
        const { data: existingVenues, error: venuesError } = await supabase
            .from('venues')
            .select('*')
            .eq('service_id', currentServiceId);
        if (venuesError) throw venuesError;
        
        // Step 3: Reconcile the data just like before.
        const reconciledVenues = venueNames.map(name => {
            const existing = existingVenues.find(v => v.name === name);
            return existing || {
                name: name,
                description: '',
                capacity: '',
                base_rate: '',
                additional_charges: '',
                photos: [],
                service_id: currentServiceId,
            };
        });

        setVenues(reconciledVenues);
    } catch (error) {
        console.error("Error fetching or reconciling venue data:", error);
        showToast('Error loading venue data.', 'error');
    } finally {
        setIsLoading(false);
    }
  }, [vendorId, venueNames]);

  useEffect(() => {
    fetchAndReconcileData();
  }, [fetchAndReconcileData]);

  const handleVenueChange = (index, field, value) => {
    const updatedVenues = [...venues];
    updatedVenues[index][field] = value;
    setVenues(updatedVenues);
  };
  
  const handlePhotoUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Uploading photo...', 'info');
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('You must be logged in.');

        const filePath = `${user.id}/venues/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('portfolio-photos').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('portfolio-photos').getPublicUrl(filePath);
        const newPhoto = { url: publicUrl, path: filePath };

        const updatedVenues = [...venues];
        updatedVenues[index].photos = [...(updatedVenues[index].photos || []), newPhoto];
        setVenues(updatedVenues);
        showToast('Photo uploaded!', 'success');
    } catch (error) {
        showToast(`Upload failed: ${error.message}`, 'error');
    }
  };

  const handleDeletePhoto = (venueIndex, photoIndex) => {
    const updatedVenues = [...venues];
    updatedVenues[venueIndex].photos.splice(photoIndex, 1);
    setVenues(updatedVenues);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const venuesToSave = venues.map(venue => ({ ...venue, service_id: serviceId }));
      const { error } = await supabase.from('venues').upsert(venuesToSave, { onConflict: 'service_id, name' });
      if (error) throw error;
      
      showToast('Venue information saved successfully!', 'success');
      setIsEditing(false);
      fetchAndReconcileData();
    } catch (error) {
      console.error('Error saving venue data:', error);
      showToast(`Failed to save: ${error.message}`, 'error');
    }
  };

  if (isLoading) {
    return <div className="loading">Loading venue information...</div>;
  }
  
  if (!venueNames || venueNames.length === 0) {
    return (
        <div className="venue-service-container">
            <div className="service-header"><h3>Venue Services</h3></div>
            {isReadOnly ? (
              <p>This vendor has not listed any specific venues in their profile.</p>
            ) : (
              <p>You have not listed any venues in your profile. Please edit your main profile to add your venue names first.</p>
            )}
        </div>
    );
  }

  return (
    <div className="venue-service-container">
      {toast && <div className={`toast-notification ${toast.type}`}><span className="toast-message">{toast.message}</span><button onClick={closeToast} className="toast-close">&times;</button></div>}
      <form onSubmit={handleSubmit} id="venue-service-form">
        <div className="service-header">
          <h3>Venue Details</h3>
          {isEditing ? (
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={() => { setIsEditing(false); fetchAndReconcileData(); }}>Cancel</button>
              <button type="submit" className="save-button">Save Changes</button>
            </div>
          ) : !isReadOnly && (
            <button type="button" className="edit-button" onClick={() => setIsEditing(true)}>Edit Details</button>
          )}
        </div>
        
        {venues.map((venue, index) => (
          <div key={venue.name} className="venue-card">
            <h3 className="venue-card-title">{venue.name}</h3>
            <div className="venue-details">
                {/* Left Side: Details */}
                <div className="venue-info">
                    {isEditing ? (
                        <>
                            <div className="form-group"><label>Description</label><SimpleTextEditor height="120px" value={venue.description} onChange={(val) => handleVenueChange(index, 'description', val)} placeholder="Describe this specific venue..."/></div>
                            <div className="form-group"><label>Capacity</label><input type="text" className="venue-input" value={venue.capacity} onChange={(e) => handleVenueChange(index, 'capacity', e.target.value)} placeholder="e.g., 150 Seated, 200 Standing"/></div>
                            <div className="form-group"><label>Base Rate</label><SimpleTextEditor height="100px" value={venue.base_rate} onChange={(val) => handleVenueChange(index, 'base_rate', val)} placeholder="e.g., R20,000 hire fee for a full day..."/></div>
                            <div className="form-group"><label>Additional Charges</label><SimpleTextEditor height="100px" value={venue.additional_charges} onChange={(val) => handleVenueChange(index, 'additional_charges', val)} placeholder="e.g., Security fee, Corkage fee..."/></div>
                        </>
                    ) : (
                        <>
                            <div className="service-section"><h4>Description</h4><div className="markdown-content"><ReactMarkdown>{venue.description || 'No details provided.'}</ReactMarkdown></div></div>
                            <div className="service-section"><h4>Capacity</h4><p>{venue.capacity || 'No details provided.'}</p></div>
                            <div className="service-section"><h4>Base Rate</h4><div className="markdown-content"><ReactMarkdown>{venue.base_rate || 'No details provided.'}</ReactMarkdown></div></div>
                            <div className="service-section"><h4>Additional Charges</h4><div className="markdown-content"><ReactMarkdown>{venue.additional_charges || 'No details provided.'}</ReactMarkdown></div></div>
                        </>
                    )}
                </div>
                {/* Right Side: Photos */}
                <div className="venue-photos">
                    <h4>Venue Images</h4>
                    <div className="venue-photo-grid">
                        {venue.photos && venue.photos.map((photo, photoIndex) => (
                            <div key={photo.url || photoIndex} className="portfolio-photo">
                                <img src={photo.url} alt={`Venue ${index + 1}`} />
                                {isEditing && <button type="button" className="delete-photo" onClick={() => handleDeletePhoto(index, photoIndex)}>&times;</button>}
                            </div>
                        ))}
                         {(!venue.photos || venue.photos.length === 0) && !isEditing && (
                            <div className="no-photos-container"><span className="no-photos">No images yet</span></div>
                         )}
                    </div>
                    {isEditing && (
                        <div className="photo-upload">
                            <input type="file" id={`venue-photo-upload-${index}`} accept="image/*" onChange={(e) => handlePhotoUpload(e, index)} style={{ display: 'none' }} />
                            <label htmlFor={`venue-photo-upload-${index}`} className="upload-button-small">Add Image</label>
                        </div>
                    )}
                </div>
            </div>
          </div>
        ))}
      </form>
    </div>
  );
};

export default VenueService;