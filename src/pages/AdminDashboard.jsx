// src/pages/AdminDashboard.jsx
import React from "react";
import '../AdminDash.css';

export default function AdminDashboard() {
  // const [planners, setPlanners] = useState({
  //   unapproved: [],
  //   approved: []
  // });

  // const handleApprove = (id) => {
  //   // This function will be implemented when we have data
  //   console.log("Approve planner with id:", id);
  // };


  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1>
          <strong>Hi, Admin Name!</strong>
        </h1>
      </div>
 <nav>
        <div className="logo"><span className="gradient">Event-ually Perfect</span></div>
        <div className="nav-links">
          <i className="fa fa-bars" aria-hidden="true"></i>
        </div>
      </nav>
      <div className="dashboard-content">
        {/* Planner Management Section */}
        <section className="planner-management">
          <div className="section-header">
            <h1>Planners</h1>
            <button className="pdf-btn">
              <i className="fa fa-add" aria-hidden="true"></i> Add Planner
            </button>
          </div>
          
          <div className="planner-sections">
            <section className="pending-section">
              <h2>Unapproved</h2>
              <table className="planner-table">
                <thead>
                  <tr className="table-headings">
                    <th>Name</th>
                    <th>Status</th>
                    <th>Approve</th>  
                    <th>Request Date</th>    
                  </tr>
                </thead>
                <tbody>
                  {/* Table data will be added later */}
                </tbody>
              </table>
              <div className="empty-state">
                <i className="fa fa-users" aria-hidden="true"></i>
                <p>No unapproved planners</p>
              </div>
            </section>
            
            <section className="approved-section">
              <h2>Approved</h2>
              <table className="planner-table">
                <thead>
                  <tr className="table-headings">
                    <th>Name</th>
                    <th>Date joined</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Table data will be added later */}
                </tbody>
              </table>
              <div className="empty-state">
                <i className="fa fa-users" aria-hidden="true"></i>
                <p>No approved planners</p>
              </div>
            </section>
          </div>
        </section>
      </div>
      {/* Vendor Management Section */}
        <section className="planner-management">
          <div className="section-header">
            <h1>Vendors</h1>
            <button className="pdf-btn">
              <i className="fa fa-add" aria-hidden="true"></i> Add Vendor
            </button>
          </div>
          
          <div className="planner-sections">
            <section className="pending-section">
              <h2>Unapproved</h2>
              <table className="planner-table">
                <thead>
                  <tr className="table-headings">
                    <th>Name</th>
                    <th>Status</th>
                    <th>Approve</th>  
                    <th>Request Date</th>    
                  </tr>
                </thead>
                <tbody>
                  {/* Table data will be added later */}
                </tbody>
              </table>
              <div className="empty-state">
                <i className="fa fa-users" aria-hidden="true"></i>
                <p>No unapproved planners</p>
              </div>
            </section>
            
            <section className="approved-section">
              <h2>Approved</h2>
              <table className="planner-table">
                <thead>
                  <tr className="table-headings">
                    <th>Name</th>
                    <th>Date joined</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Table data will be added later */}
                </tbody>
              </table>
              <div className="empty-state">
                <i className="fa fa-users" aria-hidden="true"></i>
                <p>No approved planners</p>
              </div>
            </section>
          </div>
        </section>
      </div>
  );
}
