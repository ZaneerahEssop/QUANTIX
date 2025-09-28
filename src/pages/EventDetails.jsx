import { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaEdit,
  FaEnvelope,
  FaFilePdf,
  FaMapMarkerAlt,
  FaPlus,
  FaSave,
  FaSearch,
  FaStar,
  FaTimes,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../client";
import "../styling/eventDetails.css";

// --- Sub-components with individual edit controls ---
const EventSchedule = ({ schedule, onUpdate, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleAddItem = () =>
    onUpdate([...(schedule || []), { time: "", activity: "" }]);
  const handleRemoveItem = (index) =>
    onUpdate((schedule || []).filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newSchedule = [...(schedule || [])];
    newSchedule[index][field] = value;
    onUpdate(newSchedule);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="schedule-section">
      <div className="section-header">
        <h2>Schedule</h2>
        {!isReadOnly && (
          <div className="section-actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-section-btn">
                  <FaCheck /> Save
                </button>
                <button onClick={handleCancel} className="cancel-section-btn">
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-section-btn">
                <FaEdit /> Edit
              </button>
            )}
          </div>
        )}
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

const EventTheme = ({ theme, onUpdate, isReadOnly }) => {
  const [isEditing, setIsEditing] = useState(false);

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

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="theme-section">
      <div className="section-header">
        <h2>Event Theme</h2>
        {!isReadOnly && (
          <div className="section-actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-section-btn">
                  <FaCheck /> Save
                </button>
                <button onClick={handleCancel} className="cancel-section-btn">
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-section-btn">
                <FaEdit /> Edit
              </button>
            )}
          </div>
        )}
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

const GuestManagement = ({ guests, onUpdate, isReadOnly, eventData, API_URL }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: "",
    contact: "",
    dietary: "",
    rsvpStatus: "pending",
  });

  const handleAddGuest = () => {
    if (newGuest.name.trim() !== "") {
      onUpdate([...(guests || []), { ...newGuest, id: Date.now() }]);
      setNewGuest({
        name: "",
        contact: "",
        dietary: "",
        rsvpStatus: "pending",
      });
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

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSendInvite = async (guest) => {
    alert(`Email functionality is temporarily disabled. Guest ${guest.name} (${guest.contact}) would receive an invitation to ${eventData?.name || "the event"}.`);
  };

  return (
    <div className="guests-section">
      <div className="section-header">
        <h2>Guest Management</h2>
        {!isReadOnly && (
          <div className="section-actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-section-btn">
                  <FaCheck /> Save
                </button>
                <button onClick={handleCancel} className="cancel-section-btn">
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-section-btn">
                <FaEdit /> Edit
              </button>
            )}
          </div>
        )}
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
            placeholder="Email"
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
                  <div>
                    <strong>{guest.name}</strong>
                    <br />
                    <small>{guest.contact}</small>
                    <br />
                    {guest.dietary && <small>Dietary: {guest.dietary}</small>}
                  </div>
                </div>

                {!isEditing && (
                  <div className="guest-actions view-mode">
                    <button
                      onClick={() => handleSendInvite(guest)}
                      title="Send invite"
                      className="send-invite-btn"
                    >
                      <FaEnvelope /> Send Invite
                    </button>
                    <div className="rsvp-controls">
                      <span>RSVP:</span>
                      <label>
                        <input
                          type="checkbox"
                          checked={guest.rsvpStatus === "attending"}
                          onChange={() => {
                            const newStatus =
                              guest.rsvpStatus === "attending"
                                ? "pending"
                                : "attending";
                            handleUpdateGuest(
                              guest.id,
                              "rsvpStatus",
                              newStatus
                            );
                          }}
                        />{" "}
                        Yes
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={guest.rsvpStatus === "declined"}
                          onChange={() => {
                            const newStatus =
                              guest.rsvpStatus === "declined"
                                ? "pending"
                                : "declined";
                            handleUpdateGuest(
                              guest.id,
                              "rsvpStatus",
                              newStatus
                            );
                          }}
                        />{" "}
                        No
                      </label>
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="guest-actions">
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

const VendorManagement = ({ 
  vendors, 
  selectedVendors, 
  onVendorToggle, 
  searchTerm, 
  setSearchTerm, 
  selectedCategory, 
  setSelectedCategory, 
  vendorRequests, 
  onVendorRequestResponse,
  isReadOnly 
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <section className="vendors-section">
      <div className="section-header">
        <h2>Vendors</h2>
        {!isReadOnly && (
          <div className="section-actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-section-btn">
                  <FaCheck /> Save
                </button>
                <button onClick={handleCancel} className="cancel-section-btn">
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-section-btn">
                <FaEdit /> Edit
              </button>
            )}
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div>
          <div className="vendor-search-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search for vendors by name or category"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="clear-search"
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <select
              className="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {Array.from(
                new Set([
                  ...vendors.map((v) => v.service_type),
                  "Catering",
                ])
              )
                .filter((type) => type)
                .map((type) => {
                  const displayType =
                    type.toLowerCase() === "venue" ? "Venue" : type;
                  return (
                    <option key={type} value={type}>
                      {displayType}
                    </option>
                  );
                })}
            </select>
          </div>
          <div className="vendor-selection">
            {vendors
              .filter((vendor) => {
                const matchesSearch =
                  !searchTerm ||
                  vendor.business_name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  vendor.service_type
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
                const matchesCategory =
                  selectedCategory === "All" ||
                  vendor.service_type === selectedCategory;
                return matchesSearch && matchesCategory;
              })
              .map((vendor) => (
                <div key={vendor.vendor_id} className="vendor-card">
                  <div className="vendor-info">
                    <h4>{vendor.business_name}</h4>
                    <span className="vendor-category">
                      {vendor.service_type.toLowerCase() === "venue"
                        ? "Venue"
                        : vendor.service_type}
                    </span>
                    <div className="vendor-description">
                      {vendor.description || "No description available."}
                    </div>
                  </div>
                  <div className="vendor-actions">
                    <button
                      type="button"
                      className={`add-vendor-btn ${
                        selectedVendors.includes(vendor.vendor_id)
                          ? "added"
                          : ""
                      }`}
                      onClick={() => onVendorToggle(vendor.vendor_id)}
                    >
                      {selectedVendors.includes(vendor.vendor_id) ? (
                        <>
                          <FaCheck /> Requested
                        </>
                      ) : (
                        <>
                          <FaPlus /> Request Vendor
                        </>
                      )}
                    </button>
                    {selectedVendors.includes(vendor.vendor_id) && (
                      <button
                        type="button"
                        className="undo-request-btn"
                        onClick={() => onVendorToggle(vendor.vendor_id)}
                      >
                        <FaTimes /> Undo
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
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
            <div className="no-vendors-section">
              <p>No vendors selected</p>

              {vendorRequests && vendorRequests.length > 0 && (
                <div className="vendor-requests-container">
                  <h4>Vendor Requests</h4>
                  <div className="vendor-requests-list">
                    {vendorRequests.map((request) => (
                      <div
                        key={request.request_id}
                        className="vendor-request-item"
                      >
                        <div className="vendor-request-info">
                          <strong>
                            {request.vendor?.business_name || "Vendor"}
                          </strong>
                          <span
                            className={`status-badge status-${request.status}`}
                          >
                            {request.status}
                          </span>
                          <div className="vendor-details">
                            <small>
                              Service:{" "}
                              {request.vendor?.service_type || "Unknown"}
                            </small>
                            <small>
                              Contact:{" "}
                              {request.vendor?.contact_number ||
                                "Not provided"}
                            </small>
                          </div>
                        </div>
                        <div className="vendor-request-actions">
                          {request.status === "pending" && isEditing && (
                            <div className="action-buttons">
                              <button
                                onClick={() =>
                                  onVendorRequestResponse(
                                    request.request_id,
                                    "accepted"
                                  )
                                }
                                className="accept-btn"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() =>
                                  onVendorRequestResponse(
                                    request.request_id,
                                    "rejected"
                                  )
                                }
                                className="reject-btn"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {request.status === "accepted" && (
                            <span className="status-label accepted">
                              ✓ Accepted
                            </span>
                          )}
                          {request.status === "rejected" && (
                            <span className="status-label rejected">
                              ✗ Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const DocumentManagement = ({ 
  documents, 
  onFileUpload, 
  onDeleteDocument, 
  isUploading, 
  uploadProgress, 
  isReadOnly 
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <section className="documents-section">
      <div className="section-header">
        <h2>Documents</h2>
        {!isReadOnly && (
          <div className="section-actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-section-btn">
                  <FaCheck /> Save
                </button>
                <button onClick={handleCancel} className="cancel-section-btn">
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-section-btn">
                <FaEdit /> Edit
              </button>
            )}
          </div>
        )}
      </div>
      
      {isEditing && (
        <div className="upload-area">
          <label className="upload-button">
            <FaUpload /> Upload Documents
            <input
              type="file"
              multiple
              onChange={onFileUpload}
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
                    onClick={() => onDeleteDocument(doc)}
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
  );
};

// Main EventDetails component
const EventDetails = () => {
  const { id } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const isReadOnly = searchParams.get("readonly") === "true";
  const eventId = id;
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [guests, setGuests] = useState([]);
  const initialGuestsRef = useRef([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [theme, setTheme] = useState({ name: "", colors: [], notes: "" });
  const [vendorRequests, setVendorRequests] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const API_URL =
    window.location.hostname === "production"
      ? "https://quantix-production.up.railway.app"
      : "http://localhost:5001";

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";

  // Format functions
  const formatGuestStatusForUI = (dbStatus) => {
    if (dbStatus === "Attending") return "attending";
    if (dbStatus === "Declined") return "declined";
    return "pending";
  };

  const formatGuestStatusForDB = (uiStatus) => {
    if (uiStatus === "attending") return "Attending";
    if (uiStatus === "declined") return "Declined";
    return "Pending";
  };

  // Fetch functions
  const fetchVendors = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/api/vendors`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch vendors");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const eventResponse = await fetch(
          `${API_URL}/api/events/id/${eventId}`
        );
        if (!eventResponse.ok) throw new Error("Failed to fetch event");
        const fetchedEventData = await eventResponse.json();

        if (!fetchedEventData) {
          console.error("Event not found");
          setEventData(null);
          return;
        }

        const guestsResponse = await fetch(`${API_URL}/api/guests/${eventId}`);
        if (!guestsResponse.ok) throw new Error("Failed to fetch guests");
        const guestsData = await guestsResponse.json();

        const formattedGuests = guestsData.map((g) => ({
          id: g.guest_id,
          name: g.name,
          contact: g.email || "",
          dietary: g.dietary_info || "",
          rsvpStatus: formatGuestStatusForUI(g.rsvp_status),
        }));

        setGuests(formattedGuests);
        initialGuestsRef.current = formattedGuests;

        setEventData(fetchedEventData);
        setSchedule(fetchedEventData.schedule || []);
        setTheme(fetchedEventData.theme || { name: "", colors: [], notes: "" });
        setDocuments(fetchedEventData.documents || []);
        setSelectedVendors(fetchedEventData.vendors || []);

        const startTime = new Date(fetchedEventData.start_time);
        const date = startTime.toISOString().split("T")[0];
        const time = startTime.toTimeString().substring(0, 5);

        setFormData({
          name: fetchedEventData.name || "",
          date,
          time,
          venue: fetchedEventData.venue || "",
          notes: fetchedEventData.notes || "",
        });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId, navigate, API_URL]);

  useEffect(() => {
    const fetchVendorRequests = async () => {
      try {
        if (!eventId) return;

        const response = await fetch(
          `${API_BASE}/api/vendor-requests/event/${eventId}`
        );

        if (response.ok) {
          const requestsData = await response.json();
          setVendorRequests(requestsData || []);
        }
      } catch (error) {
        console.error("Error fetching vendor requests:", error);
      }
    };

    fetchVendorRequests();
  }, [eventId, API_BASE]);

  // Handler functions
  const handleVendorRequestResponse = async (requestId, status) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/vendor-requests/${requestId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        setVendorRequests((prev) =>
          prev.map((req) =>
            req.request_id === requestId ? { ...req, status } : req
          )
        );

        if (status === "accepted") {
          const request = vendorRequests.find(
            (req) => req.request_id === requestId
          );
          if (request && request.vendor_id) {
            setSelectedVendors((prev) => [...prev, request.vendor_id]);
          }
        }

        alert(`Vendor request ${status} successfully!`);
      }
    } catch (error) {
      console.error("Error updating vendor request:", error);
      alert("Failed to update vendor request.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuestUpdates = async () => {
    const currentGuestsMap = new Map(guests.map((g) => [g.id, g]));
    const promises = [];

    for (const initialGuest of initialGuestsRef.current) {
      if (!currentGuestsMap.has(initialGuest.id)) {
        promises.push(
          fetch(`${API_URL}/api/guests/${eventId}/${initialGuest.id}`, {
            method: "DELETE",
          })
        );
      }
    }

    for (const currentGuest of guests) {
      const payload = {
        name: currentGuest.name,
        email: currentGuest.contact,
        rsvp_status: formatGuestStatusForDB(currentGuest.rsvpStatus),
        dietary_info: currentGuest.dietary,
      };

      if (typeof currentGuest.id === "number") {
        promises.push(
          fetch(`${API_URL}/api/guests/${eventId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        );
      } else {
        const initialGuest = initialGuestsRef.current.find(
          (g) => g.id === currentGuest.id
        );
        if (JSON.stringify(initialGuest) !== JSON.stringify(currentGuest)) {
          promises.push(
            fetch(`${API_URL}/api/guests/${eventId}/${currentGuest.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          );
        }
      }
    }

    await Promise.all(promises);
  };

  const handleVendorToggle = (vendorId) => {
    if (isReadOnly) return;
    setSelectedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events/${eventId}/export`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("Failed to export event data");

      const disposition = response.headers.get("Content-Disposition");
      let filename = `event_export_${eventId}.zip`;
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }

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
    if (isReadOnly) return;
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

        const { error: uploadError } = await supabase.storage
          .from("event-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

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

  const handleSave = async () => {
    if (isReadOnly) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await handleGuestUpdates();

      const startTime = formData.time
        ? `${formData.date}T${formData.time}`
        : `${formData.date}T00:00:00`;

      const mainEventPayload = {
        ...formData,
        start_time: `${formData.date}T${formData.time || "00:00"}:00`,
        schedule,
        theme,
        documents,
        vendors: selectedVendors,
      };

      const response = await fetch(`${API_URL}/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mainEventPayload),
      });
      
      if (!response.ok) throw new Error("Failed to update event");

      setIsEditing(false);

      // Refresh event data
      const eventResponse = await fetch(`${API_URL}/api/events/id/${eventId}`);
      if (eventResponse.ok) {
        const updatedEventData = await eventResponse.json();
        setEventData(updatedEventData);
      }

      alert("Event updated successfully!");
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    }
  };

  const handleCancel = () => {
    // Reload original data to cancel changes
    if (eventData) {
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
      setSchedule(eventData.schedule || []);
      setTheme(eventData.theme || { name: "", colors: [], notes: "" });
      setDocuments(eventData.documents || []);
      setSelectedVendors(eventData.vendors || []);
    }
    setIsEditing(false);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) return <div className="loading">Loading event details...</div>;
  if (!eventData)
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

  return (
    <div className="event-details">
      <div className="event-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="button-group">
          <button
            onClick={() => setActiveView("overview")}
            className={`new-button ${activeView === "overview" ? "active" : ""}`}
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
            className={`new-button ${activeView === "documents" ? "active" : ""}`}
          >
            Document Management
          </button>
        </div>
        <div className="header-actions">
          <button onClick={handleExport} className="export-button">
            <FaUpload /> Export Event Data
          </button>
        </div>
      </div>

      {/* Global Edit Controls */}
      {!isReadOnly && (
        <div className="global-edit-controls">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="save-section-btn">
                <FaCheck /> Save All Changes
              </button>
              <button onClick={handleCancel} className="cancel-section-btn">
                <FaTimes /> Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="edit-section-btn">
              <FaEdit /> Edit Event Details
            </button>
          )}
        </div>
      )}

      <div className="event-info-boxes">
        <div className="info-box date-box">
          <h4>
            <FaCalendarAlt /> Date
          </h4>
          {isEditing ? (
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="edit-input"
            />
          ) : (
            <p>{formatDisplayDate(formData.date)}</p>
          )}
        </div>
        
        <div className="info-box time-box">
          <h4>
            <FaClock /> Time
          </h4>
          {isEditing ? (
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              className="edit-input"
            />
          ) : (
            <p>{formData.time || "Not specified"}</p>
          )}
        </div>
        
        <div className="info-box venue-box">
          <h4>
            <FaMapMarkerAlt /> Venue
          </h4>
          {isEditing ? (
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleInputChange}
              placeholder="Enter venue"
              className="edit-input"
            />
          ) : (
            <p>{eventData.venue || "Not specified"}</p>
          )}
        </div>
        
        <div className="info-box theme-box">
          <h4>
            <FaStar /> Theme
          </h4>
          {isEditing ? (
            <input
              type="text"
              value={theme?.name || ""}
              onChange={(e) => setTheme({ ...theme, name: e.target.value })}
              placeholder="Enter theme name"
              className="edit-input"
            />
          ) : (
            <p>{eventData.theme?.name || "Not specified"}</p>
          )}
        </div>
      </div>

      <div className="event-sections">
        {activeView === "overview" && (
          <>
            <EventSchedule
              schedule={schedule}
              onUpdate={setSchedule}
              isReadOnly={isReadOnly}
            />
            <EventTheme
              theme={theme}
              onUpdate={setTheme}
              isReadOnly={isReadOnly}
            />
          </>
        )}
        
        {activeView === "guests" && (
          <GuestManagement
            guests={guests}
            onUpdate={setGuests}
            isReadOnly={isReadOnly}
            eventData={eventData}
            API_URL={API_URL}
          />
        )}
        
        {activeView === "vendors" && (
          <VendorManagement
            vendors={vendors}
            selectedVendors={selectedVendors}
            onVendorToggle={handleVendorToggle}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            vendorRequests={vendorRequests}
            onVendorRequestResponse={handleVendorRequestResponse}
            isReadOnly={isReadOnly}
          />
        )}
        
        {activeView === "documents" && (
          <DocumentManagement
            documents={documents}
            onFileUpload={handleFileUpload}
            onDeleteDocument={handleDeleteDocument}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    </div>
  );
};

export default EventDetails;