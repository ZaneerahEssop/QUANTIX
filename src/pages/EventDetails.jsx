import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../client";
import {
  FaArrowLeft,
  FaEdit,
  FaSave,
  FaUpload,
  FaFilePdf,
  FaTimes,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaStar,
  FaPlus,
  FaTrash,
  FaEnvelope,
} from "react-icons/fa";
import "../styling/eventDetails.css";

// --- Your original sub-components (EventSchedule, GuestManagement) are preserved below ---
const EventSchedule = ({ schedule, onUpdate, isEditing }) => {
  const handleAddItem = () =>
    onUpdate([...(schedule || []), { time: "", activity: "" }]);
  const handleRemoveItem = (index) =>
    onUpdate((schedule || []).filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newSchedule = [...(schedule || [])];
    newSchedule[index][field] = value;
    onUpdate(newSchedule);
  };
  return (
    <div className="schedule-section">
      <div className="section-header">
        <h2>Schedule</h2>
      </div>
      {isEditing ? (
        <>
          {(schedule || []).map((item, index) => (
            <div key={index} className="schedule-item editable">
              <input
                type="time"
                value={item.time}
                onChange={(e) =>
                  handleItemChange(index, "time", e.target.value)
                }
              />
              <input
                type="text"
                value={item.activity}
                onChange={(e) =>
                  handleItemChange(index, "activity", e.target.value)
                }
                placeholder="Activity"
              />
              <button
                onClick={() => handleRemoveItem(index)}
                className="remove-btn"
              >
                <FaTrash />
              </button>
            </div>
          ))}
          <button onClick={handleAddItem} className="add-btn">
            <FaPlus /> Add Activity
          </button>
        </>
      ) : (
        <div className="schedule-list">
          {schedule && schedule.length > 0 ? (
            schedule.map((item, index) => (
              <div key={index} className="schedule-item">
                <span className="schedule-time">{item.time}</span>
                <span className="schedule-activity">{item.activity}</span>
              </div>
            ))
          ) : (
            <p>No schedule items have been added yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

// Add EventTheme component here
const EventTheme = ({ theme, onUpdate, isEditing = true }) => {
  const handleChange = (field, value) => {
    onUpdate({ ...theme, [field]: value });
  };

  const handleColorChange = (index, value) => {
    const newColors = [...theme.colors];
    newColors[index] = value;
    onUpdate({ ...theme, colors: newColors });
  };

  const addColor = () => {
    onUpdate({ ...theme, colors: [...(theme.colors || []), "#ffffff"] });
  };

  const removeColor = (index) => {
    onUpdate({
      ...theme,
      colors: (theme.colors || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="theme-section">
      <div className="section-header">
        <h2>Event Theme</h2>
      </div>
      {isEditing ? (
        <div className="theme-editor">
          <div className="form-group">
            <label>Theme Name</label>
            <input
              type="text"
              value={theme?.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter theme name"
            />
          </div>

          <div className="form-group">
            <label>Colors</label>
            <div className="color-palette">
              {theme?.colors &&
                theme.colors.map((color, index) => (
                  <div key={index} className="color-item">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                    />
                    <button
                      onClick={() => removeColor(index)}
                      className="remove-color"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              <button onClick={addColor} className="add-color">
                <FaPlus /> Add Color
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Theme Notes</label>
            <textarea
              value={theme?.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add notes about your theme..."
              rows="3"
            />
          </div>
        </div>
      ) : (
        <div className="theme-display">
          {theme?.name ? (
            <>
              <h3>{theme.name}</h3>
              {theme.colors && theme.colors.length > 0 && (
                <div className="color-palette-display">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
              {theme.notes && <p>{theme.notes}</p>}
            </>
          ) : (
            <p>No theme has been set for this event.</p>
          )}
        </div>
      )}
    </div>
  );
};

const GuestManagement = ({ guests, onUpdate, isEditing }) => {
  const [newGuest, setNewGuest] = useState({
    name: "",
    contact: "",
    dietary: "",
    isAttending: false,
  });
  const handleAddGuest = () => {
    if (newGuest.name.trim() !== "") {
      onUpdate([...(guests || []), { ...newGuest, id: Date.now() }]);
      setNewGuest({ name: "", contact: "", dietary: "", isAttending: false });
    }
  };
  const handleUpdateGuest = (guestId, field, value) =>
    onUpdate(
      (guests || []).map((g) =>
        g.id === guestId ? { ...g, [field]: value } : g
      )
    );
  const handleRemoveGuest = (guestId) =>
    onUpdate((guests || []).filter((g) => g.id !== guestId));
  const handleSendInvite = (guest) =>
    alert(
      `Simulating sending an email invite to ${guest.name} at ${guest.contact}`
    );
  return (
    <div className="guests-section">
      <div className="section-header">
        <h2>Guest Management</h2>
      </div>
      {isEditing && (
        <div className="add-guest-form">
          <input
            type="text"
            placeholder="Guest Name"
            value={newGuest.name}
            onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email or Phone"
            value={newGuest.contact}
            onChange={(e) =>
              setNewGuest({ ...newGuest, contact: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Dietary Requirements"
            value={newGuest.dietary}
            onChange={(e) =>
              setNewGuest({ ...newGuest, dietary: e.target.value })
            }
          />
          <button onClick={handleAddGuest}>
            <FaPlus /> Add Guest
          </button>
        </div>
      )}
      <div className="guest-list">
        {guests && guests.length > 0 ? (
          <ul>
            {guests.map((guest) => (
              <li key={guest.id} className="guest-item">
                <div className="guest-info">
                  <input
                    type="checkbox"
                    checked={guest.isAttending}
                    onChange={(e) =>
                      handleUpdateGuest(
                        guest.id,
                        "isAttending",
                        e.target.checked
                      )
                    }
                    disabled={!isEditing}
                  />
                  <div>
                    <strong>{guest.name}</strong>
                    <br />
                    <small>{guest.contact}</small>
                    <br />
                    <small>{guest.dietary}</small>
                  </div>
                </div>
                {isEditing && (
                  <div className="guest-actions">
                    <button
                      onClick={() => handleSendInvite(guest)}
                      title="Send invite"
                    >
                      <FaEnvelope />
                    </button>
                    <button
                      onClick={() => handleRemoveGuest(guest.id)}
                      className="delete-guest"
                      title="Remove guest"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No guests have been added yet.</p>
        )}
      </div>
    </div>
  );
};

// Main EventDetails component
const EventDetails = () => {
  const { id } = useParams();
  const eventId = id;
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState("overview");
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
    venue: "",
    notes: "",
  });
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [guests, setGuests] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [theme, setTheme] = useState({ name: "", colors: [], notes: "" });

  const API_URL =
    window.location.hostname === "production"
      ? "https://quantix-production.up.railway.app"
      : "http://localhost:5000";

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Ensure user logged in
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        // 2. Fetch event from backend
        const response = await fetch(`${API_URL}/api/events/id/${eventId}`);
        if (!response.ok) throw new Error("Failed to fetch event");
        const eventData = await response.json();

        if (!eventData) {
          console.error("Event not found");
          setEvent(null);
          return;
        }

        // 3. Update state from backend response
        setEvent(eventData);
        setSchedule(eventData.schedule || []);
        setGuests(eventData.guests || []);
        setTheme(eventData.theme || { name: "", colors: [], notes: "" });
        setDocuments(eventData.documents || []);
        setSelectedVendors(eventData.vendors || []); // <-- backend should return vendor_ids

        // Parse date + time
        const startTime = new Date(eventData.start_time);
        const date = startTime.toISOString().split("T")[0];
        const time = startTime.toTimeString().substring(0, 5);

        setFormData({
          name: eventData.name || "",
          date,
          time,
          venue: eventData.venue || "",
          notes: eventData.notes || "",
        });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Combine date and time for start_time
      const startTime = formData.time
        ? `${formData.date}T${formData.time}`
        : `${formData.date}T00:00:00`;

      // Update event
      const { error } = await fetch(`${API_URL}/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          start_time: `${formData.date}T${formData.time || "00:00"}:00`,
          schedule,
          guests,
          theme,
          documents,
          vendors: selectedVendors,
        }),
      });

      if (error) throw error;

      // Update vendor relationships
      // First remove all existing vendor relationships
      await supabase.from("event_vendors").delete().eq("event_id", eventId);

      // Then add the selected vendors
      if (selectedVendors.length > 0) {
        const vendorRelationships = selectedVendors.map((vendorId) => ({
          event_id: eventId,
          vendor_id: vendorId,
        }));

        const { error: vendorError } = await supabase
          .from("event_vendors")
          .insert(vendorRelationships);

        if (vendorError)
          console.error("Error saving vendor relationships:", vendorError);
      }

      setIsEditing(false);
      setEvent((prev) => ({
        ...prev,
        ...formData,
        start_time: startTime,
        schedule,
        guests,
        theme,
        documents,
      }));

      alert("Event updated successfully!");
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    }
  };

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleExport = async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/events/${eventId}/export`,
      {
        method: "GET",
        headers: {
          // No need for Content-Type for downloads
        },
      }
    );
    if (!response.ok) throw new Error("Failed to export event data");

    // Get filename from Content-Disposition header
    const disposition = response.headers.get("Content-Disposition");
    let filename = `event_export_${eventId}.zip`;
    if (disposition && disposition.includes("filename=")) {
      filename = disposition.split("filename=")[1].replace(/"/g, "");
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert("Export failed: " + error.message);
  }
};

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    const newDocs = [];
    const totalFiles = files.length;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const safeEventName = formData.name
          .replace(/\s+/g, "_")
          .replace(/[^\w-]/g, "");
        const filePath = `events/${eventId}/${safeEventName}/${file.name}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("event-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("event-documents").getPublicUrl(filePath);

        newDocs.push({
          name: file.name,
          url: publicUrl,
          uploaded_at: new Date().toISOString(),
        });
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      if (newDocs.length > 0) {
        // Update event with new documents
        const { error } = await supabase
          .from("events")
          .update({
            documents: [...documents, ...newDocs],
            updated_at: new Date().toISOString(),
          })
          .eq("event_id", eventId);

        if (error) throw error;

        setDocuments((prev) => [...prev, ...newDocs]);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`An error occurred during upload: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteDocument = async (docToDelete) => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Remove document reference from event
      const { error } = await supabase
        .from("events")
        .update({
          documents: documents.filter((doc) => doc.url !== docToDelete.url),
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);

      if (error) throw error;

      setDocuments((prev) => prev.filter((doc) => doc.url !== docToDelete.url));
    } catch (error) {
      console.error("Error deleting document reference:", error);
    }
  };

  if (isLoading) return <div className="loading">Loading event details...</div>;
  if (!event)
    return (
      <div className="error">
        <h2>Event Not Found</h2>
        <p>
          The requested event could not be found or you don't have permission to
          view it.
        </p>
        <button onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="button-group">
          <button
            onClick={() => setActiveView("overview")}
            className={`new-button ${
              activeView === "overview" ? "active" : ""
            }`}
          >
            Event Overview
          </button>
          <button
            onClick={() => setActiveView("guests")}
            className={`new-button ${activeView === "guests" ? "active" : ""}`}
          >
            Guest Management
          </button>
          <button
            onClick={() => setActiveView("vendors")}
            className={`new-button ${activeView === "vendors" ? "active" : ""}`}
          >
            Vendor Management
          </button>
          <button
            onClick={() => setActiveView("documents")}
            className={`new-button ${
              activeView === "documents" ? "active" : ""
            }`}
          >
            Document Management
          </button>
        </div>
        <div className="header-actions">
          {isEditing ? (
            <button onClick={handleSave} className="save-button">
              <FaSave /> Save Changes
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="edit-button">
              <FaEdit /> Edit Event
            </button>
          )}

          <button onClick={handleExport} className="export-button">
              <FaUpload /> Export Event Data
            </button>
        </div>
      </div>
      <div className="event-info-boxes">
        <div className="info-box date-box">
          <h4>
            <FaCalendarAlt /> Date
          </h4>
          <p>
            {isEditing ? (
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
              />
            ) : (
              formatDisplayDate(formData.date)
            )}
          </p>
        </div>
        <div className="info-box time-box">
          <h4>
            <FaClock /> Time
          </h4>
          <p>
            {isEditing ? (
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
              />
            ) : (
              formData.time || "Not specified"
            )}
          </p>
        </div>
        <div className="info-box venue-box">
          <h4>
            <FaMapMarkerAlt /> Venue
          </h4>
          <p>
            {isEditing ? (
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                placeholder="Venue"
              />
            ) : (
              event.venue || "Not specified"
            )}
          </p>
        </div>
        <div className="info-box theme-box">
          <h4>
            <FaStar /> Theme
          </h4>
          <p>{event.theme?.name || "Not specified"}</p>
        </div>
      </div>
      <div className="event-sections">
        {activeView === "overview" && (
          <>
            <section>
              <EventSchedule
                schedule={schedule}
                onUpdate={setSchedule}
                isEditing={isEditing}
              />
            </section>
            <section>
              <EventTheme theme={theme} onUpdate={setTheme} />
            </section>
          </>
        )}
        {activeView === "guests" && (
          <GuestManagement
            guests={guests}
            onUpdate={setGuests}
            isEditing={isEditing}
          />
        )}
        {activeView === "vendors" && (
          <section className="vendors-section">
            <div className="section-header">
              <h2>Vendors</h2>
            </div>
            {isEditing ? (
              <div className="vendor-selection">
                {vendors.map((vendor) => (
                  <label key={vendor.vendor_id} className="vendor-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendor.vendor_id)}
                      onChange={() => handleVendorToggle(vendor.vendor_id)}
                    />
                    {vendor.business_name} ({vendor.service_type})
                  </label>
                ))}
              </div>
            ) : (
              <div className="vendors-list">
                {selectedVendors.length > 0 ? (
                  <ul>
                    {selectedVendors.map((vendorId) => {
                      const vendor = vendors.find(
                        (v) => v.vendor_id === vendorId
                      );
                      return vendor ? (
                        <li key={vendorId}>
                          <strong>{vendor.business_name}</strong> -{" "}
                          {vendor.service_type}
                          <br />
                          <small>{vendor.contact_number}</small>
                        </li>
                      ) : null;
                    })}
                  </ul>
                ) : (
                  <p>No vendors selected</p>
                )}
              </div>
            )}
          </section>
        )}
        {activeView === "documents" && (
          <section className="documents-section">
            <div className="documents-header">
              <h2>Documents</h2>
            </div>
            {isEditing && (
              <div className="upload-area">
                <label className="upload-button">
                  <FaUpload /> Upload Documents
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    disabled={isUploading}
                  />
                </label>
                {isUploading && (
                  <div className="upload-progress">
                    <progress value={uploadProgress} max="100" />
                    <span>Uploading... {uploadProgress}%</span>
                  </div>
                )}
              </div>
            )}
            <div className="documents-list">
              {documents && documents.length > 0 ? (
                <ul>
                  {documents.map((doc, index) => (
                    <li key={index} className="document-item">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaFilePdf /> {doc.name}
                      </a>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="delete-doc"
                          title="Delete document"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No documents uploaded yet</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
