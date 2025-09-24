import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../client';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import './CateringService.css';

// Simple Text Editor Component
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
        <button 
          type="button" 
          onClick={() => applyFormat('bold')} 
          title="Bold" 
          className="format-button"
        >
          <strong>B</strong>
        </button>
        <button 
          type="button" 
          onClick={() => applyFormat('italic')} 
          title="Italic" 
          className="format-button"
        >
          <em>I</em>
        </button>
        <button 
          type="button" 
          onClick={() => applyFormat('bullet')} 
          title="Bullet List" 
          className="format-button"
        >
          •
        </button>
        <button 
          type="button" 
          onClick={() => applyFormat('number')} 
          title="Numbered List" 
          className="format-button"
        >
          1.
        </button>
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

const CateringService = ({ vendorId, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    service_description: '',
    catering_types: '',
    menu_options: '',
    dietary_options: '',
    base_rate: '',
    additional_rates: ''
  });

  // Show toast notification
  const showToast = (message, type = 'info') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 5000);
  };

  // Close toast manually
  const closeToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(null);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  // Fetch catering service data
  const fetchCateringData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_services')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'catering')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is the code for no rows returned
        throw error;
      }

      if (data) {
        setFormData({
          service_description: data.service_description || '',
          catering_types: data.catering_types || '',
          menu_options: data.menu_options || '',
          dietary_options: data.dietary_options || '',
          base_rate: data.base_rate || '',
          additional_rates: data.additional_rates || ''
        });
        setPhotos(data.photos || []);
      } else {
        // Initialize with empty values if no data found
        setFormData({
          service_description: '',
          catering_types: '',
          menu_options: '',
          dietary_options: '',
          base_rate: '',
          additional_rates: ''
        });
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error in fetchCateringData:', error);
      showToast('Error loading catering data. Please refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]); // Add vendorId as a dependency

  useEffect(() => {
    fetchCateringData();
  }, [vendorId, fetchCateringData]);

  const handleChange = (value, field) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      // Prepare the data to be saved
      const serviceData = {
        vendor_id: vendorId,
        service_type: 'catering',
        service_description: formData.service_description || '',
        catering_types: formData.catering_types || '',
        menu_options: formData.menu_options || '',
        dietary_options: formData.dietary_options || '',
        base_rate: formData.base_rate || '',
        additional_rates: formData.additional_rates || '',
        photos: photos, // Include the photos array
        updated_at: new Date().toISOString()
      };

      // Check if the record exists
      const { data: existingService } = await supabase
        .from('vendor_services')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'catering')
        .single();

      let error;

      if (existingService) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('vendor_services')
          .update(serviceData)
          .eq('id', existingService.id)
          .select()
          .single();

        // Data is saved, no need to store it
        error = updateError;
      } else {
        // Insert new record
        const { error: saveError } = await supabase
          .from('vendor_services')
          .upsert([{
            ...(existingService ? { id: existingService.id } : {}),
            vendor_id: vendorId,
            service_type: 'catering',
            ...formData,
            updated_at: new Date().toISOString()
          }], { onConflict: 'vendor_id,service_type' });

        error = saveError;
      }

      if (error) {
        console.error('Database error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      setIsEditing(false);
      showToast('Catering service saved successfully!', 'success');
      fetchCateringData(); // Refresh data
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      showToast(`Failed to save catering service: ${error.message}`, 'error');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size too large. Maximum size is 5MB.', 'error');
      return;
    }
    
    setUploading(true);

    try {
      // Skip bucket existence check and try to upload directly
      // The RLS policies will handle the permission check

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to upload photos.');
      }

      // Create file path that matches the RLS policy
      // The RLS expects the first folder to be the user's ID
      const filePath = `${user.id}/catering/${Date.now()}-${file.name}`;

      // Upload the file to storage with proper error handling
      const { error: uploadError } = await supabase.storage
        .from('portfolio-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
          metadata: {
            uploaded_by: user.id,
            uploaded_at: new Date().toISOString(),
            vendor_id: vendorId  // Store the vendor ID in metadata for reference
          }
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If the error is about RLS, provide a more helpful message
        if (uploadError.message.includes('row-level security')) {
          throw new Error('Permission denied. Please make sure you are logged in and have the necessary permissions.');
        }
        throw uploadError;
      }

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-photos')
        .getPublicUrl(filePath);

      // 3. Create the new photo object
      const newPhoto = {
        url: publicUrl,
        path: filePath,
        created_at: new Date().toISOString()
      };

      // 4. Get the existing service record
      const { data: existingService } = await supabase
        .from('vendor_services')
        .select('id, photos')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'catering')
        .single();

      const currentPhotos = existingService?.photos || [];
      const updatedPhotos = [...currentPhotos, newPhoto];

      // 5. Update or create the service record with the new photos array
      if (existingService) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('vendor_services')
          .update({ 
            photos: updatedPhotos,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingService.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('vendor_services')
          .insert([{
            vendor_id: vendorId,
            service_type: 'catering',
            photos: updatedPhotos,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      // 6. Update local state
      setPhotos(updatedPhotos);
      e.target.value = null;
      showToast('Photo uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Failed to upload photo. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      // 1. Find the photo in the current photos array to get its path
      const photoToDelete = photos.find(p => p.url === photoUrl);
      if (!photoToDelete) throw new Error('Photo not found');

      // 2. Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('portfolio-photos')
        .remove([photoToDelete.path]);

      if (deleteError) throw deleteError;

      // 3. Get the existing service record
      const { data: existingService, error: fetchError } = await supabase
        .from('vendor_services')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'catering')
        .single();

      if (fetchError) throw fetchError;
      if (!existingService) throw new Error('Service record not found');

      // 4. Update the database to remove the photo
      const updatedPhotos = photos.filter(p => p.url !== photoUrl);
      
      const { error: updateError } = await supabase
        .from('vendor_services')
        .update({ 
          photos: updatedPhotos,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingService.id);

      if (updateError) throw updateError;

      // 5. Update local state
      setPhotos(updatedPhotos);
      showToast('Photo deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting photo:', error);
      showToast('Failed to delete photo. Please try again.', 'error');
    }
  };

  // Toast Notification Component
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
        <button onClick={closeToast} className="toast-close" aria-label="Close notification">
          &times;
        </button>
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading">Loading catering services...</div>;
  }

  return (
    <div className="catering-service">
      {toast && <ToastNotification />}
      <div className="service-content">
        <div className="service-header">
          <h3>Catering Service</h3>
          {isEditing ? (
            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setIsEditing(false);
                  fetchCateringData();
                }}
              >
                Cancel
              </button>
              <button type="submit" className="save-button" form="service-form">
                Save Changes
              </button>
            </div>
          ) : !isReadOnly && (
            <button
              type="button"
              className="edit-button"
              onClick={() => setIsEditing(true)}
            >
              Edit Service
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} id="service-form" className="service-form">
            <div className="rich-text-group">
              <label>Service Description</label>
              <SimpleTextEditor
                value={formData.service_description}
                onChange={(v) => handleChange(v, 'service_description')}
                placeholder="Describe your catering service..."
              />
            </div>
            <div className="rich-text-group">
              <label>Catering Types</label>
              <SimpleTextEditor
                value={formData.catering_types}
                onChange={(v) => handleChange(v, 'catering_types')}
                placeholder="e.g., Buffet, Plated, Family Style..."
              />
            </div>
            <div className="rich-text-group">
              <label>Menu Options</label>
              <SimpleTextEditor
                value={formData.menu_options}
                onChange={(v) => handleChange(v, 'menu_options')}
                placeholder="Describe your menu options and specialties..."
              />
            </div>
            <div className="rich-text-group">
              <label>Dietary Options</label>
              <SimpleTextEditor
                value={formData.dietary_options}
                onChange={(v) => handleChange(v, 'dietary_options')}
                placeholder="e.g., Vegetarian, Vegan, Gluten-Free..."
              />
            </div>
            <div className="rich-text-group">
              <label>Base Rate</label>
              <SimpleTextEditor
                value={formData.base_rate}
                onChange={(v) => handleChange(v, 'base_rate')}
                placeholder="e.g., $50 per person, $1000 minimum..."
                height="100px"
              />
            </div>
            <div className="rich-text-group">
              <label>Additional Pricing & Packages</label>
              <SimpleTextEditor
                value={formData.additional_rates}
                onChange={(v) => handleChange(v, 'additional_rates')}
                placeholder="List any additional rates or packages..."
              />
            </div>
          </form>
        ) : (
          <div className="service-details">
            <div className="service-section">
              <h4>Service Description</h4>
              <div className="markdown-content">
                <ReactMarkdown>{formData.service_description || 'No description provided.'}</ReactMarkdown>
              </div>
            </div>
            <div className="service-section">
              <h4>Catering Types</h4>
              <div className="markdown-content">
                <ReactMarkdown>{formData.catering_types || 'No catering types specified.'}</ReactMarkdown>
              </div>
            </div>
            <div className="service-section">
              <h4>Menu Options</h4>
              <div className="markdown-content">
                <ReactMarkdown>{formData.menu_options || 'No menu options provided.'}</ReactMarkdown>
              </div>
            </div>
            <div className="service-section">
              <h4>Dietary Options</h4>
              <div className="markdown-content">
                <ReactMarkdown>{formData.dietary_options || 'No dietary options specified.'}</ReactMarkdown>
              </div>
            </div>
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
        <h4>Food Gallery</h4>
        <div className="portfolio-grid">
          {photos && photos.length > 0 ? (
            photos.map((photo, index) => (
              <div key={photo.url} className="portfolio-photo">
                <img
                  src={`${photo.url}?t=${new Date().getTime()}`}
                  alt={`Catering gallery ${index + 1}`}
                  className="portfolio-image"
                  loading="lazy"
                />
                {isEditing && (
                  <button
                    className="delete-photo"
                    onClick={() => handleDeletePhoto(photo.url)}
                    aria-label="Delete photo"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="no-photos-container">
              <span className="no-photos">No food photos added yet</span>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="photo-upload">
            <input
              ref={fileInputRef}
              type="file"
              id="catering-photo-upload"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label htmlFor="catering-photo-upload" className="upload-button">
              {uploading ? 'Uploading...' : 'Add Photo to Gallery'}
            </label>
            <p className="upload-hint">Upload high-quality images of your dishes and service.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CateringService;