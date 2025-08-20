import React from "react";

// The import for "./VendorDashboard.css" has been removed.
// The component will now use the global styles from index.css.

function VendorDashboard() {
  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1>Hi, Vendor Name!</h1>
        <button className="add-btn">+ Add Service</button>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div>
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
                color: "var(--text-primary)",
              }}
            >
              Upcoming Events
            </h2>
            <a
              href="#"
              style={{
                color: "var(--blush)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "1rem",
              }}
            >
              View all
            </a>
          </div>

          <div className="cards-row">
            <div className="event-card">
              <h3>Wedding Booking</h3>
              <p>
                23 August 2025
                <br />
                Venue: La Parada Fourways
                <br />
                Time: 12:00 - 16:00
              </p>
              <button className="view-btn">View</button>
            </div>
            <div className="event-card">
              <h3>Birthday Party</h3>
              <p>
                25 October 2025
                <br />
                Venue: Sandton Sky
                <br />
                Time: 17:00 - 22:00
              </p>
              <button className="view-btn">View</button>
            </div>
            <div className="event-card">
              <h3>Corporate Event</h3>
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

          <div className="section-card">
            <h2>Pending Requests</h2>
            <ul className="pending-list">
              <li>
                <span>
                  <i className="fa fa-clipboard-list"></i> Decor for Tea Party - 20 Aug
                </span>
                <button className="details-btn">View details</button>
              </li>
              <li>
                <span>
                  <i className="fa fa-clipboard-list"></i> Catering for Launch Party - 3 Oct
                </span>
                <button className="details-btn">View details</button>
              </li>
              <li>
                <span>
                  <i className="fa fa-clipboard-list"></i> DJ for Wedding - 23 Aug
                </span>
                <button className="details-btn">View details</button>
              </li>
            </ul>
          </div>

          <div className="chat-section">
            <h2>Chat with Planners</h2>
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

        {/* Right Column (Calendar) */}
        <div>
          <div className="calendar-card card">
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
              <div className="day-number">28</div>
              <div className="day-number">29</div>
              <div className="day-number">30</div>
              <div className="day-number">31</div>
              <div className="day-number current-month">1</div>
              <div className="day-number current-month">2</div>
              <div className="day-number current-month">3</div>
              <div className="day-number current-month">4</div>
              <div className="day-number current-month">5</div>
              <div className="day-number current-month">6</div>
              <div className="day-number current-month">7</div>
              <div className="day-number current-month today">8</div>
              <div className="day-number current-month">9</div>
              <div className="day-number current-month">10</div>
              <div className="day-number current-month">11</div>
              <div className="day-number current-month">12</div>
              <div className="day-number current-month">13</div>
              <div className="day-number current-month">14</div>
              <div className="day-number current-month">15</div>
              <div className="day-number current-month">16</div>
              <div className="day-number current-month">17</div>
              <div className="day-number current-month">18</div>
              <div className="day-number current-month">19</div>
              <div className="day-number current-month">20</div>
              <div className="day-number current-month">21</div>
              <div className="day-number current-month">22</div>
              <div className="day-number current-month">23</div>
              <div className="day-number current-month">24</div>
              <div className="day-number current-month">25</div>
              <div className="day-number current-month">26</div>
              <div className="day-number current-month">27</div>
              <div className="day-number">1</div>
              <div className="day-number">2</div>
              <div className="day-number">3</div>
              <div className="day-number">4</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;