// src/pages/PlannerDashboard.jsx
import React from "react";

export default function PlannerDashboard() {

  // Click handler for "View all" button
  const handleViewAll = () => {
    // Example: navigate somewhere or just log
    console.log("View all clicked");
  };

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1>
          <strong>Hi, Planner Name!</strong>
        </h1>
        <button className="add-btn">+ Add Event</button>
      </div>

      <div className="dashboard-grid">
        <div>
          {/* Upcoming Events */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.7rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1.3rem",
                fontWeight: 600,
                color: "#333",
              }}
            >
              Upcoming Events
            </h2>
            <button
              onClick={handleViewAll}
              style={{
                background: "none",
                border: "none",
                color: "var(--blush)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "1rem",
                cursor: "pointer",
                padding: 0,
              }}
            >
              View all
            </button>
          </div>

          <div className="cards-row">
            <div className="event-card">
              <h3>Meeting with Client</h3>
              <p>
                23 August 2025
                <br />
                Venue: Sandton Sky
                <br />
                Time: 12:00 - 16:00
              </p>
              <button className="view-btn">View</button>
            </div>

            <div className="event-card">
              <h3>Wedding Booking</h3>
              <p>
                25 October 2025
                <br />
                Venue: La Parada Fourways
                <br />
                Time: 17:00 - 22:00
              </p>
              <button className="view-btn">View</button>
            </div>

            <div className="event-card">
              <h3>Vendor Showcase</h3>
              <p>
                3 October 2025
                <br />
                Venue: The Leonardo
                <br />
                Time: 16:00 - 19:00
              </p>
              <button className="view-btn">View</button>
            </div>
          </div>

          {/* Checklist */}
          <div className="section-card">
            <h2>Checklist</h2>
            <ul className="pending-list">
              <li>
                <span>
                  <i className="fa fa-clipboard-list"></i> Send follow-up emails
                </span>
                <button className="details-btn">View details</button>
              </li>
              <li>
                <span>
                  <i className="fa fa-clipboard-list"></i> Review budget for Q3
                </span>
                <button className="details-btn">View details</button>
              </li>
              <li>
                <span>
                  <i className="fa fa-clipboard-list"></i> Source new florists
                </span>
                <button className="details-btn">View details</button>
              </li>
            </ul>
          </div>

          {/* Chat Section */}
          <div className="chat-section">
            <h2>Chat with Vendors</h2>
            <div className="chat-box">
              <div className="chat-avatar">
                <i className="fa fa-user"></i>
              </div>
              <div className="chat-message">
                Hi, can you confirm the menu for the Tea Party?
              </div>
              <div className="chat-meta">Yesterday</div>
            </div>
            <div className="chat-box">
              <div className="chat-avatar">
                <i className="fa fa-user"></i>
              </div>
              <div className="chat-message">
                Yes, we can provide a vegan option.
              </div>
              <div className="chat-meta">Today</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div>
          <div className="calendar-card">
            <div className="calendar-header">
              <button className="nav-btn">
                <i className="fas fa-chevron-left"></i>
              </button>
              <h3>August</h3>
              <button className="nav-btn">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>

            <div className="calendar-grid">
              <div className="day-name">Mo</div>
              <div className="day-name">Tu</div>
              <div className="day-name">We</div>
              <div className="day-name">Th</div>
              <div className="day-name">Fr</div>
              <div className="day-name">Sa</div>
              <div className="day-name">Su</div>
              {/* Example days */}
              <div className="day-number current-month">1</div>
              <div className="day-number current-month today">2</div>
              <div className="day-number current-month">3</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
