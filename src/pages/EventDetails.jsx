import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { FaArrowLeft, FaEdit, FaSave, FaUpload, FaFilePdf, FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar, FaPlus, FaTrash, FaEnvelope } from 'react-icons/fa';
import '../EventDetails.css';
import EventTheme from './eventPages/EventTheme';

// A component for the event schedule
const EventSchedule = ({ schedule, onUpdate }) => {
  const [editableSchedule, setEditableSchedule] = useState(schedule || []);
  const [isEditing, setIsEditing] = useState(false);

  const handleAddItem = () => {
    setEditableSchedule([...editableSchedule, { time: '', activity: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newSchedule = editableSchedule.filter((_, i) => i !== index);
    setEditableSchedule(newSchedule);
    onUpdate(newSchedule);
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
          {schedule.length > 0 ? (
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

// A component for guest management
const GuestManagement = ({ guests, onUpdate }) => {
  const [newGuest, setNewGuest] = useState({ name: '', contact: '', dietary: '', isAttending: false });
  const [isEditing, setIsEditing] = useState(false);

  const handleAddGuest = () => {
    if (newGuest.name.trim() !== '') {
      onUpdate([...guests, { ...newGuest, id: Date.now() }]);
      setNewGuest({ name: '', contact: '', dietary: '', isAttending: false });
    }
  };

  const handleUpdateGuest = (guestId, field, value) => {
    const updatedGuests = guests.map(guest => 
      guest.id === guestId ? { ...guest, [field]: value } : guest
    );
    onUpdate(updatedGuests);
  };

  const handleRemoveGuest = (guestId) => {
    const updatedGuests = guests.filter(guest => guest.id !== guestId);
    onUpdate(updatedGuests);
  };

  const handleSendInvite = (guest) => {
    alert(`Simulating sending an email invite to ${guest.name} at ${guest.contact}`);
  };

  return (
    <div className="guests-section">
      <div className="section-header">
        <h2>Guest Management</h2>
        {isEditing ? (
          <button onClick={() => setIsEditing(false)} className="save-button">
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
        {guests.length > 0 ? (
          <ul>
            {guests.map(guest => (
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
  const [activeView, setActiveView] = useState('overview'); // <-- New state for navigation
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
  const [schedule, setSchedule] = useState([]);
  const [guests, setGuests] = useState([]); // <-- New state for guests
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [theme, setTheme] = useState({ name: '', colors: [], notes: '' });

  // Fetch all required data
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
        const [eventDoc, vendorsSnapshot] = await Promise.all([
          getDoc(doc(db, `planners/${user.uid}/events`, eventId)),
          getDocs(collection(db, 'vendors'))
        ]);

        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          setEvent(eventData);
          setSchedule(eventData.schedule || []);
          setGuests(eventData.guests || []); // <-- Load guests from event data
          setTheme(eventData.theme || { name: '', colors: [], notes: '' });
          
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
            notes: eventData.notes || '',
          });
          setSelectedVendors(eventData.vendors || []);
          
          setVendors(vendorsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })));
          
          if (eventData.documents?.length > 0) {
            const storageRef = ref(storage, `events/${eventId}`);
            listAll(storageRef).then(files => {
              const initialFiles = files.items;
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

    if (name === 'date' && event) {
      setEvent(prev => ({
        ...prev,
        date: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        ...formData,
        vendors: selectedVendors,
        schedule: schedule,
        guests: guests, // <-- Save guests to Firestore
        theme: theme,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
      setEvent(prev => ({
        ...prev,
        ...formData,
        vendors: selectedVendors,
        schedule: schedule,
        guests: guests,
        theme: theme
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
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setDocuments(prev => [...prev, {
        name: file.name,
        url
      }]);
      
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
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
      
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        documents: arrayRemove(documents.find(doc => doc.name === fileName))
      });
      
      setDocuments(prev => prev.filter(doc => doc.name !== fileName));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (isLoading) return (
    <div className="loading">
      Loading event details...
    </div>
  );
  
  if (!event) return (
    <div className="error">
      <h2>Event Not Found</h2>
      <p>The requested event could not be found or you don't have permission to view it.</p>
      <button onClick={() => navigate('/planner-dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      if (dateString.toDate) {
        return dateString.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      if (dateString instanceof Date && !isNaN(dateString.getTime())) {
        return dateString.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return dateString;
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  return (
    <div className="event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="button-group">
          <button
            onClick={() => setActiveView('overview')}
            className={`new-button ${activeView === 'overview' ? 'active' : ''}`}
          >
            Event Overview
          </button>
          <button
            onClick={() => setActiveView('guests')}
            className={`new-button ${activeView === 'guests' ? 'active' : ''}`}
          >
            Guest Management
          </button>
          <button
            onClick={() => setActiveView('vendors')}
            className={`new-button ${activeView === 'vendors' ? 'active' : ''}`}
          >
            Vendor Management
          </button>
          <button
            onClick={() => setActiveView('documents')}
            className={`new-button ${activeView === 'documents' ? 'active' : ''}`}
          >
            Document Management
          </button>
        </div>
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

      <div className="event-info-boxes">
        <div className="info-box date-box">
          <h4><FaCalendarAlt /> Date</h4>
          <p>{isEditing ? (
            <input 
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
            />
          ) : formatDisplayDate(event.date)}</p>
        </div>
        <div className="info-box time-box">
          <h4><FaClock /> Time</h4>
          <p>{isEditing ? (
            <input 
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
            />
          ) : event.time || 'Not specified'}</p>
        </div>
        <div className="info-box venue-box">
          <h4><FaMapMarkerAlt /> Venue</h4>
          <p>{isEditing ? (
            <input 
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleInputChange}
              placeholder="Venue"
            />
          ) : event.venue || 'Not specified'}</p>
        </div>
        <div className="info-box theme-box">
          <h4><FaStar /> Theme</h4>
          <p>{event.theme?.name || 'Not specified'}</p>
        </div>
      </div>
      
      <div className="event-sections">
        {activeView === 'overview' && (
          <>
            <section>
              <EventSchedule
                schedule={schedule}
                onUpdate={(newSchedule) => setSchedule(newSchedule)}
              />
            </section>
            
            <section>
              <EventTheme
                  theme={theme}
                  onUpdate={(newTheme) => setTheme(newTheme)}
              />
            </section>
          </>
        )}

        {activeView === 'guests' && (
            <GuestManagement
                guests={guests}
                onUpdate={setGuests}
            />
        )}
        
        {activeView === 'vendors' && (
          <section className="vendors-section">
            <div className="section-header">
              <h2>Vendors</h2>
              {isEditing ? (
                <button onClick={() => setIsEditing(false)} className="save-button">
                  <FaSave /> Save
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="edit-button">
                  <FaEdit /> Edit
                </button>
              )}
            </div>
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
        )}

        {activeView === 'documents' && (
          <section className="documents-section">
            <div className="documents-header">
              <h2>Documents</h2>
              {isEditing ? (
                <button onClick={() => setIsEditing(false)} className="save-button">
                  <FaSave /> Save
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="edit-button">
                  <FaEdit /> Edit
                </button>
              )}
            </div>
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
        )}
      </div>
    </div>
  );
};

export default EventDetails;
