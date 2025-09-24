import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../client';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import './PhotographyService.css';

// Text editor with formatting options
const SimpleTextEditor = ({ value, onChange, placeholder, height = '150px' }) => {
  const textareaRef = useRef(null);
  
  // Handle text changes
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  // Handle tab key for indentation
  const handleKeyDown = (e) => {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Handle Shift+Tab to decrease indentation
        const beforeCursor = value.substring(0, start);
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;
        const line = value.substring(lineStart, start);
        
        if (line.startsWith('  ') || line.startsWith('\t')) {
          // Remove one level of indentation (tab or 2 spaces)
          const newValue = value.substring(0, lineStart) + 
                         line.replace(/^(\s{1,2}|\t)/, '') + 
                         value.substring(start);
          const newPos = start - 1;
          
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, newPos);
          }, 0);
        }
      } else {
        // Handle Tab to increase indentation
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        
        // Move cursor after the indentation
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    } else if (e.key === 'Enter') {
      // Handle Enter key to maintain list indentation
      const beforeCursor = value.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const line = value.substring(lineStart, start);
      
      // Check if we're in a list item
      const listMatch = line.match(/^(\s*[-*+]\s|\s*\d+\.\s)/);
      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1] ? listMatch[0] : '';
        const newValue = value.substring(0, start) + '\n' + indent + value.substring(end);
        const newPos = start + indent.length + 1;
        
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newPos;
        }, 0);
      }
    }
  };

  // Apply formatting to selected text
  const applyFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const line = value.substring(lineStart, start);
    const indent = line.match(/^\s*/)[0] || '';
    
    let newValue = value;
    let newCursorPos = end;

    switch(format) {
      case 'bold':
        newValue = value.substring(0, start) + `**${selectedText}**` + value.substring(end);
        newCursorPos = selectedText ? end + 4 : start + 2;
        break;
        
      case 'bullet':
        if (selectedText) {
          const lines = selectedText.split('\n')
            .map((line, i) => {
              if (!line.trim()) return '';
              const lineIndent = line.match(/^\s*/)[0];
              return `${lineIndent}- ${line.trimStart()}`;
            })
            .join('\n');
          newValue = value.substring(0, start) + lines + value.substring(end);
          newCursorPos = end + (lines.length - selectedText.length);
        } else {
          newValue = value.substring(0, start) + `${indent}- ` + value.substring(start);
          newCursorPos = start + indent.length + 2;
        }
        break;
        
      case 'number':
        if (selectedText) {
          let itemNumber = 1;
          const lines = selectedText.split('\n')
            .map((line, i) => {
              if (!line.trim()) return '';
              const lineIndent = line.match(/^\s*/)[0];
              const numbered = `${lineIndent}${itemNumber}. ${line.trimStart()}`;
              itemNumber++;
              return numbered;
            })
            .join('\n');
          newValue = value.substring(0, start) + lines + value.substring(end);
          newCursorPos = end + (lines.length - selectedText.length);
        } else {
          newValue = value.substring(0, start) + `${indent}1. ` + value.substring(start);
          newCursorPos = start + indent.length + 3;
        }
        break;
        
      default:
        return;
    }

    onChange(newValue);
    
    // Set cursor position after formatting
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
          title="Bold (Ctrl+B)"
          className="format-button"
        >
          <strong>B</strong>
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
        onKeyDown={(e) => {
          handleKeyDown(e);
          // Add keyboard shortcuts
          if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            applyFormat('bold');
          }
        }}
        placeholder={placeholder}
        style={{ minHeight: height }}
        dir="ltr"
      />
    </div>
  );
};

const PhotographyService = ({ vendorId, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);
  
  const [formData, setFormData] = useState({
    service_description: '',
    camera_specs: '',
    base_rate: '',  
    additional_rates: ''
  });

  // Show toast notification
  const showToast = (message, type = 'info') => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    
    setToast({ message, type });
    
    toastTimeout.current = setTimeout(() => {
      setToast(null);
      toastTimeout.current = null;
    }, 5001);
  };

  // Close toast manually
  const closeToast = () => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
      toastTimeout.current = null;
    }
    setToast(null);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  // Function to fetch portfolio photos
  const fetchPortfolioPhotos = useCallback(async (vendorId) => {
    try {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user logged in');
        setPhotos([]);
        return;
      }

      console.log('Fetching photos for user:', user.id);
      
      // List all files in the user's folder with pagination
      let allFiles = [];
      let hasMore = true;
      let offset = 0;
      const limit = 100; // Max files per request
      
      while (hasMore) {
        const { data, error } = await supabase.storage
          .from('portfolio-photos')
          .list(user.id, {
            limit,
            offset,
            sortBy: { column: 'created_at', order: 'desc' } // Newest first
          });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Filter out any non-image files
          const imageFiles = data.filter(file => 
            file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          );
          allFiles = [...allFiles, ...imageFiles];
          
          // If we got fewer files than the limit, we've reached the end
          if (data.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        } else {
          hasMore = false;
        }
      }
      
      console.log(`Found ${allFiles.length} photos`);
      
      // Get public URLs for all files
      const photoUrls = await Promise.all(
        allFiles.map(async (file) => {
          try {
            const { data: { publicUrl } } = supabase.storage
              .from('portfolio-photos')
              .getPublicUrl(`${user.id}/${file.name}`);
            console.log('Generated URL for:', file.name);
            return publicUrl;
          } catch (err) {
            console.error('Error generating URL for', file.name, err);
            return null;
          }
        })
      );
      
      // Filter out any null values and update state
      const validUrls = photoUrls.filter(url => url !== null);
      console.log(`Successfully loaded ${validUrls.length} photo URLs`);
      setPhotos(validUrls);
      
    } catch (error) {
      console.error('Error fetching portfolio photos:', error);
      showToast(`Error loading photos: ${error.message}`, 'error');
      setPhotos([]);
    }
  }, []);

  // Function to fetch photography data
  const fetchPhotographyData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vendor_services')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'photography')
        .single();

      if (error) {
        // If no record exists yet, initialize with empty form
        if (error.code === 'PGRST116') {
          setFormData({
            service_description: '',
            camera_specs: '',
            base_rate: '',
            additional_rates: ''
          });
          return;
        }
        throw error;
      }

      if (data) {
        setFormData({
          service_description: data.service_description || '',
          camera_specs: data.camera_specs || '',
          base_rate: data.base_rate || '',
          additional_rates: data.additional_rates || ''
        });
        
        // Fetch portfolio photos
        await fetchPortfolioPhotos(vendorId);
      }
    } catch (error) {
      console.error('Error fetching photography data:', error);
      showToast('Error fetching photography data. Please refresh the page.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId, fetchPortfolioPhotos]);

  // Fetch existing photography service data
  useEffect(() => {
    fetchPhotographyData();
  }, [fetchPhotographyData]);

  const handleChange = (value, name) => {
    // Ensure base_rate is always treated as a string
    const sanitizedValue = value || '';
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Saving photography data...', formData);
      
      // Prepare the data to save
      const dataToSave = {
        service_description: formData.service_description || null,
        camera_specs: formData.camera_specs || null,
        base_rate: formData.base_rate || null,  // Now handled as text
        additional_rates: formData.additional_rates || null,
        updated_at: new Date().toISOString()
      };
      
      // First, check if the record exists
      const { data: existingData, error: fetchError } = await supabase
        .from('vendor_services')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('service_type', 'photography')
        .maybeSingle();

      console.log('Existing data check:', { existingData, fetchError });

      let result;
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
        throw fetchError;
      }

      if (existingData) {
        // Update existing record
        console.log('Updating existing record:', existingData.id);
        const { data, error: updateError } = await supabase
          .from('vendor_services')
          .update(dataToSave)
          .eq('id', existingData.id)
          .select();
          
        if (updateError) throw updateError;
        result = data;
        console.log('Update result:', result);
      } else {
        // Insert new record
        console.log('Creating new record');
        const { data, error: insertError } = await supabase
          .from('vendor_services')
          .insert([
            {
              ...dataToSave,
              vendor_id: vendorId,
              service_type: 'photography',
              created_at: new Date().toISOString()
            }
          ])
          .select();
          
        if (insertError) throw insertError;
        result = data;
        console.log('Insert result:', result);
      }

      if (result && result.length > 0) {
        console.log('Save successful, updating UI');
        setIsEditing(false);
        // Refresh the data
        await fetchPhotographyData();
        showToast('Changes saved successfully!', 'success');
      } else {
        throw new Error('No data returned from save operation');
      }
    } catch (error) {
      console.error('Error saving photography data:', error);
      showToast(`Failed to save changes: ${error.message}`, 'error');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `vendors/${vendorId}/photography/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-photos')
        .getPublicUrl(filePath);

      // Update the photos state with the new photo
      setPhotos(prev => [...prev, publicUrl]);
      
      // Reset the file input
      e.target.value = null;
      
      showToast('Photo uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Error uploading photo. Please try again.', 'error');
    } finally {
      setUploading(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    
    try {
      // Extract the file path from the public URL.
      // e.g., .../portfolio-photos/user-id/filename.jpg -> user-id/filename.jpg
      const url = new URL(photoUrl);
      const filePath = url.pathname.split('/portfolio-photos/')[1];

      if (!filePath) {
        throw new Error('Could not determine file path from URL.');
      }
      
      const { error } = await supabase.storage
        .from('portfolio-photos')
        .remove([filePath]);
      
      if (error) throw error;
      
      // Update state locally for a faster UI response instead of re-fetching.
      setPhotos(currentPhotos => currentPhotos.filter(p => p !== photoUrl));
      showToast('Photo deleted successfully!', 'success');

    } catch (error) {
      console.error('Error deleting photo:', error);
      showToast(`Error deleting photo: ${error.message}`, 'error');
    }
  };

  if (isLoading) {
    return <div className="loading">Loading photography services...</div>;
  }

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
        <button 
          onClick={closeToast}
          className="toast-close"
          aria-label="Close notification"
        >
          &times;
        </button>
      </div>
    );
  };

  return (
    <div className="photography-service">
      {toast && <ToastNotification />}
      <div className="service-content">
        <div className="service-header">
          <h3>Photography Services</h3>
          {isEditing ? (
            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setIsEditing(false);
                  fetchPhotographyData();
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
              Edit Services
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} id="service-form" className="service-form">
            <div className="form-group rich-text-group">
              <label>Service Description</label>
              <SimpleTextEditor
                value={formData.service_description}
                onChange={(value) => handleChange(value, 'service_description')}
                placeholder="Describe your photography service..."
              />
            </div>

            <div className="form-group rich-text-group">
              <label>Camera Equipment & Specifications</label>
              <SimpleTextEditor
                value={formData.camera_specs}
                onChange={(value) => handleChange(value, 'camera_specs')}
                placeholder="List your camera equipment and specifications..."
              />
            </div>

            <div className="form-group rich-text-group">
              <label>Base Rate</label>
              <SimpleTextEditor
                value={formData.base_rate}
                onChange={(value) => handleChange(value, 'base_rate')}
                placeholder="e.g., $100 per hour"
                height="100px"
              />
            </div>

            <div className="form-group rich-text-group">
              <label>Additional Pricing & Packages</label>
              <SimpleTextEditor
                value={formData.additional_rates}
                onChange={(value) => handleChange(value, 'additional_rates')}
                placeholder="List any additional pricing, packages, or special offers..."
                height="150px"
              />
            </div>
          </form>
        ) : (
          <div className="service-details">
            <div className="service-section">
              <h4>Service Description</h4>
              <div className="markdown-content" data-color-mode="light">
                <div className="markdown-preview">
                  <ReactMarkdown>{formData.service_description || 'No description provided'}</ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="service-section">
              <h4>Camera Equipment & Specifications</h4>
              <div className="markdown-content">
                <div className="markdown-preview">
                  <ReactMarkdown>{formData.camera_specs || 'No camera specifications provided'}</ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="service-section">
              <h4>Pricing</h4>
              <div className="markdown-content">
                <div className="pricing-section">
                  <h5>Base Rate</h5>
                  <div className="markdown-preview">
                    <ReactMarkdown>{formData.base_rate || 'No base rate specified.'}</ReactMarkdown>
                  </div>
                </div>
                {formData.additional_rates && (
                  <div className="pricing-section">
                    <h5>Additional Rates</h5>
                    <div className="markdown-preview">
                      <ReactMarkdown>{formData.additional_rates}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="service-images">
        <h4>Portfolio Gallery</h4>
        <div className="portfolio-grid">
          {photos && photos.length > 0 ? (
            photos.map((photo, index) => (
              <div key={photo} className="portfolio-photo">
                <img
                  src={`${photo}?t=${new Date().getTime()}`}
                  alt={`Portfolio ${index + 1}`}
                  className="portfolio-image"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMCAwIEwgMTAwIDAgTCAxMDAgMTAwIEwgMCAxMDAgWiIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iI2NjYyI+RXJyb3I8L3RleHQ+PC9zdmc+';
                  }}
                />
                {isEditing && (
                  <button
                    className="delete-photo"
                    onClick={() => handleDeletePhoto(photo)}
                    aria-label="Delete photo"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="no-photos-container">
              <span className="no-photos">No portfolio photos added yet</span>
            </div>
          )}
        </div>
        
        {isEditing && (
          <div className="photo-upload">
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label htmlFor="photo-upload" className="upload-button">
              {uploading ? 'Uploading...' : 'Add Photo to Portfolio'}
            </label>
            <p className="upload-hint">Upload high-quality images that showcase your best work.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotographyService;