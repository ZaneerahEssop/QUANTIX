import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../client';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import './DecorService.css';

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


const DecorService = ({ vendorId, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const [formData, setFormData] = useState({
    service_description: '',
    decor_styles: '',
    services_offered: '',
    rental_inventory: '',
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

  const fetchDecorData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_services')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'decor')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData({
          service_description: data.service_description || '',
          decor_styles: data.decor_styles || '',
          services_offered: data.services_offered || '',
          rental_inventory: data.rental_inventory || '',
          base_rate: data.base_rate || '',
          additional_rates: data.additional_rates || ''
        });
        setPhotos(data.photos || []);
      } else {
        setFormData({
          service_description: '',
          decor_styles: '',
          services_offered: '',
          rental_inventory: '',
          base_rate: '',
          additional_rates: ''
        });
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error fetching decor data:', error);
      showToast('Error loading decor data. Please refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchDecorData();
  }, [vendorId, fetchDecorData]);

  const handleChange = (value, field) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        ...formData,
        vendor_id: vendorId,
        service_type: 'decor',
        photos: photos,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('vendor_services')
        .upsert(serviceData, { onConflict: 'vendor_id, service_type' });

      if (error) throw error;

      setIsEditing(false);
      showToast('Decor service saved successfully!', 'success');
      fetchDecorData();
    } catch (error) {
      console.error('Error saving decor service:', error);
      showToast(`Failed to save decor service: ${error.message}`, 'error');
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

      const filePath = `${user.id}/decor/${Date.now()}-${file.name}`;

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
            service_type: 'decor',
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
        .eq('service_type', 'decor');
      
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
    return <div className="loading">Loading decor services...</div>;
  }

  return (
    <div className="decor-service">
      {toast && <ToastNotification />}
      <div className="service-content">
        <div className="service-header">
          <h3>Decor Service</h3>
          {isEditing ? (
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={() => { setIsEditing(false); fetchDecorData(); }}>Cancel</button>
              <button type="submit" className="save-button" form="service-form">Save Changes</button>
            </div>
          ) : !isReadOnly && (
            <button type="button" className="edit-button" onClick={() => setIsEditing(true)}>Edit Service</button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} id="service-form" className="service-form">
            <div className="rich-text-group">
              <label>Service Description</label>
              <SimpleTextEditor value={formData.service_description} onChange={(v) => handleChange(v, 'service_description')} placeholder="Describe your decor and styling services..."/>
            </div>
            <div className="rich-text-group">
              <label>Decor Styles</label>
              <SimpleTextEditor value={formData.decor_styles} onChange={(v) => handleChange(v, 'decor_styles')} placeholder="e.g., Modern, Rustic, Bohemian, Classic..."/>
            </div>
            <div className="rich-text-group">
              <label>Services Offered</label>
              <SimpleTextEditor value={formData.services_offered} onChange={(v) => handleChange(v, 'services_offered')} placeholder="e.g., Full Event Design, Draping, Lighting..."/>
            </div>
            <div className="rich-text-group">
              <label>Rental Inventory</label>
              <SimpleTextEditor value={formData.rental_inventory} onChange={(v) => handleChange(v, 'rental_inventory')} placeholder="List key items from your inventory e.g., Furniture, Linens, Arches..."/>
            </div>
            <div className="rich-text-group">
              <label>Base Rate</label>
              <SimpleTextEditor
                value={formData.base_rate}
                onChange={(v) => handleChange(v, 'base_rate')}
                placeholder="e.g., Styling services from R5000, Minimum rental order... "
                height="100px"
              />
            </div>
            <div className="rich-text-group">
              <label>Additional Pricing & Packages</label>
              <SimpleTextEditor
                value={formData.additional_rates}
                onChange={(v) => handleChange(v, 'additional_rates')}
                placeholder="List any full packages, consultation fees, or special offers..."
              />
            </div>
          </form>
        ) : (
          <div className="service-details">
            <div className="service-section"><h4>Service Description</h4><div className="markdown-content"><ReactMarkdown>{formData.service_description || 'No description provided.'}</ReactMarkdown></div></div>
            <div className="service-section"><h4>Decor Styles</h4><div className="markdown-content"><ReactMarkdown>{formData.decor_styles || 'No styles listed.'}</ReactMarkdown></div></div>
            <div className="service-section"><h4>Services Offered</h4><div className="markdown-content"><ReactMarkdown>{formData.services_offered || 'No services listed.'}</ReactMarkdown></div></div>
            <div className="service-section"><h4>Rental Inventory</h4><div className="markdown-content"><ReactMarkdown>{formData.rental_inventory || 'No inventory information provided.'}</ReactMarkdown></div></div>
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
        <h4>Decor Gallery</h4>
        <div className="portfolio-grid">
          {photos && photos.length > 0 ? (
            photos.map((photo) => (
              <div key={photo.url} className="portfolio-photo">
                <img src={photo.url} alt="Decor setup" loading="lazy"/>
                {isEditing && (<button className="delete-photo" onClick={() => handleDeletePhoto(photo.url)}>&times;</button>)}
              </div>
            ))
          ) : (
            <div className="no-photos-container"><span className="no-photos">No decor photos added yet</span></div>
          )}
        </div>

        {isEditing && (
          <div className="photo-upload">
            <input type="file" id="decor-photo-upload" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} style={{ display: 'none' }}/>
            <label htmlFor="decor-photo-upload" className="upload-button">{uploading ? 'Uploading...' : 'Add Photo to Gallery'}</label>
            <p className="upload-hint">Upload high-quality images of your past events.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecorService;