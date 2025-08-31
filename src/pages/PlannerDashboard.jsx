// src/pages/PlannerDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, setDoc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaPlus, FaTrash, FaCheck, FaEye } from 'react-icons/fa';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Navbar from '../components/Navbar';

export default function PlannerDashboard() {
  const navigate = useNavigate(); // Initialize the navigate function
  const [userName, setUserName] = useState("Planner");
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]); // State for dynamic events
  const [showAllEvents, setShowAllEvents] = useState(false); // State to toggle all events view
  const [newTask, setNewTask] = useState("");
  const [userId, setUserId] = useState(null);
  const [date, setDate] = useState(new Date());

  // Fetch user data, tasks, and events
  useEffect(() => {
    let unsubscribeTasks = () => {};
    let unsubscribeEvents = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous user's listeners before setting up new ones
      unsubscribeTasks();
      unsubscribeEvents();

      if (user) {
        setUserId(user.uid);
        try {
          // Get planner data from Firestore
          const plannerDoc = await getDoc(doc(db, "planners", user.uid));
          if (plannerDoc.exists()) {
            const fullName = plannerDoc.data().full_name;
            setUserName(fullName || (user.email ? user.email.split('@')[0] : "Planner"));
          } else {
            setUserName(user.email ? user.email.split('@')[0] : "Planner");
          }

          // Set up real-time listener for tasks
          const tasksRef = collection(db, `planners/${user.uid}/tasks`);
          unsubscribeTasks = onSnapshot(tasksRef, (snapshot) => {
            const tasksList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            tasksList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTasks(tasksList);
          });

          // Set up real-time listener for events
          const eventsRef = collection(db, `planners/${user.uid}/events`);
          unsubscribeEvents = onSnapshot(eventsRef, (snapshot) => {
            const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort events by date and time (soonest first)
            // Assumes event object has a `date` (e.g., "2025-10-25") and `time` (e.g., "17:00") property
            eventsList.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));
            setEvents(eventsList);
          });
          
        } catch (error) {
          console.error("Error fetching data:", error);
          setUserName(user.email ? user.email.split('@')[0] : "Planner");
        }
      } else {
        // User is signed out, reset all state
        setUserId(null);
        setUserName("Planner");
        setTasks([]);
        setEvents([]);
      }
    });

    // Main cleanup function for when the component unmounts
    return () => {
      unsubscribeAuth();
      unsubscribeTasks();
      unsubscribeEvents();
    };
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !userId) return;

    try {
      const taskData = {
        text: newTask.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const newTaskRef = doc(collection(db, `planners/${userId}/tasks`));
      await setDoc(newTaskRef, taskData);
      setNewTask("");
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    if (!userId) return;
    try {
      const taskRef = doc(db, `planners/${userId}/tasks`, taskId);
      await updateDoc(taskRef, {
        completed: !currentStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `planners/${userId}/tasks`, taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Function to delete an event
  const deleteEvent = async (eventId) => {
    if (!userId || !eventId) return;
    
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, `planners/${userId}/events`, eventId));
      } catch (error) {
        console.error("Error deleting event:", error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  // Click handler for navigating to the Add Event page
  const handleAddEvent = () => {
    navigate('/add-event');
  };


  return (
    <div className="planner-dashboard" style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 100% 0%, #FFE4C4, #FFB6C1)',
      paddingTop: '80px',
    }}>
      <Navbar />
      <div style={{
        backgroundColor: 'white',
        minHeight: '80vh',
        maxWidth: '1200px',
        margin: '2rem auto',
        borderRadius: '30px',
        padding: '2rem',
        boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
      }}>
        <div className="planner-dashboard-content">
        <div className="dashboard-main">
          <div className="dashboard-header">
            <h1>
              <strong>Hi, {userName}!</strong>
            </h1>
            {/* This button now navigates to the add event page */}
            <button 
              className="nav-button" 
              onClick={handleAddEvent}
              style={{ marginLeft: '1rem' }}
            >
              + Add Event
            </button>
          </div>

          <div className="dashboard-grid">
            <div>
          {/* Upcoming Events Section - Styled like Vendor Dashboard */}
          <div className="section-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: "1.3rem",
              fontWeight: 600,
              color: "#333",
            }}>
              Upcoming Events
            </h2>
            {events.length > 3 && (
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
                }}
              >
                {showAllEvents ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>

          <div className="event-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            width: '100%',
            marginBottom: '1.5rem'
          }}>
            {events.length > 0 ? (
              events.slice(0, showAllEvents ? events.length : 3).map((event) => {
                // Handle different date formats
                let eventDate;
                if (event.date?.toDate) {
                  // Handle Firestore Timestamp
                  eventDate = event.date.toDate();
                } else if (event.date?.seconds) {
                  // Handle timestamp in seconds
                  eventDate = new Date(event.date.seconds * 1000);
                } else if (event.date) {
                  // Handle ISO string or other date string
                  eventDate = new Date(event.date);
                } else {
                  // Fallback to current date
                  eventDate = new Date();
                }
                
                // Format date safely
                let formattedDate = 'Date not set';
                try {
                  if (!isNaN(eventDate.getTime())) {
                    formattedDate = eventDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  }
                } catch (e) {
                  console.error('Error formatting date:', e);
                }
                
                const formattedTime = event.time || 'All day';
                
                return (
                  <div key={event.id} className="event-card" style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ flex: '1', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <button 
                        className="delete-event-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(event.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
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
                          zIndex: 2
                        }}
                        title="Delete event"
                      >
                        ×
                      </button>
                      <h3 style={{
                        paddingRight: '20px',
                        margin: '0 0 10px 0',
                        fontSize: '1.1rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: '2.4em',
                        lineHeight: '1.2em'
                      }}>{event.name || "New Event"}</h3>
                      <div style={{
                        margin: '0 0 12px 0',
                        fontSize: '0.9rem',
                        color: '#555'
                      }}>
                        <div style={{display: 'block', marginBottom: '6px'}}>
                          🗓️ {formattedDate}
                        </div>
                        <div style={{display: 'block', marginBottom: '6px'}}>
                          ⏰ {formattedTime}
                        </div>
                        {event.vendors?.length > 0 && (
                          <div style={{display: 'block', marginBottom: '6px'}}>
                             👥 Vendors: {event.vendors.length} selected
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                      <button 
                        onClick={() => navigate(`/event-details/${event.id}`)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          backgroundColor: 'var(--blush)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <FaEye /> View Details
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              // Displayed when there are no events
              <div style={{
                gridColumn: '1 / -1',
                width: '100%',
                background: '#fff',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                color: '#666'
              }}>
                <p style={{ margin: '0 0 16px', fontSize: '1rem' }}>You have no upcoming events.</p>
                <button 
                  onClick={handleAddEvent}
                  style={{
                    background: 'var(--blush)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  <FaPlus /> Add New Event
                </button>
              </div>
            )}
          </div>

          {/* Checklist Section */}
          <div className="section-card" style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            marginBottom: '24px',
            border: '2px solid #FFC0CB'
          }}>
            <div style={{
              marginBottom: '16px',
              borderBottom: '1px solid rgba(229, 172, 191, 0.3)',
              paddingBottom: '12px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.3rem',
                fontWeight: '600',
                color: 'var(--text-dark)'
              }}>
                My Tasks
              </h2>
            </div>

            <form onSubmit={handleAddTask} style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                border: '1px solid #e1e4e8',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <input
                  id="taskInput"
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add a new task..."
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid rgba(229, 172, 191, 0.5)',
                    borderRadius: '6px 0 0 6px',
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s',
                    ':focus': {
                      borderColor: 'var(--blush)'
                    }
                  }}
                />
                <button 
                  type="submit"
                  disabled={!newTask.trim()}
                  style={{
                    background: 'var(--blush)',
                    color: 'white',
                    border: 'none',
                    padding: '0 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: newTask.trim() ? 1 : 0.5,
                    transition: 'all 0.2s',
                    pointerEvents: newTask.trim() ? 'auto' : 'none',
                    ':hover': {
                      background: 'var(--coral)'
                    }
                  }}
                >
                  <FaPlus /> Add
                </button>
              </div>
            </form>

            {tasks.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#666',
                fontSize: '0.95rem'
              }}>
                No tasks yet. Add one above!
              </div>
            ) : (
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {tasks.map((task) => (
                  <li 
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background 0.2s',
                      ':hover': {
                        background: '#f9f9f9'
                      },
                      ...(task.completed ? {
                        opacity: 0.7,
                        textDecoration: 'line-through',
                        color: '#666'
                      } : {})
                    }}
                  >
                    <button
                      onClick={() => toggleTaskCompletion(task.id, task.completed)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid var(--blush)`,
                        background: task.completed ? 'var(--blush)' : 'transparent',
                        marginRight: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                        ':hover': {
                          borderColor: 'var(--coral)',
                          background: task.completed ? 'var(--coral)' : 'transparent'
                        }
                      }}
                    >
                      {task.completed && <FaCheck size={12} color="white" />}
                    </button>
                    <span style={{
                      flex: 1,
                      fontSize: '0.95rem',
                      wordBreak: 'break-word',
                      paddingRight: '12px'
                    }}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--coral)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        ':hover': {
                          background: 'rgba(246, 162, 140, 0.1)',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <FaTrash size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Chat Section (unchanged) */}
          <div className="chat-section">
            <h2>Chat with Vendors</h2>
            {/* ... */}
          </div>
        </div>

        {/*Calendar */}
        <div>
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
        </div>
      </div>
      </div>
    </div>
  );
}