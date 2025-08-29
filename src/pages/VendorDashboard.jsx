import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {doc, getDoc, arrayUnion,updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function VendorDashboard() {
  const [vendorName, setVendorName] = useState("Vendor");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ category: "" });
  // Calendar state
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get vendor data from Firestore
          const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
          if (vendorDoc.exists()) {
            // Use name_of_vendor from the vendors collection
            const vendorName = vendorDoc.data().name_of_vendor;
            if (vendorName) {
              setVendorName(vendorName);
              return;
            }
          }
          
          // Fallback to email username if no name found in vendors collection
          setVendorName(user.email ? user.email.split('@')[0] : "Vendor");
          
        } catch (error) {
          console.error("Error fetching vendor data:", error);
          // Fallback to email username if there's an error
          setVendorName(user.email ? user.email.split('@')[0] : "Vendor");
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  // Click handler for "View all" button
  const handleViewAll = () => {
    console.log("View all clicked");
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
          <div className="section-header">
            <h2 className="section-title">Upcoming Events</h2>
            <button onClick={handleViewAll} className="section-link">
              View all
            </button>
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

          {/* Pending Requests */}
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

          {/* Chat Section */}
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

        {/*Calendar */}
        <div>
          <div className="calendar-card card">
            <Calendar
              onChange={setDate}
              value={date}
              className="dashboard-calendar fixed-size-calendar"
              next2Label={null}             // hides "next year" button
              prev2Label={null}             // hides "previous year" button
            />
          </div>
        </div>

      {/* Add Service Modal */}
          {isModalOpen && (
            <div style={styles.overlay}>
              <div style={styles.modal}>
                <h2>Add a New Service to your catelog</h2>
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

                  <div style={{ marginTop: "1rem" ,display: "flex", gap: "1rem"}}>
                    <button type="submit" className="add-btn"> Add Service
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
    </div>
  );
}

export default VendorDashboard;
