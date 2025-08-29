import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './VendorDashboard.css';

function VendorDashboard() {
  const [vendorName, setVendorName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ category: "" });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedEvents, setAcceptedEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [plannerNames, setPlannerNames] = useState({});
  const [showAllEvents, setShowAllEvents] = useState(false);
  // Calendar state
  const [date, setDate] = useState(new Date());
  
  // Function to fetch planner name by ID
  const fetchPlannerName = async (plannerId) => {
    if (!plannerId) return 'Unknown Planner';
    if (plannerNames[plannerId]) return plannerNames[plannerId];
    
    try {
      const plannerDoc = await getDoc(doc(db, 'planners', plannerId));
      if (plannerDoc.exists()) {
        const name = plannerDoc.data().full_name || 'Planner';
        setPlannerNames(prev => ({ ...prev, [plannerId]: name }));
        return name;
      }
      return 'Planner';
    } catch (error) {
      console.error('Error fetching planner name:', error);
      return 'Planner';
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get vendor data from Firestore
          const vendorRef = doc(db, 'vendors', user.uid);
          
          // Set up real-time listener for vendor document
          const unsubscribeVendor = onSnapshot(vendorRef, async (doc) => {
            const vendorData = doc.data();
            if (vendorData) {
              setVendorName(vendorData.name_of_vendor || 'Vendor');
              setBusinessName(vendorData.name_of_business || '');
              
              // Separate pending and accepted requests
              const pending = [];
              const accepted = [];
              
              if (vendorData.requests) {
                // Process requests in parallel to fetch event details
                await Promise.all(vendorData.requests.map(async (request) => {
                  if (request.status === 'pending') {
                    pending.push(request);
                  } else if (request.status === 'accepted') {
                    // Fetch the event details to get the venue
                    try {
                      const eventDoc = await getDoc(doc(db, 'events', request.eventId));
                      if (eventDoc.exists()) {
                        const eventData = eventDoc.data();
                        accepted.push({
                          ...request,
                          venue: eventData.venue,
                          eventName: eventData.eventName || 'New Event',
                          eventDate: eventData.date,
                          eventTime: eventData.time
                        });
                      } else {
                        accepted.push(request);
                      }
                    } catch (error) {
                      console.error('Error fetching event details:', error);
                      accepted.push(request);
                    }
                  }
                }));
              }
              
              setPendingRequests(pending);
              setAcceptedEvents(accepted);
              
              // Fetch planner names for all requests
              const plannerIds = [...new Set([...pending, ...accepted].map(r => r.plannerId).filter(Boolean))];
              const names = {};
              await Promise.all(plannerIds.map(async (id) => {
                const name = await fetchPlannerName(id);
                names[id] = name;
              }));
              setPlannerNames(prev => ({ ...prev, ...names }));
            }
            setIsLoading(false);
          });
          
          return () => {
            unsubscribeVendor();
          };
        } catch (error) {
          console.error('Error setting up vendor listener:', error);
          setIsLoading(false);
        }
      } else {
        setVendorName("Vendor");
        setPendingRequests([]);
        setIsLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribeAuth();
  }, []);
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not specified';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'Time not specified';
    return timeString; // Assuming time is already in a readable format
  };


  const handleAddService = async (new_Service) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const vendorRef = doc(db, "vendors", user.uid);

      await updateDoc(vendorRef, {
        category: arrayUnion(new_Service) // adds to the array without duplicates
      });

      alert(`${new_Service} added successfully!`);
      setFormData({ category: "" });
    } catch (error) {
      console.error("Error adding service:", error);
      alert("Failed to add service. Try again.");
    }
  };

  const handleRequestResponse = async (request, status) => {
    const user = auth.currentUser;
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const vendorRef = doc(db, 'vendors', user.uid);
      const vendorDoc = await getDoc(vendorRef);
      
      if (!vendorDoc.exists()) {
        console.error('Vendor document does not exist');
        return;
      }
      
      const batch = writeBatch(db);
      
      // 1. First, remove the existing request
      console.log('Removing request:', request);
      batch.update(vendorRef, {
        requests: arrayRemove(request)
      });
      
      // 2. Create the updated request
      const updatedRequest = {
        ...request,
        status,
        respondedAt: new Date().toISOString()
      };
      
      // 3. Add the updated request
      console.log('Adding updated request:', updatedRequest);
      batch.update(vendorRef, {
        requests: arrayUnion(updatedRequest)
      });
      
      // 4. If accepted, update the event's vendor status
      if (status === 'accepted') {
        console.log('Updating event status for event ID:', request.eventId);
        const eventRef = doc(db, 'events', request.eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const updatedVendors = eventData.vendors.map(vendor => 
            vendor.id === user.uid 
              ? { 
                  ...vendor, 
                  status: 'accepted', 
                  respondedAt: new Date().toISOString() 
                }
              : vendor
          );
          
          batch.update(eventRef, { vendors: updatedVendors });
        }
      }
      
      // 5. Execute all updates as a single batch
      console.log('Committing batch...');
      await batch.commit();
      console.log('Batch committed successfully');
      
      // 6. Update local state
      if (status === 'accepted') {
        setPendingRequests(prev => 
          prev.filter(req => 
            !(req.eventId === request.eventId && req.plannerId === request.plannerId)
          )
        );
        setAcceptedEvents(prev => {
          // Check if the event is already in the list
          const exists = prev.some(e => 
            e.eventId === request.eventId && e.plannerId === request.plannerId
          );
          return exists ? prev : [...prev, updatedRequest];
        });
      } else {
        setPendingRequests(prev => 
          prev.filter(req => 
            !(req.eventId === request.eventId && req.plannerId === request.plannerId)
          )
        );
      }
      
      alert(`Request ${status} successfully!`);
    } catch (error) {
      console.error('Error in handleRequestResponse:', {
        error,
        message: error.message,
        stack: error.stack,
        request,
        status
      });
      alert(`Failed to update request status: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventToDelete) => {
    if (!window.confirm('Are you sure you want to remove this event?')) return;
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const vendorRef = doc(db, 'vendors', user.uid);
      const vendorDoc = await getDoc(vendorRef);
      
      if (vendorDoc.exists()) {
        const vendorData = vendorDoc.data();
        const requests = vendorData.requests || [];
        
        // Filter out the deleted event
        const updatedRequests = requests.filter(
          req => !(req.eventId === eventToDelete.eventId && req.status === 'accepted')
        );
        
        await updateDoc(vendorRef, { requests: updatedRequests });
        
        // Also update the event document to remove this vendor
        try {
          const eventRef = doc(db, 'events', eventToDelete.eventId);
          const eventDoc = await getDoc(eventRef);
          
          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            const updatedVendors = eventData.vendors?.filter(
              vendor => vendor.id !== user.uid
            ) || [];
            
            await updateDoc(eventRef, { vendors: updatedVendors });
          }
        } catch (error) {
          console.error('Error updating event document:', error);
          // Continue even if event update fails
        }
        
        alert('Event removed successfully!');
      }
    } catch (error) {
      console.error('Error removing event:', error);
      alert('Failed to remove event. Please try again.');
    }
  };

  // Request actions styles
  const requestActionsStyle = {
    display: 'flex',
    gap: '8px',
    marginTop: '8px'
  };

  // Modal styles
  const styles = {
    overlay: {
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modal: {
      background: "white",
      padding: "2rem",
      borderRadius: "8px",
      minWidth: "300px",
    },
  };


  return (
    <div className="planner-dashboard-page">
      <div className="planner-dashboard-content">
        <div className="dashboard-main">
          {/* Header */}
          <div className="dashboard-header">
            <h1>Hi, {vendorName}!</h1>
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Add Service</button>
          </div>

          <div className="dashboard-grid">
            {/* Left Column */}
            <div>
              {/* Upcoming Events Section */}
              <div className="events-section">
                <div className="section-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h2 style={{ margin: 0 }}>Your Events</h2>
                  <button 
                    onClick={() => setShowAllEvents(!showAllEvents)}
                    style={{
                      background: 'var(--blush)',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'background-color 0.2s',
                      ':hover': {
                        backgroundColor: 'var(--coral)'
                      }
                    }}
                  >
                    {showAllEvents ? 'Show Less' : 'View All'}
                  </button>
                </div>
                <div className="event-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.5rem',
                  maxWidth: '1200px',
                  margin: '0 auto',
                  width: '100%',
                  padding: '0 1rem'
                }}>
                  {acceptedEvents.length > 0 ? (
                    acceptedEvents.slice(0, showAllEvents ? acceptedEvents.length : 3).map((event, index) => (
                      <div key={`event-${index}`} className="event-card" style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '200px',
                        width: '100%',
                        padding: '1.25rem',
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid var(--blush)'
                      }}>
                        <div style={{ 
                          flex: 1,
                          display: 'flex', 
                          flexDirection: 'column',
                          position: 'relative',
                          height: '100%',
                          padding: '4px 4px 0 4px'
                        }}>
                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                          <button 
                            className="delete-event-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ff4d4f',
                              cursor: 'pointer',
                              fontSize: '16px',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Remove event"
                          >
                            ×
                          </button>
                        </div>
                        <h3 style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          color: '#333',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          minHeight: '2.4em',
                          lineHeight: '1.2',
                          marginTop: '4px'
                        }}>{event.eventName || 'New Event'}</h3>
                        <div style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '0.85rem',
                          color: '#555',
                          flex: 1,
                          justifyContent: 'center'
                        }}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <span>🗓️</span> {formatDate(event.eventDate) || 'Date not specified'}
                          </div>
                          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <span>⏰</span> {formatTime(event.eventTime) || 'All day'}
                          </div>
                          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <span>📍</span> {event.venue || 'TBC'}
                          </div>
                        </div>
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                          <button 
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              backgroundColor: 'var(--blush)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'background-color 0.2s',
                              ':hover': {
                                backgroundColor: 'var(--coral)'
                              }
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ 
                      gridColumn: '1 / -1', 
                      textAlign: 'center', 
                      padding: '2rem',
                      margin: 0,
                      background: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      No upcoming events. Accepted events will appear here.
                    </p>
                  )}
                </div>
              </div>

              {/* Pending Requests Section */}
              <div className="section-card pending-requests">
                <h2>Pending Requests</h2>
                {isLoading ? (
                  <p>Loading requests...</p>
                ) : pendingRequests.length > 0 ? (
                  <ul className="pending-list">
                    {pendingRequests.map((request, index) => (
                      <li key={`${request.eventId}-${index}`}>
                        <div className="event-details">
                          <div style={{ fontWeight: '500' }}>
                            <i className="fa fa-clipboard-list"></i> {request.eventName || 'New Event'}
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <div><small><i className="fa fa-calendar"></i> {request.eventDate || 'Not specified'}</small></div>
                            <div><small><i className="fa fa-clock"></i> {request.eventTime || 'Not specified'}</small></div>
                          </div>
                        </div>
                        <div className="event-actions">
                          <button 
                            className="details-btn"
                            style={{ 
                              padding: '4px 8px',
                              fontSize: '0.8em',
                              width: '100%',
                              textAlign: 'center'
                            }}
                            onClick={() => {
                              // TODO: Implement view details functionality
                              console.log('View details for request:', request);
                            }}
                          >
                            <i className="fa fa-info-circle"></i> Details
                          </button>
                          <div className="request-actions" style={{ justifyContent: 'flex-end' }}>
                            <button 
                              className="reject-btn"
                              onClick={() => handleRequestResponse(request, 'rejected')}
                            >
                              <i className="fa fa-times"></i> Reject
                            </button>
                            <button 
                              className="accept-btn"
                              onClick={() => handleRequestResponse(request, 'accepted')}
                            >
                              <i className="fa fa-check"></i> Accept
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No pending requests found.</p>
                )}
              </div>

              {/* Chat Section */}
             <div className="chat-section">
               <h2>Chat with Planners</h2>
             </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Calendar */}
              <div className="calendar-card card">
                <Calendar
                  onChange={setDate}
                  value={date}
                  className="dashboard-calendar fixed-size-calendar"
                  next2Label={null}
                  prev2Label={null}
                />
              </div>
            </div>
          </div>

          {/* Add Service Modal */}
          {isModalOpen && (
            <div style={styles.overlay}>
              <div style={styles.modal}>
                <h2>Add a New Service to your catalog</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!formData.category) return alert("Please select a category");
                    handleAddService(formData.category);
                    setIsModalOpen(false);
                  }}
                >
                  {/* Category Dropdown */}
                  <div className="form-group">
                    <i className="form-icon fas fa-tag"></i>
                    <select
                      name="category"
                      className={`form-input ${formData.category ? "has-value" : ""}`}
                      value={formData.category}
                      onChange={(e) => setFormData({ category: e.target.value })}
                      required
                    >
                      <option value=""></option>
                      <option value="Catering">Catering</option>
                      <option value="Flowers">Flowers</option>
                      <option value="Venue">Venue</option>
                      <option value="Photography">Photography</option>
                      <option value="Music">Music</option>
                      <option value="Decor">Decor</option>
                    </select>
                    <label className="form-label">Category</label>
                  </div>

                  <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                    <button type="submit" className="add-btn">
                      Add Service
                    </button>
                    <button
                      type="button"
                      className="add-btn"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;
