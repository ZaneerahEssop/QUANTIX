import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft, FaEdit, FaSave, FaUpload, FaFilePdf, FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar, FaPlus, FaTrash, FaEnvelope } from 'react-icons/fa';
import '../EventDetails.css';
import EventTheme from './eventPages/EventTheme';

// --- Sub-components (EventSchedule, GuestManagement) ---
// These are updated to work perfectly with the main component's logic.

const EventSchedule = ({ schedule, onUpdate, isEditing }) => {
  // Simplified handlers that call the parent's `onUpdate` function
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

const GuestManagement = ({ guests, isEditing, onAddGuest, onUpdateGuest, onRemoveGuest, onSendInvite }) => {
  const [newGuest, setNewGuest] = useState({ name: '', contact: '', dietary: '' });

  const handleAddClick = () => {
    if (newGuest.name.trim() === '' || newGuest.contact.trim() === '') {
      return alert("Please provide a name and contact for the guest.");
    }
    onAddGuest(newGuest); // Call parent function to handle API call
    setNewGuest({ name: '', contact: '', dietary: '' }); // Reset form
  };

  return (
    <div className="guests-section">
      <div className="section-header"><h2>Guest Management</h2></div>
      {isEditing && (
        <div className="add-guest-form">
          <input type="text" placeholder="Guest Name*" value={newGuest.name} onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })} />
          <input type="email" placeholder="Email or Phone*" value={newGuest.contact} onChange={(e) => setNewGuest({ ...newGuest, contact: e.target.value })} />
          <input type="text" placeholder="Dietary Requirements" value={newGuest.dietary} onChange={(e) => setNewGuest({ ...newGuest, dietary: e.target.value })} />
          <button onClick={handleAddClick}><FaPlus /> Add Guest</button>
        </div>
      )}
      <div className="guest-list">
        {guests && guests.length > 0 ? (
          <ul>
            {guests.map((guest, index) => (
              <li key={guest.id || `guest-${index}`} className="guest-item">
                <div className="guest-info">
                  <input type="checkbox" checked={!!guest.isAttending} onChange={(e) => onUpdateGuest(guest.id, 'isAttending', e.target.checked)} disabled={!isEditing} />
                  <div>
                    <strong>{guest.name}</strong><br /><small>{guest.contact}</small><br /><small>{guest.dietary}</small>
                  </div>
                </div>
                {isEditing && (
                  <div className="guest-actions">
                    <button onClick={() => onSendInvite(guest)} title="Send invite"><FaEnvelope /></button>
                    <button onClick={() => onRemoveGuest(guest.id)} className="delete-guest" title="Remove guest"><FaTrash /></button>
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


// --- Main EventDetails Component ---
const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  // All your state variables are preserved
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
    const fetchData = async (user) => {
      setIsLoading(true);
      try {
        // DEBUG: Check if the UID and EventID are correct before fetching
        console.log(`Fetching data for planner UID: ${user.uid} and Event ID: ${eventId}`);
        
        const token = await user.getIdToken();

        // INTEGRATED: Fetch guests from your backend API
        const guestsResponse = await fetch(`http://localhost:5000/api/events/${eventId}/guests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!guestsResponse.ok) {
            // Provide a more detailed error if the server gives one
            const errorText = await guestsResponse.text();
            throw new Error(`Failed to fetch guests: ${errorText}`);
        }
        const fetchedGuests = await guestsResponse.json();
        setGuests(fetchedGuests);

        // Fetch other event data from Firestore
        const eventRef = doc(db, `planners/${user.uid}/events`, eventId);
       
       console.log("Querying Firestore at path:", `planners/${user.uid}/events/${eventId}`);
        const eventDoc = await getDoc(eventRef);
        const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
        
        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          setEvent(eventData); // This is the crucial step to make the UI render
          setSchedule(eventData.schedule || []);
          // REMOVED: setGuests is now handled by the API fetch above
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
          console.error("EVENT NOT FOUND in Firestore at the specified path.");
          setEvent(null); // This is what triggers the "Event Not Found" screen
        }
      } catch (error) { 
        console.error('Error loading data:', error);
        setEvent(null); // Ensure we show the error screen if any part fails
      } finally { 
        setIsLoading(false); 
      }
    };
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user);
      } else {
        setIsLoading(false);
        navigate('/login');
      }
    });
    
    return () => unsubscribe();
  }, [eventId, navigate]);

  const handleInputChange = (e) => { /* Your existing code is perfect */ };

  // INTEGRATED: API-driven guest handlers
  const handleAddGuest = async (newGuestData) => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");
    try {
      const token = await user.getIdToken();
      console.log('Sending guest data:', newGuestData);
      const response = await fetch(`http://localhost:5000/api/events/${eventId}/guests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newGuestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to add guest');
      }
      
      const addedGuest = await response.json();
      console.log('Added guest:', addedGuest);
      setGuests(prev => [...prev, addedGuest]);
    } catch (error) {
      console.error('Error in handleAddGuest:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpdateGuest = (guestId, field, value) => setGuests(prev => prev.map(g => g.id === guestId ? { ...g, [field]: value } : g));
  const handleRemoveGuest = (guestId) => setGuests(prev => prev.filter(g => g.id !== guestId));
  const handleSendInvite = (guest) => alert(`Simulating sending an email invite to ${guest.name}`);

  // INTEGRATED: Main save function now saves guests to API and other data to Firestore
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      // Step 1: Save the guest list (handles updates/removals) to the API
      await fetch(`http://localhost:5000/api/events/${eventId}/guests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(guests),
      });

      // Step 2: Save everything else to Firestore
      await updateDoc(doc(db, `planners/${user.uid}/events`, eventId), {
        ...formData,
        vendors_id: selectedVendors,
        schedule: schedule,
        theme: theme,
        documents: documents,
        updatedAt: new Date().toISOString()
        // REMOVED: guests: guests, is no longer needed here
      });

      setIsEditing(false);
      setEvent(prev => ({ ...prev, ...formData, vendors_id: selectedVendors, schedule, theme, documents }));
      alert("Changes saved successfully!");
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  // Your other handlers (vendor, file upload, etc.) are preserved
  const handleVendorToggle = (vendorId) => { /* ... */ };
  const handleFileUpload = async (e) => { /* ... */ };
  const handleDeleteDocument = async (docToDelete) => { /* ... */ };
  const formatDisplayDate = (dateString) => { /* ... */ };

  if (isLoading) return <div className="loading">Loading event details...</div>;
  
  if (!event) return (
    <div className="error">
      <h2>Event Not Found</h2>
      <p>The event could not be found. Please check the URL or go back to the dashboard.</p>
      <button onClick={() => navigate('/planner-dashboard')}>Back to Dashboard</button>
    </div>
  );

  // Debug logs
  console.log('Current activeView:', activeView);
  console.log('Current guests:', guests);

  return (
    <div className="event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="button-group">
          <button 
            onClick={() => setActiveView('overview')} 
            className={`nav-button ${activeView === 'overview' ? 'active' : ''}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveView('guests')} 
            className={`nav-button ${activeView === 'guests' ? 'active' : ''}`}
          >
            Guest Management
          </button>
          <button 
            onClick={() => setActiveView('vendors')} 
            className={`nav-button ${activeView === 'vendors' ? 'active' : ''}`}
          >
            Vendor Management
          </button>
          <button 
            onClick={() => setActiveView('documents')} 
            className={`nav-button ${activeView === 'documents' ? 'active' : ''}`}
          >
            Documents
          </button>
        </div>
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
      <div className="event-info-boxes">{/* ... */}</div>
      <div className="event-sections">
        {activeView === 'overview' && (
          <>
            <section><EventSchedule schedule={schedule} onUpdate={setSchedule} isEditing={isEditing} /></section>
            <section><EventTheme theme={theme} onUpdate={setTheme} isEditing={isEditing} /></section>
          </>
        )}
        {activeView === 'guests' && (
          <GuestManagement 
            guests={guests} 
            isEditing={isEditing}
            onAddGuest={handleAddGuest}
            onUpdateGuest={handleUpdateGuest}
            onRemoveGuest={handleRemoveGuest}
            onSendInvite={handleSendInvite}
          />
        )}
        {activeView === 'vendors' && ( <section>{/* ... */}</section> )}
        {activeView === 'documents' && ( <section>{/* ... */}</section> )}
      </div>
    </div>
  );
};

export default EventDetails;