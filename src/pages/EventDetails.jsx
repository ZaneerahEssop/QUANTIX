import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft, FaEdit, FaSave, FaUpload, FaFilePdf, FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar, FaPlus, FaTrash, FaEnvelope } from 'react-icons/fa';
import '../EventDetails.css';
import EventTheme from './eventPages/EventTheme';

// A component for the event schedule (Your original component)
const EventSchedule = ({ schedule, onUpdate }) => {
  const [editableSchedule, setEditableSchedule] = useState(schedule || []);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditableSchedule(schedule || []);
  }, [schedule]);

  const handleAddItem = () => {
    setEditableSchedule([...editableSchedule, { time: '', activity: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newSchedule = editableSchedule.filter((_, i) => i !== index);
    setEditableSchedule(newSchedule);
  };

  const handleItemChange = (index, field, value) => {
    const newSchedule = [...editableSchedule];
    newSchedule[index][field] = value;
    setEditableSchedule(newSchedule);
  };

  const handleSave = () => {
    onUpdate(editableSchedule);
    setIsEditing(false);
  };

  return (
    <div className="schedule-section">
      <div className="section-header">
        <h2>Schedule</h2>
        {isEditing ? (
          <button onClick={handleSave} className="save-button">
            <FaSave /> Save
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="edit-button">
            <FaEdit /> Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <>
          {editableSchedule.map((item, index) => (
            <div key={index} className="schedule-item editable">
              <input
                type="time"
                value={item.time}
                onChange={(e) => handleItemChange(index, 'time', e.target.value)}
              />
              <input
                type="text"
                value={item.activity}
                onChange={(e) => handleItemChange(index, 'activity', e.target.value)}
                placeholder="Activity"
              />
              <button onClick={() => handleRemoveItem(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          ))}
          <button onClick={handleAddItem} className="add-btn">
            <FaPlus /> Add Activity
          </button>
        </>
      ) : (
        <div className="schedule-list">
          {schedule && schedule.length > 0 ? (
            schedule.map((item, index) => (
              <div key={index} className="schedule-item">
                <span className="schedule-time">{item.time}</span>
                <span className="schedule-activity">{item.activity}</span>
              </div>
            ))
          ) : (
            <p>No schedule items have been added yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

// A component for guest management (Your original component)
const GuestManagement = ({ guests, onUpdate }) => {
  const [editableGuests, setEditableGuests] = useState(guests || []);
  const [newGuest, setNewGuest] = useState({ name: '', contact: '', dietary: '', isAttending: false });
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    setEditableGuests(guests || []);
  }, [guests]);

  const handleAddGuest = () => {
    if (newGuest.name.trim() !== '') {
        const newGuestList = [...editableGuests, { ...newGuest, id: Date.now() }];
        setEditableGuests(newGuestList);
        setNewGuest({ name: '', contact: '', dietary: '', isAttending: false });
    }
  };

  const handleUpdateGuest = (guestId, field, value) => {
    const updatedGuests = editableGuests.map(guest => 
      guest.id === guestId ? { ...guest, [field]: value } : guest
    );
    setEditableGuests(updatedGuests);
  };

  const handleRemoveGuest = (guestId) => {
    const updatedGuests = editableGuests.filter(guest => guest.id !== guestId);
    setEditableGuests(updatedGuests);
  };
  
  const handleSave = () => {
      onUpdate(editableGuests);
      setIsEditing(false);
  }

  const handleSendInvite = (guest) => {
    alert(`Simulating sending an email invite to ${guest.name} at ${guest.contact}`);
  };

  return (
    <div className="guests-section">
      <div className="section-header">
        <h2>Guest Management</h2>
        {isEditing ? (
          <button onClick={handleSave} className="save-button">
            <FaSave /> Save
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="edit-button">
            <FaEdit /> Edit
          </button>
        )}
      </div>
      {isEditing && (
        <div className="add-guest-form">
          <input
            type="text"
            placeholder="Guest Name"
            value={newGuest.name}
            onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email or Phone"
            value={newGuest.contact}
            onChange={(e) => setNewGuest({ ...newGuest, contact: e.target.value })}
          />
          <input
            type="text"
            placeholder="Dietary Requirements"
            value={newGuest.dietary}
            onChange={(e) => setNewGuest({ ...newGuest, dietary: e.target.value })}
          />
          <button onClick={handleAddGuest}>
            <FaPlus /> Add Guest
          </button>
        </div>
      )}

      <div className="guest-list">
        {editableGuests && editableGuests.length > 0 ? (
          <ul>
            {editableGuests.map(guest => (
              <li key={guest.id} className="guest-item">
                <div className="guest-info">
                  <input
                    type="checkbox"
                    checked={guest.isAttending}
                    onChange={(e) => handleUpdateGuest(guest.id, 'isAttending', e.target.checked)}
                    disabled={!isEditing}
                  />
                  <div>
                    <strong>{guest.name}</strong>
                    <br />
                    <small>{guest.contact}</small>
                    <br />
                    <small>{guest.dietary}</small>
                  </div>
                </div>
                {isEditing && (
                  <div className="guest-actions">
                    <button onClick={() => handleSendInvite(guest)} title="Send invite">
                      <FaEnvelope />
                    </button>
                    <button onClick={() => handleRemoveGuest(guest.id)} className="delete-guest" title="Remove guest">
                      <FaTrash />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No guests have been added yet.</p>
        )}
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

  // --- EDIT: This useEffect now correctly points to the subcollection ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const fetchData = async () => {
          setIsLoading(true);
          try {
            // This is the main fix: Point to the correct subcollection path
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
          } catch (error) {
            console.error('Error loading data:', error);
          } finally {
            setIsLoading(false);
          }
        };
        fetchData();
      } else {
        console.log("No user is signed in.");
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
      // --- EDIT: Update the document in the correct subcollection path ---
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        ...formData,
        vendors_id: selectedVendors,
        schedule: schedule,
        guests: guests,
        theme: theme,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
      setEvent(prev => ({ ...prev, ...formData, vendors_id: selectedVendors, schedule, guests, theme }));
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]
    );
  };
  
  // NOTE: This uses Firebase Storage. If you switch to Cloudinary, this needs to be changed.
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    const storageRef = ref(storage, `events/${auth.currentUser.uid}/${eventId}/${file.name}`);
    
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const newDoc = { name: file.name, url, uploadedAt: new Date().toISOString() };
      
      // --- EDIT: Update the document in the correct subcollection path ---
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        documents: arrayUnion(newDoc)
      });
      setDocuments(prev => [...prev, newDoc]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (docToDelete) => {
    if (!window.confirm('Are you sure you want to delete this document?') || !auth.currentUser) return;
    
    try {
      const fileRef = ref(storage, `events/${auth.currentUser.uid}/${eventId}/${docToDelete.name}`);
      await deleteObject(fileRef);
      
      // --- EDIT: Update the document in the correct subcollection path ---
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        documents: arrayRemove(docToDelete)
      });
      
      setDocuments(prev => prev.filter(doc => doc.name !== docToDelete.name));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (isLoading) return <div className="loading">Loading event details...</div>;
  
  if (!event) return (
    <div className="error">
      <h2>Event Not Found</h2>
      <p>The requested event could not be found or you don't have permission to view it.</p>
      <button onClick={() => navigate('/planner-dashboard')}>Back to Dashboard</button>
    </div>
  );

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
            <section><EventSchedule schedule={schedule} onUpdate={setSchedule}/></section>
            <section><EventTheme theme={theme} onUpdate={setTheme}/></section>
          </>
        )}
        {activeView === 'guests' && (<GuestManagement guests={guests} onUpdate={setGuests}/>)}
        {activeView === 'vendors' && (
          <section className="vendors-section">
            <div className="section-header">
              <h2>Vendors</h2>
              <button onClick={handleSave} className="save-button"><FaSave /> Save</button>
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
                      return vendor ? (
                        <li key={vendorId}>
                          <strong>{vendor.name_of_business}</strong> - {vendor.category}
                          <br />
                          <small>{vendor.phone} | {vendor.email}</small>
                        </li>
                      ) : null;
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
               <button onClick={handleSave} className="save-button"><FaSave /> Save</button>
            </div>
            {isEditing && (
              <div className="upload-area">
                <label className="upload-button">
                  <FaUpload /> Upload Document
                  <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading}/>
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
