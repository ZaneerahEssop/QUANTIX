import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../client';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import './MusicService.css'; // You will create this CSS file next

// Simple Text Editor Component (Can be reused or imported from a shared location)
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
      case 'bold':
        newValue = value.substring(0, start) + `**${selectedText}**` + value.substring(end);
        newCursorPos = selectedText ? end + 4 : start + 2;
        break;
      case 'italic':
        newValue = value.substring(0, start) + `*${selectedText}*` + value.substring(end);
        newCursorPos = selectedText ? end + 2 : start + 1;
        break;
      case 'bullet':
        newValue = value.substring(0, start) + `- ${selectedText}` + value.substring(end);
        newCursorPos = selectedText ? end + 2 : start + 2;
        break;
      case 'number':
        newValue = value.substring(0, start) + `1. ${selectedText}` + value.substring(end);
        newCursorPos = selectedText ? end + 3 : start + 3;
        break;
      default:
        return;
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
      <textarea
        ref={textareaRef}
        className="simple-textarea"
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        style={{ minHeight: height }}
      />
    </div>
  );
};


const MusicService = ({ vendorId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const [formData, setFormData] = useState({
    service_description: '',
    music_genres: '',
    services_offered: '',
    equipment_provided: '',
    base_rate: '',
    additional_rates: ''
  });

  const showToast = (message, type = 'info') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 5000);
  };

  const closeToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(null);
  };

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  const fetchMusicData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_services')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'music')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData({
          service_description: data.service_description || '',
          music_genres: data.music_genres || '',
          services_offered: data.services_offered || '',
          equipment_provided: data.equipment_provided || '',
          base_rate: data.base_rate || '',
          additional_rates: data.additional_rates || ''
        });
        setPhotos(data.photos || []);
      } else {
        setFormData({
          service_description: '',
          music_genres: '',
          services_offered: '',
          equipment_provided: '',
          base_rate: '',
          additional_rates: ''
        });
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error fetching music data:', error);
      showToast('Error loading music data. Please refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchMusicData();
  }, [vendorId, fetchMusicData]);

  const handleChange = (value, field) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        ...formData,
        vendor_id: vendorId,
        service_type: 'music',
        photos: photos,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('vendor_services')
        .upsert(serviceData, { onConflict: 'vendor_id, service_type' });

      if (error) throw error;

      setIsEditing(false);
      showToast('Music service saved successfully!', 'success');
      fetchMusicData();
    } catch (error) {
      console.error('Error saving music service:', error);
      showToast(`Failed to save music service: ${error.message}`, 'error');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size too large. Maximum is 5MB.', 'error');
      return;
    }
    
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to upload photos.');

      const filePath = `${user.id}/music/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-photos')
        .getPublicUrl(filePath);

      const newPhoto = { url: publicUrl, path: filePath };
      const updatedPhotos = [...photos, newPhoto];

      const { error: updateError } = await supabase
        .from('vendor_services')
        .upsert({
            vendor_id: vendorId,
            service_type: 'music',
            photos: updatedPhotos,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'vendor_id, service_type' });

      if (updateError) throw updateError;
      
      setPhotos(updatedPhotos);
      showToast('Photo uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Failed to upload photo. Please try again.', 'error');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };
  
  const handleDeletePhoto = async (photoUrl) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      const photoToDelete = photos.find(p => p.url === photoUrl);
      if (!photoToDelete) throw new Error('Photo not found');

      const { error: deleteError } = await supabase.storage
        .from('portfolio-photos')
        .remove([photoToDelete.path]);

      if (deleteError) throw deleteError;

      const updatedPhotos = photos.filter(p => p.url !== photoUrl);
      const { error: updateError } = await supabase
        .from('vendor_services')
        .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
        .eq('vendor_id', vendorId)
        .eq('service_type', 'music');
      
      if (updateError) throw updateError;

      setPhotos(updatedPhotos);
      showToast('Photo deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting photo:', error);
      showToast('Failed to delete photo. Please try again.', 'error');
    }
  };

  const ToastNotification = () => {
    if (!toast) return null;
    const iconMap = {
      success: <FaCheckCircle className="toast-icon" />,
      error: <FaTimesCircle className="toast-icon" />,
      info: <FaInfoCircle className="toast-icon" />
    };
    return (
      <div className={`toast-notification ${toast.type}`}>
        {iconMap[toast.type]}
        <span className="toast-message">{toast.message}</span>
        <button onClick={closeToast} className="toast-close">&times;</button>
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading">Loading music services...</div>;
  }

  return (
    <div className="music-service">
      {toast && <ToastNotification />}
      <div className="service-content">
        <div className="service-header">
          <h3>Music Service</h3>
          {isEditing ? (
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={() => { setIsEditing(false); fetchMusicData(); }}>Cancel</button>
              <button type="submit" className="save-button" form="service-form">Save Changes</button>
            </div>
          ) : (
            <button type="button" className="edit-button" onClick={() => setIsEditing(true)}>Edit Service</button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} id="service-form" className="service-form">
            <div className="rich-text-group">
              <label>Service Description</label>
              <SimpleTextEditor value={formData.service_description} onChange={(v) => handleChange(v, 'service_description')} placeholder="Describe your music and performance style..."/>
            </div>
            <div className="rich-text-group">
              <label>Music Genres</label>
              <SimpleTextEditor value={formData.music_genres} onChange={(v) => handleChange(v, 'music_genres')} placeholder="e.g., Pop, Rock, Jazz, Hip Hop, Electronic..."/>
            </div>
            <div className="rich-text-group">
              <label>Services Offered</label>
              <SimpleTextEditor value={formData.services_offered} onChange={(v) => handleChange(v, 'services_offered')} placeholder="e.g., DJ Services, Live Band, MC Services, Ceremony Music..."/>
            </div>
            <div className="rich-text-group">
              <label>Equipment Provided</label>
              <SimpleTextEditor value={formData.equipment_provided} onChange={(v) => handleChange(v, 'equipment_provided')} placeholder="List key equipment you provide e.g., Full PA System, DJ Decks, Lighting..."/>
            </div>
            <div className="rich-text-group">
              <label>Base Rate</label>
              <SimpleTextEditor
                value={formData.base_rate}
                onChange={(v) => handleChange(v, 'base_rate')}
                placeholder="e.g., DJ packages from R6000, Live band from R15000..."
                height="100px"
              />
            </div>
            <div className="rich-text-group">
              <label>Additional Pricing & Packages</label>
              <SimpleTextEditor
                value={formData.additional_rates}
                onChange={(v) => handleChange(v, 'additional_rates')}
                placeholder="List any overtime rates, travel fees, or special packages..."
              />
            </div>
          </form>
        ) : (
          <div className="service-details">
            <div className="service-section"><h4>Service Description</h4><div className="markdown-content"><ReactMarkdown>{formData.service_description || 'No description provided.'}</ReactMarkdown></div></div>
            <div className="service-section"><h4>Music Genres</h4><div className="markdown-content"><ReactMarkdown>{formData.music_genres || 'No genres listed.'}</ReactMarkdown></div></div>
            <div className="service-section"><h4>Services Offered</h4><div className="markdown-content"><ReactMarkdown>{formData.services_offered || 'No services listed.'}</ReactMarkdown></div></div>
            <div className="service-section"><h4>Equipment Provided</h4><div className="markdown-content"><ReactMarkdown>{formData.equipment_provided || 'No equipment information provided.'}</ReactMarkdown></div></div>
            <div className="service-section">
              <h4>Pricing</h4>
              <h5>Base Rate</h5>
              <div className="markdown-content">
                <ReactMarkdown>{formData.base_rate || 'No base rate specified.'}</ReactMarkdown>
              </div>
              {formData.additional_rates && (
                <>
                  <h5 style={{ marginTop: '15px' }}>Additional Rates & Packages</h5>
                  <div className="markdown-content">
                    <ReactMarkdown>{formData.additional_rates}</ReactMarkdown>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="service-images">
        <h4>Promo Gallery</h4>
        <div className="portfolio-grid">
          {photos && photos.length > 0 ? (
            photos.map((photo) => (
              <div key={photo.url} className="portfolio-photo">
                <img src={photo.url} alt="Music performance" loading="lazy"/>
                {isEditing && (<button className="delete-photo" onClick={() => handleDeletePhoto(photo.url)}>&times;</button>)}
              </div>
            ))
          ) : (
            <div className="no-photos-container"><span className="no-photos">No promo photos added yet</span></div>
          )}
        </div>

        {isEditing && (
          <div className="photo-upload">
            <input type="file" id="music-photo-upload" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} style={{ display: 'none' }}/>
            <label htmlFor="music-photo-upload" className="upload-button">{uploading ? 'Uploading...' : 'Add Photo to Gallery'}</label>
            <p className="upload-hint">Upload promo photos or pictures from past events.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicService;