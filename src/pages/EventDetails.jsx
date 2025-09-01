import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, query, where } from 'firebase/firestore';
// EDIT: Removed 'storage' from firebase imports as it's not used with Cloudinary
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft, FaEdit, FaSave, FaUpload, FaFilePdf, FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar, FaPlus, FaTrash, FaEnvelope } from 'react-icons/fa';
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
    }
  };

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
          <button onClick={handleAddGuest}><FaPlus /> Add Guest</button>
        </div>
      )}
      <div className="guest-list">
        {localGuests && localGuests.length > 0 ? (
          <ul>
            {localGuests.map(guest => (
              <li key={guest.id} className="guest-item">
                <div className="guest-info">
                  <input type="checkbox" checked={!!guest.isAttending} onChange={(e) => handleUpdateGuest(guest.id, 'isAttending', e.target.checked)} disabled={!isEditing} />
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

//vendor and venue management
// VendorManagement Component (now properly defined)
const VendorManagement = ({ eventId,  eventDate }) => {
  const [activeVendorTab, setActiveVendorTab] = useState('vendors-list');
  const [allVendors, setAllVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [bookedVendors, setBookedVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newVendor, setNewVendor] = useState({
    name: '',
    type: '',
    price: '',
    availability: '',
    notes: ''
  });
  const [compareFilterCategory, setCompareFilterCategory] = useState('all');
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  // NEW STATE: Track edit mode for this component
  const [isEditing, setIsEditing] = useState(false);

  // Load selected vendors from Firestore for this event
  useEffect(() => {
    const fetchEventVendors = async () => {
      if (!auth.currentUser) return;
      
      try {
        const eventRef = doc(db, `planners/${auth.currentUser.uid}/events`, eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          // Load vendors connected to this event
          if (eventData.vendors && Array.isArray(eventData.vendors)) {
            setSelectedVendors(eventData.vendors);
          }
        }
      } catch (error) {
        console.error('Error fetching event vendors:', error);
      }
    };

    fetchEventVendors();
  }, [eventId]);

  // Save selected vendors to Firestore whenever they change
  useEffect(() => {
    const saveVendorsToFirestore = async () => {
      if (!auth.currentUser || selectedVendors.length === 0) return;
      
      try {
        const eventRef = doc(db, `planners/${auth.currentUser.uid}/events`, eventId);
        await updateDoc(eventRef, {
          vendors: selectedVendors,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error saving vendors to Firestore:', error);
      }
    };

    if (selectedVendors.length > 0) {
      saveVendorsToFirestore();
    }
  }, [selectedVendors, eventId]);

  // Fetch all vendors and check booking status
  useEffect(() => {
    const fetchVendorsAndBookings = async () => {
      setIsLoading(true);
      try {
        // Fetch all vendors from Firestore
        const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
        const vendorsData = vendorsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // Expand vendors with multiple categories into multiple entries
        const expandedVendors = [];
        vendorsData.forEach(vendor => {
          if (Array.isArray(vendor.category) && vendor.category.length > 0) {
            // Vendor has multiple categories - create an entry for each category
            vendor.category.forEach(category => {
              expandedVendors.push({
                ...vendor,
                displayCategory: category,
                originalId: vendor.id,
                uniqueId: `${vendor.id}_${category}`
              });
            });
          } else {
            // Vendor has single category or no category
            expandedVendors.push({
              ...vendor,
              displayCategory: Array.isArray(vendor.category) 
                ? vendor.category[0] || 'No category'
                : vendor.category || vendor.type || 'No category',
              originalId: vendor.id,
              uniqueId: vendor.id
            });
          }
        });
        
        setAllVendors(expandedVendors);

        // If we have an event date, check for vendor conflicts
        if (eventDate) {
          // Fetch events happening on the same date to check for vendor conflicts
          const eventsQuery = query(
            collection(db, 'events'), 
            where('date', '==', eventDate)
          );
          const querySnapshot = await getDocs(eventsQuery);
          
          const bookedVendorIds = new Set();
          querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            if (eventData.vendors_id && Array.isArray(eventData.vendors_id)) {
              eventData.vendors_id.forEach(vendorId => bookedVendorIds.add(vendorId));
            }
          });
          
          setBookedVendors(Array.from(bookedVendorIds));
        }
      } catch (error) {
        console.error('Error fetching vendors or bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorsAndBookings();
  }, [eventDate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVendor({ ...newVendor, [name]: value });
  };

  const handleAddVendor = () => {
    if (newVendor.name && newVendor.type) {
      const vendor = {
        id: `external_${Date.now()}`, // Unique ID for external vendor
        name_of_business: newVendor.name,
        category: newVendor.type,
        price: newVendor.price ? Number(newVendor.price) : 0,
        availability: newVendor.availability,
        notes: newVendor.notes,
        status: 'not booked',
        isExternal: true, // Flag to identify external vendors
        displayCategory: newVendor.type,
        originalId: `external_${Date.now()}`,
        uniqueId: `external_${Date.now()}_${newVendor.type}`
      };
      setSelectedVendors([...selectedVendors, vendor]);
      setNewVendor({ name: '', type: '', price: '', availability: '', notes: '' });
    }
  };

  const handleSelectVendor = (vendor, manualPrice= null) => {
    // Check if vendor is already selected
    if (!selectedVendors.some(v => v.uniqueId === vendor.uniqueId)) {
      const vendorWithStatus = {
        ...vendor,
        status: 'not booked',
        // Ensure all required fields are present
        name_of_business: vendor.name_of_business || vendor.name || 'Unnamed Vendor',
        category: vendor.category || vendor.type || 'No category',
        price: manualPrice !== null ? Number(manualPrice) : (vendor.price || 0),
        isExternal: vendor.isExternal || false
      };
      setSelectedVendors([...selectedVendors, vendorWithStatus]);
    }
  };

  const handleRemoveVendor = async (vendorId) => {
    if (!auth.currentUser) return;
    
    try {
      // Remove from local state
      const updatedVendors = selectedVendors.filter(vendor => vendor.uniqueId !== vendorId);
      setSelectedVendors(updatedVendors);
      
      // Update Firestore
      const eventRef = doc(db, `planners/${auth.currentUser.uid}/events`, eventId);
      await updateDoc(eventRef, {
        vendors: updatedVendors,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error removing vendor:', error);
    }
  };

  const handleUpdateVendorStatus = async (vendorId, status) => {
    if (!auth.currentUser) return;
    
    try {
      // Update local state
      const updatedVendors = selectedVendors.map(vendor => 
        vendor.uniqueId === vendorId ? { ...vendor, status } : vendor
      );
      setSelectedVendors(updatedVendors);
      
      // Update Firestore
      const eventRef = doc(db, `planners/${auth.currentUser.uid}/events`, eventId);
      await updateDoc(eventRef, {
        vendors: updatedVendors,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating vendor status:', error);
    }
  };

//price functions



  const handleStartEditPrice = (vendorId, currentPrice) => {
    setEditingVendorId(vendorId);
    setTempPrice(currentPrice || '');
  };

  // NEW FUNCTION: Handle price edit save
  const handleSaveEditPrice = async (vendorId) => {
    if (!auth.currentUser) return;
    
    try {
      const updatedVendors = selectedVendors.map(vendor =>
        vendor.uniqueId === vendorId ? { ...vendor, price: Number(tempPrice) } : vendor
      );
      setSelectedVendors(updatedVendors);
      setEditingVendorId(null);
      setTempPrice('');

      // Save to Firestore
      const eventRef = doc(db, `planners/${auth.currentUser.uid}/events`, eventId);
      await updateDoc(eventRef, {
        vendors: updatedVendors,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating vendor price:', error);
    }
  };

  // NEW FUNCTION: Handle price edit cancel
  const handleCancelEditPrice = () => {
    setEditingVendorId(null);
    setTempPrice('');
  };

    const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

    // NEW FUNCTION: Toggle edit mode
    const toggleEditMode = () => {
      setIsEditing(!isEditing);
      // Reset editing states when turning off edit mode
      if (isEditing) {
        setEditingVendorId(null);
        setTempPrice('');
      }
    };

  const isVendorAvailable = (vendorId) => {
    return !bookedVendors.includes(vendorId);
  };

  const vendorCategories = [
    'Venue', 'Catering', 'Photography', 'Flowers', 
    'Music', 'Decor', 'Other'
  ];


    // ... rest of your existing functions

  if (isLoading) {
    return <div className="loading">Loading vendors...</div>;
  }

  // Get available vendors (not already selected and not booked)
  const availableVendors = allVendors.filter(vendor => 
    !selectedVendors.some(selected => selected.uniqueId === vendor.uniqueId) && 
    isVendorAvailable(vendor.originalId)
  );

  const handleSaveChanges = () => {
    // Any save logic you need before exiting edit mode
    setIsEditing(false);
    setEditingVendorId(null);
    setTempPrice('');
  };

  return (
    <div className="vendor-management-section">
      {/* Add Edit Mode Toggle Button */}
      <div>
       <div className="edit-mode-toggle">
        {!isEditing && (
          <button onClick={toggleEditMode} className="edit-component-btn">
            <FaEdit /> Edit Vendors
          </button>
        )}
        {isEditing && (
          <div className="component-actions vendor-actions">
            <button onClick={handleSaveChanges} className="save-component-btn">
              <FaSave /> Save Vendors
            </button>
            <button onClick={toggleEditMode} className="cancel-component-btn">
              <FaTimes /> Cancel
            </button>
          </div>
        )}
        </div>
      </div>

      <div className="vendor-tabs">
        <button 
          className={activeVendorTab === 'vendors-list' ? 'active' : ''}
          onClick={() => setActiveVendorTab('vendors-list')}
        >
          Vendors & Venues
        </button>
        <button 
          className={activeVendorTab === 'compare' ? 'active' : ''}
          onClick={() => setActiveVendorTab('compare')}
        >
          Compare Prices
        </button>
        <button 
          className={activeVendorTab === 'selected' ? 'active' : ''}
          onClick={() => setActiveVendorTab('selected')}
        >
          Selected Vendors ({selectedVendors.length})
        </button>
        <button 
          className={activeVendorTab === 'notes' ? 'active' : ''}
          onClick={() => setActiveVendorTab('notes')}
        >
          Booking Notes
        </button>
      </div>

      <div className="vendor-content">
        {activeVendorTab === 'vendors-list' && (
          <div className="vendor-list-container">
            {/* Show available vendors first */}
            <div className="vendors-list">
              <h3>Available Vendors {eventDate && `for ${eventDate}`}</h3>
              {availableVendors.length === 0 ? (
                <p>No available vendors. All vendors are either booked or already selected.</p>
              ) : (
                <div className="vendor-items">
                  {availableVendors.map(vendor => (
                    <div key={vendor.uniqueId} className="vendor-item available">
                      <div className="vendor-info">
                        <h4>{vendor.name_of_business || vendor.name || 'Unnamed Vendor'}</h4>
                        <p className="vendor-type">{vendor.displayCategory}</p>
                        <div className="vendor-price-edit">
                          {isEditing ? (
                            <input
                              type="number"
                              value={vendor.price}
                              placeholder="Enter price"
                              onChange={(e) => {
                                // Update the price in the available vendors list
                                const updatedVendors = allVendors.map(v => 
                                  v.uniqueId === vendor.uniqueId ? { ...v, price: e.target.value } : v
                                );
                                setAllVendors(updatedVendors);
                              }}
                              className="price-input"
                            />
                          ) : (
                            <p className="vendor-price">{vendor.price ? `R${vendor.price}` : ''}</p>
                          )}
                        </div>

                        <div className="vendor-status">
                          <span className="status-available">Available</span>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="vendor-actions">
                          <button 
                            onClick={() => handleSelectVendor(vendor, vendor.price)}
                            className="select-vendor-btn"
                          >
                            Select Vendor
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Show "Add Vendor" form after the available vendors */}
            {isEditing && (
              <div className="add-vendor-form">
                <h3>Add External Vendor</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vendor Type</label>
                    <select 
                      name="type" 
                      value={newVendor.type} 
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Type</option>
                      {vendorCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vendor Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={newVendor.name} 
                      onChange={handleInputChange}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Price (R)</label>
                    <input 
                      type="number" 
                      name="price" 
                      value={newVendor.price} 
                      onChange={handleInputChange}
                      placeholder="Enter price"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Availability</label>
                    <input 
                      type="date" 
                      name="availability" 
                      value={newVendor.availability} 
                      onChange={handleInputChange}
                      min={getTodayDate()}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea 
                    name="notes" 
                    value={newVendor.notes} 
                    onChange={handleInputChange}
                    placeholder="Add any notes about this vendor"
                  />
                </div>
                <button onClick={handleAddVendor} className="add-vendor-btn">
                  Add to Selected Vendors
                </button>
              </div>
            )}
          </div>
        )}

        {activeVendorTab === 'compare' && (
          <div className="compare-prices">
            <h3>Compare Vendor Prices</h3>
            
            {/* Add category filter dropdown */}
            <div className="category-filter">
              <label htmlFor="category-filter">Filter by Category: </label>
              <select 
                id="category-filter"
                value={compareFilterCategory} 
                onChange={(e) => setCompareFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {vendorCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {allVendors.length === 0 && selectedVendors.length === 0 ? (
              <p>No vendors to compare.</p>
            ) : (
              <div className="comparison-table">
                <table>
                  <thead>
                    <tr>
                      <th>Business Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Availability Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Filter vendors based on selected category */}
                    {[...selectedVendors, ...allVendors]
                      .filter(vendor => 
                        compareFilterCategory === 'all' || 
                        vendor.displayCategory === compareFilterCategory
                      )
                      .map(vendor => {
                        const isSelected = selectedVendors.some(v => v.uniqueId === vendor.uniqueId);
                        const isAvailable = isVendorAvailable(vendor.originalId);
                        // Fix: Provide a default status if undefined
                        const status = vendor.status || 'not selected';
                        
                        return (
                          <tr 
                            key={vendor.uniqueId} 
                            className={
                              isSelected ? 'selected-vendor-row' : 
                              !isAvailable ? 'booked-row' : ''
                            }
                          >
                            <td>{vendor.name_of_business || vendor.name || 'Unnamed Vendor'}</td>
                            <td>{vendor.displayCategory}</td>
                            <td>R{vendor.price || 'N/A'}</td>
                            <td>
                              {isSelected ? (
                                <span className={`status-${status.replace(' ', '-')}`}>
                                  {status}
                                </span>
                              ) : (
                                'Not Selected'
                              )}
                            </td>
                            <td>
                              {isAvailable ? 
                                <span className="status-available">Available</span> : 
                                <span className="status-booked">Booked</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeVendorTab === 'selected' && (
          <div className="selected-vendors">
            <h3>Selected Vendors</h3>
            {selectedVendors.length === 0 ? (
              <p>No vendors selected yet. Select vendors from the available list or add new ones.</p>
            ) : (
              <div className="selected-vendors-list">
                {selectedVendors.map(vendor => (
                  <div key={vendor.uniqueId} className="selected-vendor-item">
                    <div className="vendor-info">
                      <h4>{vendor.name_of_business || vendor.name || 'Unnamed Vendor'}</h4>
                      <p className="vendor-type">{vendor.displayCategory}</p>
                      
                      {/* Price display/edit section */}
                      <div className="vendor-price-section">
                        {editingVendorId === vendor.uniqueId ? (
                          <div className="price-edit-container">
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="price-edit-input"
                              placeholder="Enter price"
                              min="0"
                            />
                            <div className="price-edit-buttons">
                              <button 
                                onClick={() => handleSaveEditPrice(vendor.uniqueId)}
                                className="save-price-btn"
                              >
                                Save
                              </button>
                              <button 
                                onClick={handleCancelEditPrice}
                                className="cancel-price-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="price-display-container">
                            <p className="vendor-price">R{vendor.price || 'N/A'}</p>
                            {isEditing && (
                              <button 
                                onClick={() => handleStartEditPrice(vendor.uniqueId, vendor.price)}
                                className="edit-price-btn"
                              >
                                Edit Price
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {vendor.isExternal && <p className="vendor-external">(External Vendor)</p>}
                      <div className="vendor-status">
                        <span className={`status-${vendor.status.replace(' ', '-')}`}>
                          {vendor.status}
                        </span>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="vendor-actions">
                        <select 
                          value={vendor.status} 
                          onChange={(e) => handleUpdateVendorStatus(vendor.uniqueId, e.target.value)}
                          className="status-select"
                        >
                          <option value="not booked">Not Booked</option>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="booked">Booked</option>
                        </select>
                        <button 
                          onClick={() => handleRemoveVendor(vendor.uniqueId)}
                          className="remove-vendor-btn"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeVendorTab === 'notes' && (
          <div className="booking-notes">
            <h3>Booking Notes</h3>
            <p>This section would contain notes about vendor bookings.</p>
          </div>
        )}
      </div>
    </div>
  );
};



// Main EventDetails component
const EventDetails = () => {
  // Booking notes state: { [vendorId-category]: note }
  //const [bookingNotes, setBookingNotes] = useState({});
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [formData, setFormData] = useState({ name: '', date: '', time: '', venue: '', notes: '' });
  const [ setSelectedVendors] = useState([]);
  const [ setVendors] = useState([]);
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Vendor management state
  
  const [ setVendorCategories] = useState([]);

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
          } catch (error) { 
            console.error('Error loading data:', error); 
          } finally { 
            setIsLoading(false); 
          }
        };
        fetchData();
      } else {
        setIsLoading(false);
        navigate('/login');
      }
    });
    
    return () => unsubscribe();
  }, [eventId, navigate]);

  

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
          updateData.vendors_id = data.map(v => v.id);
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
        updatedAt: new Date().toISOString()
      });

      // Update local state
      if (component === 'schedule') setSchedule(data);
      if (component === 'guests') setGuests(data);
      if (component === 'vendors') setSelectedVendors(data);
      if (component === 'theme') setTheme(data);

      // Turn off editing for this component
      setEditingComponents(prev => ({ ...prev, [component]: false }));
      
      alert(`${component.charAt(0).toUpperCase() + component.slice(1)} saved successfully!`);
    } catch (error) {
      console.error(`Error updating ${component}:`, error);
      alert(`Error saving ${component}. Please try again.`);
    }
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

  // Helper function to format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) return <div className="loading">Loading event details...</div>;
  
  if (!event) return (
    <div className="error">
      <h2>Event Not Found</h2>
      <p>The event could not be found. Please check the URL or go back to the dashboard.</p>
      <button onClick={() => navigate('/planner-dashboard')}>Back to Dashboard</button>
    </div>
  );

  return (
    <div className="event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="button-group">
          <button onClick={() => setActiveView('overview')} className={`new-button ${activeView === 'overview' ? 'active' : ''}`}>Event Overview</button>
          <button onClick={() => setActiveView('guests')} className={`new-button ${activeView === 'guests' ? 'active' : ''}`}>Guest Management</button>
          <button onClick={() => setActiveView('vendors')} className={`new-button ${activeView === 'vendors' ? 'active' : ''}`}>Vendor Management</button>
          <button onClick={() => setActiveView('documents')} className={`new-button ${activeView === 'documents' ? 'active' : ''}`}>Document Management</button>
        </div>
      </div>
      <div>
      {!editingComponents.details && (
              <button onClick={() => toggleComponentEdit('details')} className="edit-component-btn">
                <FaEdit />Edit Details
              </button>
            )}
            {editingComponents.details && (
          <div className="component-actions details-actions">
            <button onClick={() => handleSaveComponent('details')} className="save-component-btn">
              <FaSave /> Save Details
            </button>
            <button onClick={() => toggleComponentEdit('details')} className="cancel-component-btn">
              <FaTimes /> Cancel
            </button>
          </div>
        )}</div>
      <div className="event-info-boxes">
        
        <div className="info-box date-box">
          <div className="info-box-header">
            
            
            <h4><FaCalendarAlt /> Date</h4>
            
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
            <VendorManagement 
            eventId={eventId}
            
            eventDate={formData.date}
        />
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
        )}
      </div>
    </div>
  );
};

export default EventDetails;