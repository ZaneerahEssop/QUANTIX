import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
// EDIT: Removed 'storage' from firebase imports as it's not used with Cloudinary
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft, FaEdit, FaSave, FaUpload, FaFilePdf, FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar, FaPlus, FaTrash, FaEnvelope } from 'react-icons/fa';
import '../EventDetails.css';
import EventTheme from './eventPages/EventTheme';

// --- Your original sub-components (EventSchedule, GuestManagement) are preserved below ---
const EventSchedule = ({ schedule, onUpdate, isEditing }) => {
  const handleAddItem = () => onUpdate([...(schedule || []), { time: '', activity: '' }]);
  const handleRemoveItem = (index) => onUpdate((schedule || []).filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newSchedule = [...(schedule || [])];
    newSchedule[index][field] = value;
    onUpdate(newSchedule);
  };
  return (
    <div className="schedule-section">
      <div className="section-header"><h2>Schedule</h2></div>
      {isEditing ? (
        <>
          {(schedule || []).map((item, index) => (
            <div key={index} className="schedule-item editable">
              <input type="time" value={item.time} onChange={(e) => handleItemChange(index, 'time', e.target.value)} />
              <input type="text" value={item.activity} onChange={(e) => handleItemChange(index, 'activity', e.target.value)} placeholder="Activity" />
              <button onClick={() => handleRemoveItem(index)} className="remove-btn"><FaTrash /></button>
            </div>
          ))}
          <button onClick={handleAddItem} className="add-btn"><FaPlus /> Add Activity</button>
        </>
      ) : (
        <div className="schedule-list">
          {schedule && schedule.length > 0 ? schedule.map((item, index) => (
            <div key={index} className="schedule-item">
              <span className="schedule-time">{item.time}</span>
              <span className="schedule-activity">{item.activity}</span>
            </div>
          )) : <p>No schedule items have been added yet.</p>}
        </div>
      )}
    </div>
  );
};
const GuestManagement = ({ guests, onUpdate, isEditing }) => {
  const [newGuest, setNewGuest] = useState({ name: '', contact: '', dietary: '', isAttending: false });
  const handleAddGuest = () => {
    if (newGuest.name.trim() !== '') {
      onUpdate([...(guests || []), { ...newGuest, id: Date.now() }]);
      setNewGuest({ name: '', contact: '', dietary: '', isAttending: false });
    }
  };
  const handleUpdateGuest = (guestId, field, value) => onUpdate((guests || []).map(g => g.id === guestId ? { ...g, [field]: value } : g));
  const handleRemoveGuest = (guestId) => onUpdate((guests || []).filter(g => g.id !== guestId));
  const handleSendInvite = (guest) => alert(`Simulating sending an email invite to ${guest.name} at ${guest.contact}`);
  return (
    <div className="guests-section">
      <div className="section-header"><h2>Guest Management</h2></div>
      {isEditing && (
        <div className="add-guest-form">
          <input type="text" placeholder="Guest Name" value={newGuest.name} onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })} />
          <input type="email" placeholder="Email or Phone" value={newGuest.contact} onChange={(e) => setNewGuest({ ...newGuest, contact: e.target.value })} />
          <input type="text" placeholder="Dietary Requirements" value={newGuest.dietary} onChange={(e) => setNewGuest({ ...newGuest, dietary: e.target.value })} />
          <button onClick={handleAddGuest}><FaPlus /> Add Guest</button>
        </div>
      )}
      <div className="guest-list">
        {guests && guests.length > 0 ? (
          <ul>
            {guests.map(guest => (
              <li key={guest.id} className="guest-item">
                <div className="guest-info">
                  <input type="checkbox" checked={guest.isAttending} onChange={(e) => handleUpdateGuest(guest.id, 'isAttending', e.target.checked)} disabled={!isEditing} />
                  <div>
                    <strong>{guest.name}</strong><br /><small>{guest.contact}</small><br /><small>{guest.dietary}</small>
                  </div>
                </div>
                {isEditing && (
                  <div className="guest-actions">
                    <button onClick={() => handleSendInvite(guest)} title="Send invite"><FaEnvelope /></button>
                    <button onClick={() => handleRemoveGuest(guest.id)} className="delete-guest" title="Remove guest"><FaTrash /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p>No guests have been added yet.</p>}
      </div>
    </div>
  );
};

// Main EventDetails component
const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [formData, setFormData] = useState({ name: '', date: '', time: '', venue: '', notes: '' });
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [guests, setGuests] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [theme, setTheme] = useState({ name: '', colors: [], notes: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const fetchData = async () => {
          setIsLoading(true);
          try {
            const eventRef = doc(db, `planners/${user.uid}/events`, eventId);
            const eventDoc = await getDoc(eventRef);
            const vendorsSnapshot = await getDocs(collection(db, 'vendors'));

            if (eventDoc.exists()) {
              const eventData = { id: eventDoc.id, ...eventDoc.data() };
              setEvent(eventData);
              setSchedule(eventData.schedule || []);
              setGuests(eventData.guests || []);
              setTheme(eventData.theme || { name: '', colors: [], notes: '' });
              setDocuments(eventData.documents || []);
              setFormData({
                name: eventData.name || '',
                date: eventData.date || '',
                time: eventData.time || '',
                venue: eventData.venue || '',
                notes: eventData.notes || '',
              });
              setSelectedVendors(eventData.vendors_id || []);
              setVendors(vendorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
              console.error("Event not found or user does not have permission.");
              setEvent(null);
            }
          } catch (error) { console.error('Error loading data:', error); } 
          finally { setIsLoading(false); }
        };
        fetchData();
      } else {
        setIsLoading(false);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [eventId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        ...formData,
        vendors_id: selectedVendors,
        schedule: schedule,
        guests: guests,
        theme: theme,
        documents: documents,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
      setEvent(prev => ({ ...prev, ...formData, vendors_id: selectedVendors, schedule, guests, theme, documents }));
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors(prev => prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]);
  };
  
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !auth.currentUser) return;

    setIsUploading(true);
    setUploadProgress(0);
    const newDocs = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const formDataForUpload = new FormData();
        formDataForUpload.append("file", file);
        
        
        formDataForUpload.append("upload_preset", "event_uploads");
        
        const safeEventName = formData.name.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        const folderPath = `planners/${auth.currentUser.uid}/${safeEventName}`;
        formDataForUpload.append("folder", folderPath);

        // --- EDIT: Replace the placeholder with your actual Cloud Name ---
        const response = await fetch(
          
          "https://api.cloudinary.com/v1_1/db4slx3ga/upload",
          { method: "POST", body: formDataForUpload }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
        }
        const data = await response.json();
        newDocs.push({ name: file.name, url: data.secure_url, uploadedAt: new Date().toISOString() });
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      if (newDocs.length > 0) {
        await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
          documents: arrayUnion(...newDocs)
        });
        setDocuments(prev => [...prev, ...newDocs]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(`An error occurred during upload: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = null; 
    }
  };

  const handleDeleteDocument = async (docToDelete) => {
    if (!window.confirm('Are you sure you want to delete this document?') || !auth.currentUser) return;
    try {
      // For Cloudinary, secure deletion requires a backend endpoint.
      // This implementation just removes the reference from your Firestore database.
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        documents: arrayRemove(docToDelete)
      });
      setDocuments(prev => prev.filter(doc => doc.url !== docToDelete.url));
    } catch (error) {
      console.error('Error deleting document reference:', error);
    }
  };

  if (isLoading) return <div className="loading">Loading event details...</div>;
  if (!event) return <div className="error"><h2>Event Not Found</h2><p>The requested event could not be found or you don't have permission to view it.</p><button onClick={() => navigate('/planner-dashboard')}>Back to Dashboard</button></div>;
  
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  return (
    <div className="event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button"><FaArrowLeft /> Back to Dashboard</button>
        <div className="button-group">
          <button onClick={() => setActiveView('overview')} className={`new-button ${activeView === 'overview' ? 'active' : ''}`}>Event Overview</button>
          <button onClick={() => setActiveView('guests')} className={`new-button ${activeView === 'guests' ? 'active' : ''}`}>Guest Management</button>
          <button onClick={() => setActiveView('vendors')} className={`new-button ${activeView === 'vendors' ? 'active' : ''}`}>Vendor Management</button>
          <button onClick={() => setActiveView('documents')} className={`new-button ${activeView === 'documents' ? 'active' : ''}`}>Document Management</button>
        </div>
        <div className="header-actions">
          {isEditing ? (
            <button onClick={handleSave} className="save-button"><FaSave /> Save Changes</button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="edit-button"><FaEdit /> Edit Event</button>
          )}
        </div>
      </div>
      <div className="event-info-boxes">
        <div className="info-box date-box">
          <h4><FaCalendarAlt /> Date</h4>
          <p>{isEditing ? (<input type="date" name="date" value={formData.date} onChange={handleInputChange}/>) : formatDisplayDate(event.date)}</p>
        </div>
        <div className="info-box time-box">
          <h4><FaClock /> Time</h4>
          <p>{isEditing ? (<input type="time" name="time" value={formData.time} onChange={handleInputChange}/>) : event.time || 'Not specified'}</p>
        </div>
        <div className="info-box venue-box">
          <h4><FaMapMarkerAlt /> Venue</h4>
          <p>{isEditing ? (<input type="text" name="venue" value={formData.venue} onChange={handleInputChange} placeholder="Venue"/>) : event.venue || 'Not specified'}</p>
        </div>
        <div className="info-box theme-box">
          <h4><FaStar /> Theme</h4>
          <p>{event.theme?.name || 'Not specified'}</p>
        </div>
      </div>
      <div className="event-sections">
        {activeView === 'overview' && (
          <>
            <section><EventSchedule schedule={schedule} onUpdate={setSchedule} isEditing={isEditing}/></section>
            <section><EventTheme theme={theme} onUpdate={setTheme}/></section>
          </>
        )}
        {activeView === 'guests' && (<GuestManagement guests={guests} onUpdate={setGuests} isEditing={isEditing} />)}
        {activeView === 'vendors' && (
          <section className="vendors-section">
            <div className="section-header">
              <h2>Vendors</h2>
            </div>
            {isEditing ? (
              <div className="vendor-selection">
                {vendors.map(vendor => (
                  <label key={vendor.id} className="vendor-checkbox">
                    <input type="checkbox" checked={selectedVendors.includes(vendor.id)} onChange={() => handleVendorToggle(vendor.id)}/>
                    {vendor.name_of_business} ({vendor.category})
                  </label>
                ))}
              </div>
            ) : (
              <div className="vendors-list">
                {selectedVendors.length > 0 ? (
                  <ul>
                    {selectedVendors.map(vendorId => {
                      const vendor = vendors.find(v => v.id === vendorId);
                      return vendor ? (<li key={vendorId}><strong>{vendor.name_of_business}</strong> - {vendor.category}<br /><small>{vendor.phone} | {vendor.email}</small></li>) : null;
                    })}
                  </ul>
                ) : (<p>No vendors selected</p>)}
              </div>
            )}
          </section>
        )}
        {activeView === 'documents' && (
          <section className="documents-section">
            <div className="documents-header">
              <h2>Documents</h2>
            </div>
            {isEditing && (
              <div className="upload-area">
                <label className="upload-button">
                  <FaUpload /> Upload Documents
                  <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading}/>
                </label>
                {isUploading && (<div className="upload-progress"><progress value={uploadProgress} max="100" /><span>Uploading... {uploadProgress}%</span></div>)}
              </div>
            )}
            <div className="documents-list">
              {documents && documents.length > 0 ? (
                <ul>
                  {documents.map((doc, index) => (
                    <li key={index} className="document-item">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"><FaFilePdf /> {doc.name}</a>
                      {isEditing && (<button onClick={() => handleDeleteDocument(doc)} className="delete-doc" title="Delete document"><FaTimes /></button>)}
                    </li>
                  ))}
                </ul>
              ) : (<p>No documents uploaded yet</p>)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default EventDetails;

