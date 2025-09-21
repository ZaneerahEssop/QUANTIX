import { useEffect, useLayoutEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaTrash, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import ChatUI from "../components/ChatUI";
import Navbar from "../components/Navbar";

export default function VendorDashboard({ session }) {
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState("Vendor");
  const [preview, setPreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedEvents, setAcceptedEvents] = useState([]);
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [plannerNames, setPlannerNames] = useState({});

  // Prevent scrolling until page is fully loaded
  useLayoutEffect(() => {
    // Add a class to the body to prevent scrolling via CSS
    document.body.classList.add("dashboard-loading");

    // Lock scroll on mount
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Scroll to top immediately
    window.scrollTo(0, 0);

    // Re-enable scrolling after a longer delay (1000ms)
    const timer = setTimeout(() => {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      document.body.classList.remove("dashboard-loading");
      window.scrollTo(0, 0);
    }, 1000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      document.body.classList.remove("dashboard-loading");
    };
  }, []);

  const fetchPlannerName = async (plannerId) => {
    try {
      const { data, error } = await supabase
        .from("planners")
        .select("name")
        .eq("planner_id", plannerId);

      if (error) {
        console.error("Error fetching planner name:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0].name;
    } catch (err) {
      console.error("Error fetching planner name:", err);
      return null;
    }
  };

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchInitialData = async () => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      const userId = session.user.id;

      // Vendor info
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select("name, profile_picture")
        .eq("vendor_id", userId)
        .single();

      if (vendorError || !vendorData) {
        console.error("Error fetching vendor data:", vendorError?.message);
        const email = session.user.email || "";
        setVendorName(email.split("@")[0] || "Vendor");
        setPreview(null);
      } else {
        setVendorName(vendorData.name);
        setPreview(vendorData.profile_picture);
      }

      console.log("Fetching from:", `/api/vendor-requests/${userId}`);

      // Fetch vendor requests via API
      const requestsResponse = await fetch(
        `${API_BASE}/api/vendor-requests/${userId}`
      );

      console.log("Response status:", requestsResponse.status);
      console.log("Response OK:", requestsResponse.ok);

      if (!requestsResponse.ok) {
        throw new Error(
          `Vendor requests API error! status: ${requestsResponse.status}`
        );
      }

      const requestsData = await requestsResponse.json();
      console.log("API Requests data:", requestsData);

      const pending = [];
      const accepted = [];
      const plannerIds = new Set();

      if (requestsData && requestsData.length > 0) {
        requestsData.forEach((req) => {
          const eventDetails = req.events
            ? {
                id: req.events.event_id,
                eventName: req.events.name,
                eventDate: req.events.start_time
                  ? new Date(req.events.start_time)
                  : null,
                eventTime: req.events.start_time,
                venue: req.events.venue,
                plannerId: req.events.planner_id,
                requestId: req.request_id,
              }
            : null;

          if (req.status === "pending" && eventDetails) {
            pending.push(eventDetails);
            plannerIds.add(req.events.planner_id);
          } else if (req.status === "accepted" && eventDetails) {
            accepted.push(eventDetails);
            plannerIds.add(req.events.planner_id);
          }
        });
      }

      // Fetch planner names using your planner API
      const plannerPromises = [...plannerIds].map(async (plannerId) => {
        try {
          const response = await fetch(`${API_BASE}/api/planners/${plannerId}`);
          if (!response.ok) {
            throw new Error(
              `Planner API error for ${plannerId}: ${response.status}`
            );
          }
          const plannerData = await response.json();
          return { id: plannerId, name: plannerData.name || "Planner" };
        } catch (error) {
          console.error(`Error fetching planner ${plannerId}:`, error);
          return { id: plannerId, name: "Planner" };
        }
      });

      const planners = await Promise.all(plannerPromises);
      const plannerMap = Object.fromEntries(
        planners.map((p) => [p.id, p.name])
      );

      const pendingWithNames = pending.map((req) => ({
        ...req,
        plannerName: plannerMap[req.plannerId] || "Planner",
      }));

      const acceptedWithNames = accepted.map((req) => ({
        ...req,
        plannerName: plannerMap[req.plannerId] || "Planner",
      }));

      setPendingRequests(pendingWithNames);
      setAcceptedEvents(acceptedWithNames);
    } catch (error) {
      console.error("Error in initial data fetch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    const userId = session.user.id;

    // Ensure user role is set
    const updateUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !user.user_metadata?.role) {
        await supabase.auth.updateUser({
          data: { role: "vendor" },
        });
      }
    };

    updateUserRole();

    // Subscribe to changes
    const subscription = supabase
      .channel("vendor_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendor_requests",
          filter: `vendor_id=eq.${userId}`,
        },
        () => fetchInitialData() // Now this will work
      )
      .subscribe();

    fetchInitialData(); // Initial fetch

    return () => {
      subscription.unsubscribe();
    };
  }, [session]); // Add fetchInitialData to dependencies if needed, but be careful of infinite loops

  const handleRequestResponse = async (requestId, status) => {
    if (!session?.user) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/vendor-requests/${requestId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: status,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update request status");
      }

      const result = await response.json();
      alert(`Request ${status} successfully!`);
    } catch (error) {
      console.error("Error updating request status:", error);
      alert(`Failed to update request status: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!session?.user) return;
    if (!window.confirm("Are you sure you want to remove this event?")) return;

    try {
      const { error } = await supabase
        .from("vendor_events")
        .delete()
        .eq("vendor_id", session.user.id)
        .eq("event_id", eventId);

      if (error) throw error;
      alert("Event removed successfully!");
    } catch (error) {
      console.error("Error removing event:", error);
      alert("Failed to remove event. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date not specified";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    if (!timeString) return "Time not specified";
    return timeString;
  };

  const getEventsForDate = (date) => {
    return acceptedEvents.filter((event) => {
      const eventDate = new Date(event.eventDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  if (isLoading) {
    return (
      <div
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 100% 0%, #FFE4C4, #FFB6C1)",
        padding: "100px 0 0 0",
        margin: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        .dashboard-calendar { width: 100%; border: none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; height: 100%; }
        .react-calendar__navigation { display: flex; margin-bottom: 1em; }
        .react-calendar__navigation button { color: #ff6b8b; background: none; border: none; font-size: 1rem; font-weight: 600; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: all 0.2s; }
        .react-calendar__navigation button:hover { background-color: #ffebee; }
        .react-calendar__navigation button:disabled { background-color: transparent; color: #ccc; }
        .react-calendar__month-view__weekdays { text-align: center; text-transform: uppercase; font-weight: 600; color: #ff6b8b; font-size: 0.75rem; margin-bottom: 0.5rem; }
        .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; }
        .react-calendar__month-view__weekdays__weekday--weekend abbr { color: #ff6b8b; }
        .react-calendar__month-view__days__day--weekend { color: #ff6b8b; }
        .react-calendar__tile { max-width: 100%; text-align: center; padding: 0.75em 0.5em; background: none; border: 2px solid transparent; border-radius: 50%; color: #333; font-weight: 500; transition: all 0.2s; }
        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background-color: #ffebee; border-color: #ffb6c1; transform: scale(1.1); }
        .react-calendar__tile--now { background: #ffebee; border: 2px solid #ffb6c1; color: #ff6b8b; font-weight: 600; }
        .react-calendar__tile--now:enabled:hover, .react-calendar__tile--now:enabled:focus { background: #ffd6de; border-color: #ff8fa3; }
        .react-calendar__tile--active { background: #ffb6c1 !important; color: white !important; border-color: #ffb6c1 !important; font-weight: 600; }
        .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus { background: #ffc0cb !important; border-color: #ffc0cb !important; }
        .react-calendar__month-view__days__day--neighboringMonth { color: #ccc; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid rgba(0, 0, 0, 0.1); padding-bottom: 0.5rem; }
        .event-card { position: relative; display: flex; flex-direction: column; min-height: 200px; width: 100%; padding: 1.25rem; background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--blush, #FFC0CB); transition: transform 0.2s, box-shadow 0.2s; }
        .event-card:hover { transform: translateY(-5px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .delete-event-btn { background: transparent; border: none; color: #ff4d4f; cursor: pointer; font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; position: absolute; top: 10px; right: 10px; }
        .delete-event-btn:hover { background: rgba(255, 77, 79, 0.1); transform: scale(1.1); }
        .event-details-icons { display: flex; align-items: center; gap: 6px; color: #555; font-size: 0.85rem; }
        .view-details-btn { width: 100%; padding: 8px 12px; background-color: var(--blush, #FFC0CB); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; display: flex; justify-content: center; align-items: center; gap: 6px; transition: background-color 0.2s; }
        .view-details-btn:hover { background-color: var(--coral, #FF7F50); }
        .pending-requests-card { background: #f8f9fa; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
        .pending-list { list-style: none; padding: 0; margin: 0; }
        .pending-list li { background: #FFF0F5; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #FFD1DC; }
        .request-item { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
        .request-details { flex: 1; }
        .request-actions { display: flex; gap: 0.5rem; }
        .accept-btn, .reject-btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .accept-btn { background-color: #4caf50; color: white; }
        .accept-btn:hover { background-color: #45a049; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .reject-btn { background-color: #f44336; color: white; }
        .reject-btn:hover { background-color: #e53935; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
      `}</style>
      <Navbar session={session} />
      <div
        style={{
          backgroundColor: "white",
          flex: "1",
          maxWidth: "1200px",
          margin: "0 auto",
          borderRadius: "30px",
          padding: "2rem",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
        }}
      >
        <div className="vendor-dashboard-content">
          <div className="dashboard-main">
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
                  Welcome back, {vendorName}!
                </h1>
                <p style={{ color: "#666", margin: 0, fontSize: "1rem" }}>
                  Here's what's happening with your upcoming events and
                  requests.
                </p>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
              marginBottom: "2rem",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  flex: "1",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="section-header">
                  <h2 style={{ margin: 0 }}>Your Events</h2>
                  {acceptedEvents.length > 3 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #FFC0CB",
                        color: "#FFC0CB",
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        position: "relative",
                        top: "-4px",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#FFC0CB";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#FFC0CB";
                      }}
                    >
                      {showAllEvents ? (
                        <span>Show Less</span>
                      ) : (
                        <>
                          <span>View All</span>
                          <span style={{ fontSize: "0.75rem" }}>
                            ({acceptedEvents.length - 3} more)
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {acceptedEvents.length > 0 ? (
                    (showAllEvents
                      ? acceptedEvents
                      : acceptedEvents.slice(0, 3)
                    ).map((event) => (
                      <div key={`event-${event.id}`} className="event-card">
                        <h3
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            color: "#333",
                          }}
                        >
                          {event.eventName || "New Event"}
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div className="event-details-icons">
                            <span>🗓️</span> {formatDate(event.eventDate)}
                          </div>
                          <div className="event-details-icons">
                            <span>⏰</span> {formatTime(event.eventTime)}
                          </div>
                          <div className="event-details-icons">
                            <span>📍</span> {event.venue || "TBC"}
                          </div>
                        </div>
                        <div
                          style={{ marginTop: "auto", paddingTop: "0.5rem" }}
                        >
                          <button
                            className="view-details-btn"
                            onClick={() =>
                              navigate(`/vendor/event/${event.id}`)
                            }
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p
                      style={{
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        padding: "2rem",
                        margin: 0,
                      }}
                    >
                      No upcoming events. Accepted events will appear here.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  flex: "1",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="section-header">
                  <h2 style={{ margin: 0, borderBottom: "none" }}>Calendar</h2>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "1rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    flex: "1",
                  }}
                >
                  <Calendar
                    onChange={setDate}
                    value={date}
                    className="dashboard-calendar"
                    next2Label={null}
                    prev2Label={null}
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
                              {event.eventName}
                            </div>
                            <div
                              style={{ fontSize: "0.875rem", color: "#6c757d" }}
                            >
                              {event.eventTime} • {event.venue || "No location"}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
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
          </div>

          {/* Pending Requests Section */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="pending-requests-card">
              <div className="section-header">
                <h2 style={{ margin: 0 }}>Pending Requests</h2>
              </div>
              {pendingRequests.length > 0 ? (
                <ul className="pending-list">
                  {pendingRequests.map((request) => (
                    <li key={request.requestId}>
                      <div className="request-item">
                        <div className="request-details">
                          <div
                            style={{ fontWeight: "600", marginBottom: "4px" }}
                          >
                            {request.eventName || "New Event"}
                          </div>
                          <div
                            style={{ fontSize: "0.875rem", color: "#6c757d" }}
                          >
                            {request.eventDate
                              ? request.eventDate.toLocaleDateString()
                              : "No Date"}{" "}
                            •{" "}
                            {request.eventTime
                              ? new Date(request.eventTime).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "No Time"}{" "}
                            • {request.venue || "Venue TBC"} •{" "}
                            {request.plannerName || "Planner"}
                          </div>
                        </div>
                        <div className="request-actions">
                          <button
                            className="accept-btn"
                            onClick={() =>
                              handleRequestResponse(
                                request.requestId,
                                "accepted"
                              )
                            }
                          >
                            Accept
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() =>
                              handleRequestResponse(
                                request.requestId,
                                "rejected"
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  style={{
                    textAlign: "center",
                    color: "#6c757d",
                    margin: "1.5rem 0",
                  }}
                >
                  No pending requests at the moment.
                </p>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              gridColumn: "1 / -1",
              marginTop: "2rem",
            }}
          >
            <ChatUI
              listTitle="Planners"
              vendors={[
                {
                  id: 1,
                  name: "Alice Johnson",
                  lastMessage: "Hi, can you confirm your availability?",
                  unread: 0,
                },
              ]}
              onSendMessage={(message) => {
                console.log("Message to planner:", message);
              }}
              onSelectVendor={(vendor) => {
                // Handle vendor selection if needed
              }}
              showSearch={false}
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
            style={{ maxWidth: "90%", maxHeight: "90%", position: "relative" }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowImageModal(false);
              }}
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
                zIndex: 1001,
              }}
            >
              ✕
            </button>
            {preview && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
