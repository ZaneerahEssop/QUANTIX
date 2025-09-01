import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  FaArrowLeft, FaCalendarAlt, FaClock, FaMapMarkerAlt, 
  FaInfoCircle, FaEnvelope, FaStar
} from 'react-icons/fa';
import './VendorEventDetails.css';

// Utility function to safely convert any value to string
const safeToString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
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

// Schedule component for read-only view
const ScheduleView = ({ schedule }) => (
  <div className="schedule-section">
    <div className="section-header">
      <h2>Schedule</h2>
    </div>
    <div className="schedule-list">
      {schedule && schedule.length > 0 ? schedule.map((item, index) => (
        <div key={index} className="schedule-item">
          <span className="schedule-time">{item.time}</span>
          <span className="schedule-activity">{item.activity}</span>
        </div>
      )) : <p>No schedule items have been added yet.</p>}
    </div>
  </div>
);

// Guest list component for read-only view
const GuestListView = ({ guests }) => (
  <div className="guests-section">
    <div className="section-header">
      <h2>Guest List</h2>
      <span className="guest-count">{guests?.length || 0} guests</span>
    </div>
    <div className="guest-list">
      {guests && guests.length > 0 ? guests.map((guest, index) => (
        <div key={index} className="guest-item">
          <div className="guest-info">
            <div className="guest-name">
              {guest.name}
              {guest.isAttending && <span className="attending-badge">Attending</span>}
            </div>
            {guest.contact && (
              <div className="guest-contact">
                <FaEnvelope /> {guest.contact}
              </div>
            )}
            {guest.dietary && (
              <div className="guest-dietary">
                <FaInfoCircle /> {guest.dietary}
              </div>
            )}
          </div>
        </div>
      )) : <p>No guests have been added yet.</p>}
    </div>
  </div>
);

// Theme preview component
const ThemePreview = ({ theme }) => (
  <div className="event-theme">
    <h3>Event Theme</h3>
    <p><strong>Name:</strong> {theme.name || 'No theme selected'}</p>
    {theme.colors && theme.colors.length > 0 && (
      <div className="theme-colors">
        <p><strong>Color Scheme:</strong></p>
        <div className="color-swatches">
          {theme.colors.map((color, i) => (
            <div 
              key={i} 
              className="color-swatch" 
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    )}
    {theme.notes && (
      <div className="theme-notes">
        <p><strong>Notes:</strong> {theme.notes}</p>
      </div>
    )}
  </div>
);

const VendorEventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [schedule, setSchedule] = useState([]);
  const [guests, setGuests] = useState([]);
  const [theme, setTheme] = useState({ name: '', colors: [], notes: '' });

  useEffect(() => {
    const fetchData = async (user) => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const vendorRef = doc(db, 'vendors', user.uid);
        const vendorDoc = await getDoc(vendorRef);
        
        if (!vendorDoc.exists()) {
          console.error("Vendor not found");
          setEvent(null);
          return;
        }
        
        const vendorData = vendorDoc.data();
        const vendorEvent = vendorData.requests?.find(
          req => req.eventId === eventId && req.status === 'accepted'
        );
        
        if (!vendorEvent) {
          console.error("Event not found in vendor's accepted events");
          setEvent(null);
          return;
        }
        
        const eventData = {
          id: eventId,
          name: vendorEvent.eventName || 'Event',
          date: vendorEvent.eventDate || '',
          time: vendorEvent.eventTime || '',
          venue: vendorEvent.venue || 'TBC',
          description: vendorEvent.description || '',
          ...vendorEvent
        };
        
        setEvent(eventData);
        setSchedule(vendorEvent.schedule || []);
        setGuests(vendorEvent.guests || []);
        setTheme(vendorEvent.theme || { name: '', colors: [], notes: '' });
      } catch (error) { 
        console.error('Error loading event:', error);
        setEvent(null);
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

  if (isLoading) {
    return (
      <div className="vendor-event-details">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="vendor-event-details">
        <div className="error-message">
          <h2>Event Not Found</h2>
          <p>The requested event could not be found or you don't have permission to view it.</p>
          <button onClick={() => navigate(-1)} className="back-button">
            <FaArrowLeft /> Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="button-group">
          <button onClick={() => setActiveView('overview')} className={`new-button ${activeView === 'overview' ? 'active' : ''}`}>Event Overview</button>
          <button onClick={() => setActiveView('schedule')} className={`new-button ${activeView === 'schedule' ? 'active' : ''}`}>Schedule</button>
          <button onClick={() => setActiveView('guests')} className={`new-button ${activeView === 'guests' ? 'active' : ''}`}>Guests</button>
        </div>
      </div>
      
      <h1>{event.name || 'Untitled Event'}</h1>

      <div className="event-info-boxes">
        <div className="info-box date-box">
          <h4><FaCalendarAlt /> Date</h4>
          <p>{formatDisplayDate(event.date)}</p>
        </div>
        <div className="info-box time-box">
          <h4><FaClock /> Time</h4>
          <p>{safeToString(event.time) || 'Not specified'}</p>
        </div>
        <div className="info-box venue-box">
          <h4><FaMapMarkerAlt /> Venue</h4>
          <p>{safeToString(event.venue) || 'Not specified'}</p>
        </div>
        <div className="info-box theme-box">
          <h4><FaStar /> Theme</h4>
          <p>{theme.name || 'Not specified'}</p>
        </div>
      </div>
      
      <div className="event-sections">
        {activeView === 'overview' && (
          <section className="overview-section">
             <div className="section-header">
                <h2>Event Overview</h2>
            </div>
            <p>{event.description || 'No description available.'}</p>
            <hr/>
            <ThemePreview theme={theme} />
          </section>
        )}

        {activeView === 'schedule' && (
          <section>
            <ScheduleView schedule={schedule} />
          </section>
        )}

        {activeView === 'guests' && (
          <section>
            <GuestListView guests={guests} />
          </section>
        )}
      </div>
    </div>
  );
};

export default VendorEventDetails;