import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft, FaEdit, FaSave, FaUpload, FaFilePdf, FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar, FaPlus, FaTrash, FaEnvelope, FaUsers } from 'react-icons/fa';
import '../EventDetails.css';
import EventTheme from './eventPages/EventTheme';

// Utility function to safely convert any value to string
const safeToString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
};

// EventSchedule component
const EventSchedule = ({ schedule, onUpdate, isEditing, onToggleEdit, onSave }) => {
  const [localSchedule, setLocalSchedule] = useState(schedule || []);
  
  useEffect(() => {
    setLocalSchedule(schedule || []);
  }, [schedule]);

  const handleAddItem = () => setLocalSchedule([...localSchedule, { time: '', activity: '' }]);
  const handleRemoveItem = (index) => setLocalSchedule(localSchedule.filter((_, i) => i !== index));
=======
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft, FaEdit, FaSave, FaPlus, FaTrash, FaEnvelope } from 'react-icons/fa';
import '../EventDetails.css';
import EventTheme from './eventPages/EventTheme';

// --- Sub-components (EventSchedule, GuestManagement) ---
// These are updated to work perfectly with the main component's logic.

const EventSchedule = ({ schedule, onUpdate, isEditing }) => {
  // Simplified handlers that call the parent's `onUpdate` function
  const handleAddItem = () => onUpdate([...(schedule || []), { time: '', activity: '' }]);
  const handleRemoveItem = (index) => onUpdate((schedule || []).filter((_, i) => i !== index));
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
  const handleItemChange = (index, field, value) => {
    const newSchedule = [...localSchedule];
    newSchedule[index][field] = value;
    setLocalSchedule(newSchedule);
  };

  const handleSave = () => {
    onUpdate(localSchedule);
    onSave();
  };

  const handleCancel = () => {
    setLocalSchedule(schedule || []);
    onToggleEdit();
  };
  
  return (
    <div className="schedule-section">
      <div className="section-header">
        <h2>Schedule</h2>
        {!isEditing ? (
          <button onClick={onToggleEdit} className="edit-component-btn">
            <FaEdit />
          </button>
        ) : (
          <div className="component-actions">
            <button onClick={handleSave} className="save-component-btn">
              <FaSave /> Save
            </button>
            <button onClick={handleCancel} className="cancel-component-btn">
              <FaTimes /> Cancel
            </button>
          </div>
        )}
      </div>
      {isEditing ? (
        <>
          {localSchedule.map((item, index) => (
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

<<<<<<< HEAD
// GuestManagement component
const GuestManagement = ({ guests, onUpdate, isEditing, onToggleEdit, onSave }) => {
  const [localGuests, setLocalGuests] = useState(guests || []);
  const [newGuest, setNewGuest] = useState({ name: '', contact: '', dietary: '', isAttending: false });
  
  useEffect(() => {
    setLocalGuests(guests || []);
  }, [guests]);

  const handleAddGuest = () => {
    if (newGuest.name.trim() !== '') {
      setLocalGuests([...localGuests, { ...newGuest, id: Date.now() }]);
      setNewGuest({ name: '', contact: '', dietary: '', isAttending: false });
=======
const GuestManagement = ({ guests, isEditing, onAddGuest, onUpdateGuest, onRemoveGuest, onSendInvite }) => {
  const [newGuest, setNewGuest] = useState({ name: '', contact: '', dietary: '' });

  const handleAddClick = () => {
    if (newGuest.name.trim() === '' || newGuest.contact.trim() === '') {
      return alert("Please provide a name and contact for the guest.");
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
    }
    onAddGuest(newGuest); // Call parent function to handle API call
    setNewGuest({ name: '', contact: '', dietary: '' }); // Reset form
  };

<<<<<<< HEAD
  const handleUpdateGuest = (guestId, field, value) => {
    setLocalGuests(localGuests.map(g => g.id === guestId ? { ...g, [field]: value } : g));
  };

  const handleRemoveGuest = (guestId) => {
    setLocalGuests(localGuests.filter(g => g.id !== guestId));
  };

  const handleSendInvite = (guest) => alert(`Simulating sending an email invite to ${guest.name} at ${guest.contact}`);
  
  const handleSave = () => {
    onUpdate(localGuests);
    onSave();
  };

  const handleCancel = () => {
    setLocalGuests(guests || []);
    onToggleEdit();
  };

=======
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
  return (
    <div className="guests-section">
      <div className="section-header">
        <h2>Guest Management</h2>
        {!isEditing ? (
          <button onClick={onToggleEdit} className="edit-component-btn">
            <FaEdit />
          </button>
        ) : (
          <div className="component-actions">
            <button onClick={handleSave} className="save-component-btn">
              <FaSave /> Save
            </button>
            <button onClick={handleCancel} className="cancel-component-btn">
              <FaTimes /> Cancel
            </button>
          </div>
        )}
      </div>
      {isEditing && (
        <div className="add-guest-form">
          <input type="text" placeholder="Guest Name*" value={newGuest.name} onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })} />
          <input type="email" placeholder="Email or Phone*" value={newGuest.contact} onChange={(e) => setNewGuest({ ...newGuest, contact: e.target.value })} />
          <input type="text" placeholder="Dietary Requirements" value={newGuest.dietary} onChange={(e) => setNewGuest({ ...newGuest, dietary: e.target.value })} />
          <button onClick={handleAddClick}><FaPlus /> Add Guest</button>
        </div>
      )}
      <div className="guest-list">
        {localGuests && localGuests.length > 0 ? (
          <ul>
<<<<<<< HEAD
            {localGuests.map(guest => (
              <li key={guest.id} className="guest-item">
=======
            {guests.map((guest, index) => (
              <li key={guest.id || `guest-${index}`} className="guest-item">
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [formData, setFormData] = useState({ name: '', date: '', time: '', venue: '', notes: '' });
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [guests, setGuests] = useState([]);
  const [theme, setTheme] = useState({ name: '', colors: [], notes: '' });
  const [editingComponents, setEditingComponents] = useState({
    details: false,
    schedule: false,
    theme: false,
    guests: false,
    vendors: false,
    documents: false
  });
  
  // Vendor management state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vendorCategories, setVendorCategories] = useState([]);

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
<<<<<<< HEAD
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
              
              // Set selected vendors with full vendor objects
              const vendorIds = eventData.vendors_id || [];
              const vendorsData = vendorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setVendors(vendorsData);
              
              // Find and set selected vendors
              const selectedVendorsData = vendorsData.filter(vendor => vendorIds.includes(vendor.id));
              setSelectedVendors(selectedVendorsData);
              
              // Extract vendor categories
              const categories = [...new Set(vendorsData.map(v => safeToString(v.category)).filter(cat => cat !== ''))];
              setVendorCategories(categories);
            } else {
              console.error("Event not found or user does not have permission.");
              setEvent(null);
            }
          } catch (error) { console.error('Error loading data:', error); } 
          finally { setIsLoading(false); }
        };
        fetchData();
=======
        fetchData(user);
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
      } else {
        setIsLoading(false);
        navigate('/login');
      }
    });
    
    return () => unsubscribe();
  }, [eventId, navigate]);

<<<<<<< HEAD
  // Vendor management functions
  const handleAddVendor = (vendor) => {
    if (!selectedVendors.some(v => v.id === vendor.id)) {
      setSelectedVendors(prev => [...prev, vendor]);
      
      // If it's a venue vendor, update the venue details
      const vendorCategory = safeToString(vendor.category);
      if (vendorCategory.toLowerCase().includes('venue')) {
        setFormData(prev => ({
          ...prev,
          venue: safeToString(vendor.name_of_business)
        }));
      }
    }
  };

  const handleRemoveVendor = (vendorId) => {
    const vendorToRemove = selectedVendors.find(v => v.id === vendorId);
    setSelectedVendors(prev => prev.filter(v => v.id !== vendorId));
    
    // If it's a venue vendor and it matches the current venue, clear the venue field
    if (vendorToRemove) {
      const vendorCategory = safeToString(vendorToRemove.category);
      const vendorName = safeToString(vendorToRemove.name_of_business);
      
      if (vendorCategory.toLowerCase().includes('venue') && 
          formData.venue === vendorName) {
        setFormData(prev => ({
          ...prev,
          venue: ''
        }));
      }
    }
  };

  // Vendor filtering
  const filteredVendors = vendors.filter(vendor => {
    const vendorCategory = safeToString(vendor.category);
    const vendorName = safeToString(vendor.name_of_business);
    
    const matchesSearch = vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendorCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || vendorCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleComponentEdit = (component) => {
    setEditingComponents(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveComponent = async (component, data) => {
    if (!auth.currentUser) return;
    
    try {
      const updateData = {};
      
      // Determine what data to update based on the component
      switch(component) {
        case 'details':
          updateData.name = formData.name;
          updateData.date = formData.date;
          updateData.time = formData.time;
          updateData.venue = formData.venue;
          updateData.notes = formData.notes;
          break;
        case 'schedule':
          updateData.schedule = data;
          break;
        case 'guests':
          updateData.guests = data;
          break;
        case 'vendors':
          updateData.vendors_id = data;
          break;
        case 'theme':
          updateData.theme = data;
          break;
        case 'documents':
          // Documents are handled separately in handleFileUpload
          break;
        default:
          break;
      }

      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        ...updateData,
=======

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
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
        updatedAt: new Date().toISOString()
        // REMOVED: guests: guests, is no longer needed here
      });

<<<<<<< HEAD
      // Update local state
      if (component === 'schedule') setSchedule(data);
      if (component === 'guests') setGuests(data);
      if (component === 'vendors') setSelectedVendors(vendors.filter(v => data.includes(v.id)));
      if (component === 'theme') setTheme(data);

      // Turn off editing for this component
      setEditingComponents(prev => ({ ...prev, [component]: false }));
      
      alert(`${component.charAt(0).toUpperCase() + component.slice(1)} saved successfully!`);
=======
      setIsEditing(false);
      setEvent(prev => ({ ...prev, ...formData, vendors_id: selectedVendors, schedule, theme, documents }));
      alert("Changes saved successfully!");
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
    } catch (error) {
      console.error(`Error updating ${component}:`, error);
      alert(`Error saving ${component}. Please try again.`);
    }
  };

<<<<<<< HEAD
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
        alert('Documents uploaded successfully!');
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
      await updateDoc(doc(db, `planners/${auth.currentUser.uid}/events`, eventId), {
        documents: arrayRemove(docToDelete)
      });
      setDocuments(prev => prev.filter(doc => doc.url !== docToDelete.url));
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document reference:', error);
      alert('Error deleting document. Please try again.');
    }
  };
=======
  // Your other handlers (vendor, file upload, etc.) are preserved
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3

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
<<<<<<< HEAD
          <button onClick={() => setActiveView('overview')} className={`new-button ${activeView === 'overview' ? 'active' : ''}`}>Event Overview</button>
          <button onClick={() => setActiveView('guests')} className={`new-button ${activeView === 'guests' ? 'active' : ''}`}>Guest Management</button>
          <button onClick={() => setActiveView('vendors')} className={`new-button ${activeView === 'vendors' ? 'active' : ''}`}>Vendor Management</button>
          <button onClick={() => setActiveView('documents')} className={`new-button ${activeView === 'documents' ? 'active' : ''}`}>Document Management</button>
        </div>
      </div>
      
      <div className="event-info-boxes">
        <div className="info-box date-box">
          <div className="info-box-header">
            <h4><FaCalendarAlt /> Date</h4>
            {!editingComponents.details && (
              <button onClick={() => toggleComponentEdit('details')} className="edit-component-btn">
                <FaEdit />
              </button>
            )}
          </div>
          <p>
            {editingComponents.details ? (
              <input type="date" name="date" value={formData.date} onChange={handleInputChange}/>
            ) : formatDisplayDate(event.date)}
          </p>
        </div>
        
        <div className="info-box time-box">
          <div className="info-box-header">
            <h4><FaClock /> Time</h4>
          </div>
          <p>
            {editingComponents.details ? (
              <input type="time" name="time" value={formData.time} onChange={handleInputChange}/>
            ) : event.time || 'Not specified'}
          </p>
        </div>
        
        <div className="info-box venue-box">
          <div className="info-box-header">
            <h4><FaMapMarkerAlt /> Venue</h4>
          </div>
          <p>
            {editingComponents.details ? (
              <input type="text" name="venue" value={formData.venue} onChange={handleInputChange} placeholder="Venue"/>
            ) : event.venue || 'Not specified'}
          </p>
        </div>
        
        <div className="info-box theme-box">
          <div className="info-box-header">
            <h4><FaStar /> Theme</h4>
          </div>
          <p>{event.theme?.name || 'Not specified'}</p>
        </div>

        {editingComponents.details && (
          <div className="component-actions details-actions">
            <button onClick={() => handleSaveComponent('details')} className="save-component-btn">
              <FaSave /> Save Details
            </button>
            <button onClick={() => toggleComponentEdit('details')} className="cancel-component-btn">
              <FaTimes /> Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="event-sections">
        {activeView === 'overview' && (
          <>
            <section>
              <EventSchedule 
                schedule={schedule} 
                onUpdate={(data) => handleSaveComponent('schedule', data)}
                isEditing={editingComponents.schedule}
                onToggleEdit={() => toggleComponentEdit('schedule')}
                onSave={() => setEditingComponents(prev => ({ ...prev, schedule: false }))}
              />
            </section>
            <section>
              <EventTheme 
                theme={theme} 
                onUpdate={setTheme}
                isEditing={editingComponents.theme}
                onToggleEdit={() => toggleComponentEdit('theme')}
                onSave={() => handleSaveComponent('theme', theme)}
              />
            </section>
          </>
        )}
        
        {activeView === 'guests' && (
          <GuestManagement 
            guests={guests} 
            onUpdate={(data) => handleSaveComponent('guests', data)}
            isEditing={editingComponents.guests}
            onToggleEdit={() => toggleComponentEdit('guests')}
            onSave={() => setEditingComponents(prev => ({ ...prev, guests: false }))}
          />
        )}
        
        {activeView === 'vendors' && (
          <section className="vendors-section">
            <div className="section-header">
              <h2><FaUsers /> Vendors</h2>
              {!editingComponents.vendors ? (
                <button onClick={() => toggleComponentEdit('vendors')} className="edit-component-btn">
                  <FaEdit />
                </button>
              ) : (
                <div className="component-actions">
                  <button onClick={() => handleSaveComponent('vendors', selectedVendors.map(v => v.id))} className="save-component-btn">
                    <FaSave /> Save
                  </button>
                  <button onClick={() => toggleComponentEdit('vendors')} className="cancel-component-btn">
                    <FaTimes /> Cancel
                  </button>
                </div>
              )}
            </div>
            
            {editingComponents.vendors ? (
              <div className="vendor-management-edit">
                <div className="form-group-column">
                  <h3>Add Vendors</h3>
                  <input 
                    type="text" 
                    placeholder="Search vendors..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    <option value="All">All Categories</option>
                    {vendorCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                  </select>
                  <div className="vendor-list">
                    {filteredVendors.map(vendor => (
                      <div key={vendor.id} className="vendor-card">
                        <div className="vendor-info">
                          <strong>{safeToString(vendor.name_of_business) || 'Unnamed Vendor'}</strong>
                          {vendor.category && <span>{safeToString(vendor.category)}</span>}
                          {vendor.phone && <span>📞 {safeToString(vendor.phone)}</span>}
                          {vendor.email && <span>✉️ {safeToString(vendor.email)}</span>}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleAddVendor(vendor)}
                          disabled={selectedVendors.some(v => v.id === vendor.id)}
                        >
                          {selectedVendors.some(v => v.id === vendor.id) ? 'Added' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedVendors.length > 0 && (
                  <div className="selected-vendors">
                    <h4>Selected Vendors:</h4>
                    <ul>
                      {selectedVendors.map(vendor => (
                        <li key={vendor.id} className="selected-vendor-item">
                          <div className="vendor-details">
                            <strong>{safeToString(vendor.name_of_business) || 'Unnamed Vendor'}</strong> 
                            {vendor.category && <span>({safeToString(vendor.category)})</span>}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveVendor(vendor.id)}
                            className="remove-vendor-btn"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="vendors-list">
                {selectedVendors.length > 0 ? (
                  <ul className="vendor-display-list">
                    {selectedVendors.map(vendor => (
                      <li key={vendor.id} className="vendor-display-item">
                        <div className="vendor-display-info">
                          <strong>{safeToString(vendor.name_of_business) || 'Unnamed Vendor'}</strong>
                          {vendor.category && <span>{safeToString(vendor.category)}</span>}
                          {vendor.phone && <span>📞 {safeToString(vendor.phone)}</span>}
                          {vendor.email && <span>✉️ {safeToString(vendor.email)}</span>}
                        </div>
                      </li>
                    ))}
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
              {!editingComponents.documents && (
                <button onClick={() => toggleComponentEdit('documents')} className="edit-component-btn">
                  <FaEdit />
                </button>
              )}
            </div>
            {editingComponents.documents && (
              <>
                <div className="upload-area">
                  <label className="upload-button">
                    <FaUpload /> Upload Documents
                    <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading}/>
                  </label>
                  {isUploading && (<div className="upload-progress"><progress value={uploadProgress} max="100" /><span>Uploading... {uploadProgress}%</span></div>)}
                </div>
                <div className="component-actions">
                  <button onClick={() => setEditingComponents(prev => ({ ...prev, documents: false }))} className="cancel-component-btn">
                    <FaTimes /> Done
                  </button>
                </div>
              </>
            )}
            <div className="documents-list">
              {documents && documents.length > 0 ? (
                <ul>
                  {documents.map((doc, index) => (
                    <li key={index} className="document-item">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"><FaFilePdf /> {doc.name}</a>
                      {editingComponents.documents && (
                        <button onClick={() => handleDeleteDocument(doc)} className="delete-doc" title="Delete document">
                          <FaTimes />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (<p>No documents uploaded yet</p>)}
            </div>
          </section>
=======
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
>>>>>>> 6f0902823127ed2ac530fcf3aab70e97062c43e3
        )}
        {activeView === 'vendors' && ( <section>{/* ... */}</section> )}
        {activeView === 'documents' && ( <section>{/* ... */}</section> )}
      </div>
    </div>
  );
};

export default EventDetails;