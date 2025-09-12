import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import { FaPlus, FaTrash, FaCheck, FaUser } from "react-icons/fa";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Navbar from "../components/Navbar";
import ChatUI from "../components/ChatUI";

export default function PlannerDashboard({ session }) {
  console.log("API URL:", process.env.REACT_APP_API_URL);
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Planner");
  const [preview, setPreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  // Load tasks from localStorage on initial render
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem("dashboardTasks");
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  const [events, setEvents] = useState([]);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/planners/${session.user.id}`
        );
        if (!response.ok) throw new Error("Failed to fetch planner data");

        const data = await response.json();
        setUserName(data.name || session.user.email.split("@")[0]);
        setPreview(data.profile_picture || null);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setUserName(session.user.email?.split("@")[0] || "Planner");
        setPreview(null);
      }
    };

    const fetchEventsFromAPI = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/events?planner_id=${session.user.id}`
        );
        if (!response.ok) throw new Error("Failed to fetch events");

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error("Error fetching events from API:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    fetchEventsFromAPI();
  }, [session]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const task = {
      id: Date.now(),
      text: newTask,
      completed: false,
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    // Save to localStorage
    localStorage.setItem("dashboardTasks", JSON.stringify(updatedTasks));
    setNewTask("");
  };

  const toggleTaskCompletion = (taskId, completed) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !completed } : task
    );
    setTasks(updatedTasks);
    // Save to localStorage
    localStorage.setItem("dashboardTasks", JSON.stringify(updatedTasks));
  };

  const deleteTask = (taskId) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    // Save to localStorage
    localStorage.setItem("dashboardTasks", JSON.stringify(updatedTasks));
  };

  const deleteEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("event_id", eventId);

      if (error) throw error;

      setEvents(events.filter((event) => event.id !== eventId));
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    navigate("/add-event");
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="loading-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            borderRadius: "8px",
            backgroundColor: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            className="spinner"
            style={{
              width: "40px",
              height: "40px",
              margin: "0 auto 1rem",
              border: "4px solid #FFF0F5",
              borderTop: "4px solid #FFB6C1",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <h3 style={{ color: "#FFB6C1" }}>Loading your dashboard...</h3>
        </div>
      </div>
    );
  }

  const formatTime = (dateString) => {
    if (!dateString) return "Time not set";
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date to display in a readable format
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get events for the selected date
  const getEventsForDate = (date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div
      className="planner-dashboard"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 100% 0%, #FFE4C4, #FFB6C1)",
        padding: "80px 0 0 0",
        boxSizing: "border-box",
      }}
    >
      <Navbar session={session} />
      <div
        style={{
          backgroundColor: "white",
          minHeight: "calc(100vh - 100px)",
          maxWidth: "1200px",
          margin: "20px auto 0",
          borderTopLeftRadius: "30px",
          borderTopRightRadius: "30px",
          padding: "2rem",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
          boxSizing: "border-box",
        }}
      >
        <div className="planner-dashboard-content">
          <div className="dashboard-main">
            {/* Welcome Section */}
            <div
              style={{
                marginBottom: "2rem",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: preview ? "transparent" : "#FFDAB9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "3px solid white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onClick={() => preview && setShowImageModal(true)}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = "scale(1.05)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#FFDAB9",
                    }}
                  >
                    <FaUser
                      style={{
                        fontSize: "2.5rem",
                        color: "#FFFFFF",
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
                        width: "100%",
                        height: "100%",
                        padding: "0.5rem",
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <h1
                  style={{
                    fontSize: "2rem",
                    color: "#333",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  Welcome back, {userName}!
                </h1>
                <p
                  style={{
                    color: "#666",
                    margin: 0,
                    fontSize: "1rem",
                  }}
                >
                  Here's what's happening with your plans today.
                </p>
              </div>
            </div>

            {/* Upcoming Events and Calendar Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
                marginBottom: "2rem",
              }}
            >
              {/* Upcoming Events Section */}
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h2 style={{ margin: 0 }}>Upcoming Events</h2>
                  {events.length > 3 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid var(--blush)",
                        color: "var(--blush)",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                        fontSize: "0.875rem",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--blush)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--blush)";
                      }}
                    >
                      {showAllEvents ? "Show Less" : "View All"}
                    </button>
                  )}
                </div>

                <div
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    paddingRight: "0.5rem",
                  }}
                >
                  {events.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1.5rem 0",
                        color: "#6c757d",
                      }}
                    >
                      <p>No upcoming events.</p>
                      <button
                        onClick={handleAddEvent}
                        style={{
                          backgroundColor: "var(--peach)",
                          color: "white",
                          border: "none",
                          padding: "0.5rem 1rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          marginTop: "0.75rem",
                          fontWeight: "500",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <FaPlus size={12} /> Add Event
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      {(showAllEvents ? events : events.slice(0, 3)).map(
                        (event) => (
                          <div
                            key={event.id}
                            style={{
                              backgroundColor: "white",
                              borderRadius: "8px",
                              padding: "1rem",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              transition: "transform 0.2s, box-shadow 0.2s",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 6px rgba(0,0,0,0.1)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow =
                                "0 1px 3px rgba(0,0,0,0.1)";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "1rem",
                                  color: "#333",
                                }}
                              >
                                {event.name}
                              </h3>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                color: "#6c757d",
                                fontSize: "0.8rem",
                                marginBottom: "0.2rem",
                              }}
                            >
                              <span style={{ marginRight: "0.5rem" }}>📅</span>
                              {formatDate(event.start_time)}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                color: "#6c757d",
                                fontSize: "0.8rem",
                                marginBottom: "0.2rem",
                              }}
                            >
                              <span style={{ marginRight: "0.5rem" }}>🕒</span>
                              {formatTime(event.start_time) || "TBD"}
                            </div>
                            {event.location && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  color: "#6c757d",
                                  fontSize: "0.8rem",
                                  marginBottom: "0.2rem",
                                }}
                              >
                                <span style={{ marginRight: "0.5rem" }}>
                                  📍
                                </span>
                                {event.venue || "TBD"}
                              </div>
                            )}
                          </div>
                        )
                      )}
                      {!showAllEvents && events.length > 3 && (
                        <button
                          onClick={() => setShowAllEvents(true)}
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid #ddd",
                            color: "#6c757d",
                            padding: "0.5rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            width: "100%",
                            marginTop: "0.5rem",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.backgroundColor = "#f8f9fa";
                            e.currentTarget.color = "#495057";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.backgroundColor = "transparent";
                            e.currentTarget.color = "#6c757d";
                          }}
                        >
                          View All Events ({events.length - 3} more)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Calendar Section */}
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>
                  Calendar
                </h2>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "1rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                >
                  <style>
                    {`
                    .dashboard-calendar {
                      width: 100%;
                      border: none;
                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    }
                    .react-calendar__navigation {
                      display: flex;
                      margin-bottom: 1em;
                    }
                    .react-calendar__navigation button {
                      color: #ff6b8b;
                      background: none;
                      border: none;
                      font-size: 1rem;
                      font-weight: 600;
                      cursor: pointer;
                      padding: 0.5rem;
                      border-radius: 8px;
                      transition: all 0.2s;
                    }
                    .react-calendar__navigation button:hover {
                      background-color: #ffebee;
                    }
                    .react-calendar__navigation button:disabled {
                      background-color: transparent;
                      color: #ccc;
                    }
                    .react-calendar__month-view__weekdays {
                      text-align: center;
                      text-transform: uppercase;
                      font-weight: 600;
                      color: #ff6b8b;
                      font-size: 0.75rem;
                      margin-bottom: 0.5rem;
                    }
                    .react-calendar__month-view__weekdays__weekday abbr {
                      text-decoration: none;
                    }
                    .react-calendar__month-view__weekdays__weekday--weekend abbr {
                      color: #ff6b8b;
                    }
                    .react-calendar__month-view__days__day--weekend {
                      color: #ff6b8b;
                    }
                    .react-calendar__tile {
                      max-width: 100%;
                      text-align: center;
                      padding: 0.75em 0.5em;
                      background: none;
                      border: 2px solid transparent;
                      border-radius: 50%;
                      color: #333;
                      font-weight: 500;
                      transition: all 0.2s;
                    }
                    .react-calendar__tile:enabled:hover,
                    .react-calendar__tile:enabled:focus {
                      background-color: #ffebee;
                      border-color: #ffb6c1;
                      transform: scale(1.1);
                    }
                    .react-calendar__tile--now {
                      background: #ffebee;
                      border: 2px solid #ffb6c1;
                      color: #ff6b8b;
                      font-weight: 600;
                    }
                    .react-calendar__tile--now:enabled:hover,
                    .react-calendar__tile--now:enabled:focus {
                      background: #ffd6de;
                      border-color: #ff8fa3;
                    }
                    .react-calendar__tile--active {
                      background: #ffb6c1 !important;
                      color: white !important;
                      border-color: #ffb6c1 !important;
                      font-weight: 600;
                    }
                    .react-calendar__tile--active:enabled:hover,
                    .react-calendar__tile--active:enabled:focus {
                      background: #ffc0cb !important;
                      border-color: #ffc0cb !important;
                    }
                    .react-calendar__month-view__days__day--neighboringMonth {
                      color: #ccc;
                    }
                    `}
                  </style>
                  <Calendar
                    onChange={setDate}
                    value={date}
                    className="dashboard-calendar"
                    tileContent={({ date, view }) => {
                      const dateEvents = getEventsForDate(date);
                      return dateEvents.length > 0 ? (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "4px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: "2px",
                          }}
                        >
                          {[...Array(Math.min(3, dateEvents.length))].map(
                            (_, i) => (
                              <div
                                key={i}
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: "#ff6b8b",
                                  opacity: 0.8,
                                }}
                              />
                            )
                          )}
                        </div>
                      ) : null;
                    }}
                    formatShortWeekday={(locale, date) =>
                      ["S", "M", "T", "W", "T", "F", "S"][date.getDay()]
                    }
                    next2Label={null}
                    prev2Label={null}
                    minDetail="month"
                    showNeighboringMonth={false}
                  />
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
                    Events on {date.toLocaleDateString()}
                  </h3>
                  {getEventsForDate(date).length === 0 ? (
                    <p style={{ color: "#6c757d", textAlign: "center" }}>
                      No events scheduled for this day.
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {getEventsForDate(date).map((event) => (
                        <li
                          key={event.id}
                          style={{
                            backgroundColor: "white",
                            padding: "0.75rem 1rem",
                            borderRadius: "6px",
                            marginBottom: "0.5rem",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: "600" }}>
                              {event.title}
                            </div>
                            <div
                              style={{ fontSize: "0.875rem", color: "#6c757d" }}
                            >
                              {event.time} • {event.location || "No location"}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc3545",
                              cursor: "pointer",
                              padding: "0.25rem",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f1f1f1")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "transparent")
                            }
                          >
                            <FaTrash size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            <div
              style={{
                backgroundColor: "#f8f9fa",
                borderRadius: "12px",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>My Tasks</h2>

              <form onSubmit={handleAddTask} style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a new task..."
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "1rem",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "var(--peach)",
                      color: "white",
                      border: "none",
                      padding: "0 1.5rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#ff9e8f")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--peach)")
                    }
                  >
                    Add
                  </button>
                </div>
              </form>

              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  paddingRight: "0.5rem",
                }}
              >
                {tasks.length === 0 ? (
                  <p
                    style={{
                      color: "#6c757d",
                      textAlign: "center",
                      margin: "2rem 0",
                    }}
                  >
                    No tasks yet. Add one above!
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "0.75rem",
                          backgroundColor: task.completed ? "#e8f5e9" : "white",
                          borderRadius: "6px",
                          marginBottom: "0.5rem",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                      >
                        <button
                          onClick={() =>
                            toggleTaskCompletion(task.id, task.completed)
                          }
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: `2px solid ${
                              task.completed ? "#4caf50" : "#ccc"
                            }`,
                            backgroundColor: task.completed
                              ? "#4caf50"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: "1rem",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          {task.completed && (
                            <FaCheck color="white" size={12} />
                          )}
                        </button>
                        <span
                          style={{
                            flex: 1,
                            textDecoration: task.completed
                              ? "line-through"
                              : "none",
                            color: task.completed ? "#6c757d" : "#212529",
                            wordBreak: "break-word",
                          }}
                        >
                          {task.text}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#dc3545",
                            cursor: "pointer",
                            marginLeft: "0.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.25rem",
                            borderRadius: "4px",
                            transition: "background-color 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f1f1f1")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <FaTrash size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              marginTop: "2rem",
            }}
          >
            <ChatUI
              listTitle="Vendors"
              vendors={[
                {
                  id: 1,
                  name: "Blossom Events",
                  lastMessage: "Looking forward to our meeting!",
                  unread: 0,
                },
              ]}
              onSendMessage={(message) => {
                console.log("Message to vendor:", message);
              }}
            />
          </div>
        </div>
      </div>

      {/* Profile Picture Modal */}
      {showImageModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview}
              alt="Profile Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            />
            <button
              onClick={() => setShowImageModal(false)}
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                background: "none",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                padding: "8px",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
