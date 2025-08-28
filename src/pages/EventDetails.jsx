import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { FaArrowLeft, FaEdit, FaSave, FaUpload, FaFilePdf, FaTimes } from 'react-icons/fa';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    venue: '',
    notes: ''
  });
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch all required data in parallel
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        console.error('No user logged in');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch event and vendors in parallel
        const [eventDoc, vendorsSnapshot] = await Promise.all([
          getDoc(doc(db, `planners/${user.uid}/events`, eventId)),
          getDocs(collection(db, 'vendors'))
        ]);

        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          setEvent(eventData);
          
          // Handle date
          let eventDate;
          if (eventData.date?.toDate) {
            eventDate = eventData.date.toDate();
          } else if (eventData.date) {
            eventDate = new Date(eventData.date);
          } else {
            eventDate = new Date();
          }
          
          setFormData({
            name: eventData.name || '',
            date: eventDate.toISOString().split('T')[0],
            time: eventData.time || '',
            venue: eventData.venue || '',
            notes: eventData.notes || ''
          });
          setSelectedVendors(eventData.vendors || []);
          
          // Set vendors
          setVendors(vendorsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })));
          
          // Lazy load documents when needed
          if (eventData.documents?.length > 0) {
            const storageRef = ref(storage, `events/${eventId}`);
            listAll(storageRef).then(files => {
              // Only load first 3 document previews initially
              const initialFiles = files.items.slice(0, 3);
              Promise.all(
                initialFiles.map(item => 
                  getDownloadURL(item).then(url => ({
                    name: item.name,
                    url
                  }))
                )
              ).then(docs => setDocuments(docs));
            }).catch(console.error);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If date is being updated, also update the event's date for display
    if (name === 'date' && event) {
      setEvent(prev => ({
        ...prev,
        date: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        ...formData,
        vendors: selectedVendors,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
      // Update local event data
      setEvent(prev => ({
        ...prev,
        ...formData,
        vendors: selectedVendors
      }));
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `events/${eventId}/${file.name}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setDocuments(prev => [...prev, {
        name: file.name,
        url
      }]);
      
      // Add to Firestore if needed
      await updateDoc(doc(db, 'events', eventId), {
        documents: arrayUnion({
          name: file.name,
          url,
          uploadedAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (fileName) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const fileRef = ref(storage, `events/${eventId}/${fileName}`);
      await deleteObject(fileRef);
      
      // Update Firestore
      await updateDoc(doc(db, 'events', eventId), {
        documents: arrayRemove(documents.find(doc => doc.name === fileName))
      });
      
      // Update local state
      setDocuments(prev => prev.filter(doc => doc.name !== fileName));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (isLoading) return (
    <div className="loading" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      fontSize: '1.2rem',
      color: '#666'
    }}>
      Loading event details...
    </div>
  );
  
  if (!event) return (
    <div className="error" style={{
      padding: '20px',
      textAlign: 'center',
      color: '#d32f2f',
      backgroundColor: '#ffebee',
      borderRadius: '8px',
      margin: '20px',
      border: '1px solid #ffcdd2'
    }}>
      <h2>Event Not Found</h2>
      <p>The requested event could not be found or you don't have permission to view it.</p>
      <button 
        onClick={() => navigate('/planner-dashboard')}
        style={{
          marginTop: '15px',
          padding: '8px 16px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      // If it's a Firestore timestamp
      if (dateString.toDate) {
        return dateString.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      // If it's already a Date object
      if (dateString instanceof Date && !isNaN(dateString.getTime())) {
        return dateString.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      // If it's an ISO date string
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return dateString; // Return as is if we can't parse it
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return as is if there's an error
    }
  };

  return (
    <div className="event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="header-actions">
          {isEditing ? (
            <button onClick={handleSave} className="save-button">
              <FaSave /> Save Changes
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="edit-button">
              <FaEdit /> Edit Event
            </button>
          )}
        </div>
      </div>

      <div className="event-content">
        <div className="event-info">
          {isEditing ? (
            <>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Event Name"
                className="edit-input"
              />
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="edit-input"
                />
              </div>
              <div className="form-group">
                <label>Time:</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="edit-input"
                />
              </div>
              <div className="form-group">
                <label>Venue:</label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  placeholder="Venue"
                  className="edit-input"
                />
              </div>
              <div className="form-group">
                <label>Notes:</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes"
                  className="edit-textarea"
                  rows="4"
                />
              </div>
            </>
          ) : (
            <>
              <h1>{event.name}</h1>
              <p><strong>Date:</strong> {formatDisplayDate(event.date)}</p>
              <p><strong>Time:</strong> {event.time || 'Not specified'}</p>
              <p><strong>Venue:</strong> {event.venue || 'Not specified'}</p>
              {event.notes && (
                <div className="notes">
                  <h3>Notes:</h3>
                  <p>{event.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="event-sections">
          {/* Vendors Section */}
          <section className="vendors-section">
            <h2>Vendors</h2>
            {isEditing ? (
              <div className="vendor-selection">
                {vendors.map(vendor => (
                  <label key={vendor.id} className="vendor-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendor.id)}
                      onChange={() => handleVendorToggle(vendor.id)}
                    />
                    {vendor.name} ({vendor.category})
                  </label>
                ))}
              </div>
            ) : (
              <div className="vendors-list">
                {selectedVendors.length > 0 ? (
                  <ul>
                    {selectedVendors.map(vendorId => {
                      const vendor = vendors.find(v => v.id === vendorId);
                      return vendor ? (
                        <li key={vendorId}>
                          <strong>{vendor.name}</strong> - {vendor.category}
                          <br />
                          <small>{vendor.phone} | {vendor.email}</small>
                        </li>
                      ) : null;
                    })}
                  </ul>
                ) : (
                  <p>No vendors selected</p>
                )}
              </div>
            )}
          </section>

          {/* Documents Section */}
          <section className="documents-section">
            <div className="documents-header">
              <h2>Documents</h2>
              {isEditing && (
                <div className="upload-area">
                  <label className="upload-button">
                    <FaUpload /> Upload Document
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      disabled={isUploading}
                    />
                  </label>
                  {isUploading && (
                    <div className="upload-progress">
                      <progress value={uploadProgress} max="100" />
                      <span>Uploading... {uploadProgress}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="documents-list">
              {documents.length > 0 ? (
                <ul>
                  {documents.map((doc, index) => (
                    <li key={index} className="document-item">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <FaFilePdf /> {doc.name}
                      </a>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteDocument(doc.name)}
                          className="delete-doc"
                          title="Delete document"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No documents uploaded yet</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
