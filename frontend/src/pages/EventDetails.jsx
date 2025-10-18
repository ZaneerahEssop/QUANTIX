import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../client";
import "../styling/eventDetails.css";
import ContractManagement from "../components/ContractManagement";
import {
  searchUnsplashPhotos,
  registerUnsplashDownload,
} from "../services/unsplash";
//import { eventNames } from "../../../Backend/server";

// --- Sub-components (EventSchedule, EventTheme, GuestManagement) with individual edit controls ---
const EventSchedule = ({
  schedule,
  onUpdate,
  isEditing,
  onToggleEdit,
  isReadOnly,
}) => {
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
        {/* ✨ FIX: Edit button is now hidden in read-only mode */}
        {!isReadOnly && (
          <button onClick={onToggleEdit} className="edit-button">
            {isEditing ? <FaSave /> : <FaEdit />}{" "}
            {isEditing ? "Save Schedule" : "Edit Schedule"}
          </button>
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

const EventTheme = ({
  theme,
  onUpdate,
  isEditing,
  onToggleEdit,
  isReadOnly,
}) => {
  const safeTheme =
    typeof theme === "string"
      ? (() => {
          try {
            return JSON.parse(theme);
          } catch (e) {
            return { name: "", colors: [], notes: "" };
          }
        })()
      : theme || { name: "", colors: [], notes: "" };

  const handleChange = (field, value) => {
    onUpdate({ ...safeTheme, [field]: value });
  };

  const handleColorChange = (index, value) => {
    const newColors = [...(safeTheme.colors || [])];
    newColors[index] = value;
    onUpdate({ ...safeTheme, colors: newColors });
  };

  const addColor = () => {
    onUpdate({
      ...safeTheme,
      colors: [...(safeTheme.colors || []), "#ffffff"],
    });
  };

  const removeColor = (index) => {
    onUpdate({
      ...safeTheme,
      colors: (safeTheme.colors || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="theme-section">
      <div className="section-header">
        <h2>Event Theme</h2>
        {/* ✨ FIX: Edit button is now hidden in read-only mode */}
        {!isReadOnly && (
          <button onClick={onToggleEdit} className="edit-button">
            {isEditing ? <FaSave /> : <FaEdit />}{" "}
            {isEditing ? "Save Theme" : "Edit Theme"}
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="theme-editor">
          <div className="form-group">
            <label>Theme Name</label>
            <input
              type="text"
              value={safeTheme.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter theme name"
            />
          </div>

          <div className="form-group">
            <label>Colors</label>
            <div className="color-palette">
              {safeTheme.colors &&
                safeTheme.colors.map((color, index) => (
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
              value={safeTheme.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add notes about your theme..."
              rows="3"
            />
          </div>
        </div>
      ) : (
        <div className="theme-display">
          {safeTheme.name ? (
            <>
              <h3>{safeTheme.name}</h3>
              {safeTheme.colors && safeTheme.colors.length > 0 && (
                <div className="color-palette-display">
                  {safeTheme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
              {safeTheme.notes && <p>{safeTheme.notes}</p>}
            </>
          ) : (
            <p>No theme has been set for this event.</p>
          )}
        </div>
      )}
    </div>
  );
};

const GuestManagement = ({
  guests,
  onUpdate,
  isEditing,
  onToggleEdit,
  eventData,
  API_URL,
  isReadOnly,
  setModalMessage,
  setShowSuccessModal,
  plannerName,
}) => {
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

  const handleSendInvite = async (guest) => {
    if (!guest.contact) {
      setModalMessage(
        `Cannot send invite: No email address for ${guest.name}.`
      );
      setShowSuccessModal(true);
      return;
    }

    try {
      setModalMessage(`Sending invitation to ${guest.name}...`);
      setShowSuccessModal(true);

      let derivedDate = "";
      let derivedTime = "";
      if (eventData?.start_time) {
        const dt = new Date(eventData.start_time);
        if (!isNaN(dt.getTime())) {
          derivedDate = dt.toISOString().split("T")[0];
          derivedTime = dt.toTimeString().substring(0, 5);
        }
      }

      const payload = {
        guestEmail: guest.contact,
        guestName: guest.name,
        eventName: eventData.name,
        eventDate: derivedDate,
        eventTime: derivedTime,
        plannerName: plannerName,
        themeName:
          eventData?.theme && eventData.theme.name
            ? eventData.theme.name
            : typeof eventData?.theme === "string"
            ? (() => {
                try {
                  return JSON.parse(eventData.theme)?.name || "";
                } catch {
                  return "";
                }
              })()
            : "",
      };

      const response = await fetch(`${API_URL}/api/emails/send-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "An unknown error occurred.");
      }

      setModalMessage(`Invitation successfully sent to ${guest.name}!`);
    } catch (error) {
      console.error("Failed to send invitation:", error);
      setModalMessage(`Failed to send invitation: ${error.message}`);
      setShowSuccessModal(true);
    }
  };

  return (
    <div className="guests-section">
      <div className="section-header">
        <h2>Guest Management</h2>
        {/* ✨ FIX: Edit button is now hidden in read-only mode */}
        {!isReadOnly && (
          <button onClick={onToggleEdit} className="edit-button">
            {isEditing ? <FaSave /> : <FaEdit />}{" "}
            {isEditing ? "Save Guests" : "Edit Guests"}
          </button>
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

                {!isEditing && !isReadOnly && (
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

const SuccessModal = ({ message, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-x-btn">
          &times;
        </button>
        <p>{message}</p>
      </div>
    </div>
  );
};

// =================================================================
// ✨ MODIFIED COMPONENT: VendorBookingNotes (Groups by Category)
// =================================================================
const VendorBookingNotes = ({
  groupedVendors, // ✨ FIX: Changed prop from 'vendors'
  bookingNotes,
  onUpdateNotes,
  prices,
  onUpdatePrices,
}) => {
  const [priceErrors, setPriceErrors] = useState({});
  const [editingVendorId, setEditingVendorId] = useState(null);

  const handleNotesChange = (vendorId, notes) => {
    onUpdateNotes({ ...bookingNotes, [vendorId]: notes });
  };

  const handlePriceChange = (vendorId, price) => {
    const lowerPrice = price.toLowerCase();
    const isValidText = lowerPrice.includes(
      "e.g., 1500.00 or Contact for quote"
    );

    if (isValidText) {
      onUpdatePrices({ ...prices, [vendorId]: price });
      return;
    }
    // Clear any previous error
    setPriceErrors((prev) => ({ ...prev, [vendorId]: "" }));

    // Allow empty value (for clearing)
    if (price === "") {
      onUpdatePrices({ ...prices, [vendorId]: "" });
      return;
    }

    // Allow "Contact for quote"  text
    if (/[a-zA-Z]/.test(price) && !isValidText) {
      setPriceErrors((prev) => ({
        ...prev,
        [vendorId]: 'Please enter a valid amount or "Contact for quote"',
      }));
      return;
    }

    // Validation: Only allow numbers, decimal point, and commas
    const sanitizedPrice = price.replace(/[^\d.,]/g, "");

    // Check if it's a valid number format
    const numericValue = parseFloat(sanitizedPrice.replace(/,/g, ""));

    if (!isNaN(numericValue)) {
      // Check maximum value
      if (numericValue > 1000000) {
        setPriceErrors((prev) => ({
          ...prev,
          [vendorId]: "Price cannot exceed R 1,000,000",
        }));
        onUpdatePrices({ ...prices, [vendorId]: "" }); // ← Clear the price
        return;
      }

      // Check for reasonable minimum (optional)
      if (numericValue < 0) {
        setPriceErrors((prev) => ({
          ...prev,
          [vendorId]: "Price cannot be negative",
        }));
        return;
      }
    }

    onUpdatePrices({ ...prices, [vendorId]: sanitizedPrice });
  };

  const handlePriceBlur = (vendorId, price) => {
    // Format the price on blur only if it's a pure number
    if (price && !/[a-zA-Z]/.test(price)) {
      const numericValue = parseFloat(price.replace(/,/g, ""));
      if (!isNaN(numericValue)) {
        // Format with thousand separators and R symbol
        const formattedPrice = new Intl.NumberFormat("en-ZA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numericValue);

        onUpdatePrices({ ...prices, [vendorId]: `R ${formattedPrice}` });
      }
    }
  };

  return (
    <div className="vendor-booking-notes-section">
      <h3>Vendor Booking Details</h3>
      {/* ✨ FIX: Iterate over categories */}
      {Object.keys(groupedVendors)
        .sort()
        .map((category) => (
          <div key={category} className="vendor-category-group">
            {/* ✨ FIX: Add a header for the category */}
            <h4 className="vendor-category-header">{category}</h4>
            <div className="vendor-notes-grid">
              {/* ✨ FIX: Iterate over vendors *within* this category */}
              {groupedVendors[category].map((vendor) => {
                const isCardEditing = editingVendorId === vendor.vendor_id;

                return (
                  <div key={vendor.vendor_id} className="vendor-note-item">
                    <div className="vendor-note-header">
                      <h4>
                        {vendor.business_name}
                        <button
                          onClick={() =>
                            setEditingVendorId(
                              isCardEditing ? null : vendor.vendor_id
                            )
                          }
                          className="edit-vendor-button"
                          title={isCardEditing ? "Save" : "Edit"}
                        >
                          {isCardEditing ? <FaSave /> : <FaEdit />}
                        </button>
                      </h4>
                      {/* We don't need the category span anymore since it's in the header */}
                    </div>

                    <div className="vendor-note-fields">
                      <div className="form-group">
                        <label>Quoted Price</label>
                        {isCardEditing ? (
                          <div className="price-input-container">
                            <input
                              type="text"
                              placeholder="e.g., 1500.00 or Contact for quote"
                              value={prices[vendor.vendor_id] || ""}
                              onChange={(e) =>
                                handlePriceChange(
                                  vendor.vendor_id,
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                handlePriceBlur(
                                  vendor.vendor_id,
                                  e.target.value
                                )
                              }
                              className={`price-input ${
                                priceErrors[vendor.vendor_id] ? "error" : ""
                              }`}
                            />
                            {priceErrors[vendor.vendor_id] && (
                              <div className="price-error-message">
                                {priceErrors[vendor.vendor_id]}
                              </div>
                            )}
                            <div className="price-validation-info">
                              <small>
                                Enter amount (max R 1,000,000) or "Contact for
                                quote"
                              </small>
                            </div>
                          </div>
                        ) : (
                          <div className="price-display">
                            {prices[vendor.vendor_id] || "No price entered"}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Booking Notes</label>
                        {isCardEditing ? (
                          <textarea
                            placeholder="Add notes, contact details, requirements, deadlines..."
                            value={bookingNotes[vendor.vendor_id] || ""}
                            onChange={(e) =>
                              handleNotesChange(
                                vendor.vendor_id,
                                e.target.value
                              )
                            }
                            rows="3"
                            className="notes-textarea"
                          />
                        ) : (
                          <div className="notes-display">
                            {bookingNotes[vendor.vendor_id] || "No notes added"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

// =================================================================
// ✨ MODIFIED COMPONENT: PriceComparison (Groups by Category)
// =================================================================
const PriceComparison = ({ groupedVendors, prices, bookingNotes }) => {
  // ✨ FIX: Changed prop from 'vendors'
  const extractPriceValue = (priceString) => {
    if (!priceString || priceString.toLowerCase().includes("contact"))
      return Infinity;

    // Extract numbers from price string
    const numbers = priceString.replace(/[^0-9.]/g, "");
    return parseFloat(numbers) || Infinity;
  };

  const formatPriceDisplay = (price) => {
    if (!price) return "No price";
    if (price.toLowerCase().includes("contact")) return price;

    const priceValue = extractPriceValue(price);
    if (priceValue === Infinity) return price;

    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(priceValue);
  };

  // ✨ FIX: Check if there are any categories at all
  const categories = Object.keys(groupedVendors);

  if (categories.length === 0) {
    return (
      <div className="price-comparison-section">
        <h3>Price Comparison</h3>
        <p>No vendor prices entered yet. Add prices to compare options.</p>
      </div>
    );
  }

  return (
    <div className="price-comparison-section">
      <h3>Price Comparison</h3>

      {/* ✨ FIX: Iterate over each category */}
      {categories.sort().map((category) => {
        // ✨ FIX: Run the comparison logic *per category*
        const vendorsWithPrices = groupedVendors[category]
          .filter(
            (vendor) =>
              prices[vendor.vendor_id] && prices[vendor.vendor_id] !== ""
          )
          .map((vendor) => ({
            ...vendor,
            price: prices[vendor.vendor_id],
            notes: bookingNotes[vendor.vendor_id] || "",
          }))
          .sort((a, b) => {
            const priceA = extractPriceValue(a.price);
            const priceB = extractPriceValue(b.price);
            return priceA - priceB;
          });

        // ✨ FIX: If this category has no prices, show a message for it
        if (vendorsWithPrices.length === 0) {
          return (
            <div key={category} className="comparison-category-group">
              <h4 className="vendor-category-header">{category}</h4>
              <p>No prices entered for this category.</p>
            </div>
          );
        }

        // ✨ FIX: Render the table for this category
        return (
          <div key={category} className="comparison-category-group">
            <h4 className="vendor-category-header">{category}</h4>
            <div className="comparison-table">
              <div className="comparison-header">
                <span>Vendor</span>
                {/* ✨ FIX: Removed 'Service' column, as it's in the header */}
                <span>Price</span>
                <span>Notes</span>
              </div>
              {vendorsWithPrices.map((vendor, index) => (
                <div
                  key={vendor.vendor_id}
                  className={`comparison-row ${index === 0 ? "best-price" : ""}`}
                >
                  <span className="vendor-name">{vendor.business_name}</span>
                  <span className="price">
                    {formatPriceDisplay(vendor.price)}
                  </span>
                  <span className="notes-preview">
                    {vendor.notes ? (
                      <div title={vendor.notes}>
                        {vendor.notes.length > 50
                          ? `${vendor.notes.substring(0, 50)}...`
                          : vendor.notes}
                      </div>
                    ) : (
                      "No notes"
                    )}
                  </span>
                </div>
              ))}
            </div>
            {vendorsWithPrices.length > 1 && (
              <div className="comparison-summary">
                <p>
                  {/* ✨ FIX: Clarified which category this best value is for */}
                  <strong>Best value ({category}):</strong>{" "}
                  {vendorsWithPrices[0].business_name} -{" "}
                  {formatPriceDisplay(vendorsWithPrices[0].price)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
// =================================================================
// END OF MODIFIED COMPONENTS
// =================================================================

const EventDetails = () => {
  const { id } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const isReadOnly = searchParams.get("readonly") === "true";
  const eventId = id;
  const navigate = useNavigate();
  const location = useLocation();

  const [eventData, setEventData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Handle tab activation from URL, location state, or activeView
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");
    const shouldEdit = urlParams.get("edit") === "true";

    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
      setActiveView(tabFromUrl);

      // If the URL has edit=true and we're on the vendors tab, enable editing
      if (tabFromUrl === "vendors" && shouldEdit) {
        setIsVendorsEditing(true);
      }
    } else if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      setActiveView(location.state.activeTab);
    }
  }, [location]);

  // Keep activeView in sync with activeTab
  useEffect(() => {
    setActiveView(activeTab);
  }, [activeTab]);

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
    venue: "",
    notes: "",
  });

  const [isMainEditing, setIsMainEditing] = useState(false);
  const [isScheduleEditing, setIsScheduleEditing] = useState(false);
  const [isThemeEditing, setIsThemeEditing] = useState(false);
  const [isGuestsEditing, setIsGuestsEditing] = useState(false);
  const [isVendorsEditing, setIsVendorsEditing] = useState(false);
  const [isDocumentsEditing, setIsDocumentsEditing] = useState(false);

  const [allVendors, setAllVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // ✨ MODIFICATION: selectedVendors now stores { vendor, service }
  const [selectedVendors, setSelectedVendors] = useState([]);

  const [documents, setDocuments] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [guests, setGuests] = useState([]);
  const initialGuestsRef = useRef([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [theme, setTheme] = useState({ name: "", colors: [], notes: "" });
  const [viewingVendor, setViewingVendor] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState("");
  const [unsplashPage, setUnsplashPage] = useState(1);
  const [vendorBookingNotes, setVendorBookingNotes] = useState({});
  const [vendorPrices, setVendorPrices] = useState({});
  const [activeView, setActiveView] = useState("overview");

  const API_URL = process.env.REACT_APP_API_URL;
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [vendorRequests, setVendorRequests] = useState([]);

  useEffect(() => {
    if (isReadOnly) {
      setIsMainEditing(false);
      setIsScheduleEditing(false);
      setIsThemeEditing(false);
      setIsGuestsEditing(false);
      setIsVendorsEditing(false);
      setIsDocumentsEditing(false);
    }
  }, [isReadOnly]);

  const handleVendorCardClick = (vendorId) => {
    // Create a return URL that includes the tab parameter
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", "vendors");
    const returnTo = `${window.location.pathname}?${searchParams.toString()}`;

    // Store the current scroll position
    sessionStorage.setItem("vendorListScroll", window.scrollY);

    navigate(`/vendors/${vendorId}/services?readonly=true`, {
      state: {
        from: "event-details",
        eventId: eventId,
        returnTo: returnTo,
        activeTab: "vendors",
        preserveScroll: true,
      },
      replace: false,
    });
  };

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

  const fetchVendors = useCallback(async () => {
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
        setAllVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // ✨ MODIFICATION: Moved fetchVendorRequests to useCallback
  const fetchVendorRequests = useCallback(async () => {
    try {
      if (!eventId) return;

      const response = await fetch(
        `${API_BASE}/api/vendor-requests/event/${eventId}`
      );

      if (response.ok) {
        const requestsData = await response.json();
        // Assuming API returns 'service_requested' in each request object
        setVendorRequests(requestsData || []);
      }
    } catch (error) {
      console.error("Error fetching vendor requests:", error);
    }
  }, [eventId, API_BASE]);

  useEffect(() => {
    fetchVendorRequests();
  }, [fetchVendorRequests]);

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

        const isVendorUser = isReadOnly;
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email,
          role: isVendorUser ? "vendor" : "planner",
        });

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
        // Load schedule from dedicated endpoint
        try {
          const schedResp = await fetch(
            `${API_URL}/api/events/${eventId}/schedule`
          );
          if (schedResp.ok) {
            const schedJson = await schedResp.json();
            setSchedule(
              Array.isArray(schedJson.schedule) ? schedJson.schedule : []
            );
          } else {
            setSchedule(fetchedEventData.schedule || []);
          }
        } catch (_e) {
          setSchedule(fetchedEventData.schedule || []);
        }

        let themeData = fetchedEventData.theme;
        if (typeof themeData === "string") {
          try {
            themeData = JSON.parse(themeData);
          } catch (e) {
            console.error("Error parsing theme string:", e);
            themeData = { name: "", colors: [], notes: "" };
          }
        }

        themeData = cleanThemeObject(themeData);

        const updatedEventData = {
          ...fetchedEventData,
          theme: themeData,
        };

        setEventData(updatedEventData);
        setTheme(themeData || { name: "", colors: [], notes: "" });
        setDocuments(fetchedEventData.documents || []);

        // Note: We no longer initialize selectedVendors from eventData.vendors
        // selectedVendors is *only* for new, unsaved selections.
        // setSelectedVendors(fetchedEventData.vendors || []); // This line is removed.

        const startTime = new Date(fetchedEventData.start_time);
        const year = startTime.getFullYear();
        const month = String(startTime.getMonth() + 1).padStart(2, "0");
        const day = String(startTime.getDate()).padStart(2, "0");
        const hours = String(startTime.getHours()).padStart(2, "0");
        const minutes = String(startTime.getMinutes()).padStart(2, "0");

        setFormData({
          name: fetchedEventData.name || "",
          date: `${year}-${month}-${day}`,
          time: `${hours}:${minutes}`,
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
    // We remove fetchVendorRequests from here as it's in its own useEffect
  }, [eventId, navigate, API_URL, isReadOnly]);

  // ✨ MODIFICATION: handleSelectVendor now accepts a service
  const handleSelectVendor = (vendor, service) => {
    // Check if this specific vendor + service is already selected
    if (
      selectedVendors.some(
        (v) => v.vendor.vendor_id === vendor.vendor_id && v.service === service
      )
    )
      return;

    // Check if this specific vendor + service is already in vendorRequests
    if (
      vendorRequests.some(
        (req) =>
          req.vendor_id === vendor.vendor_id &&
          req.service_requested === service
      )
    )
      return; // Already requested

    setSelectedVendors((prev) => [
      ...prev,
      {
        vendor: vendor,
        service: service,
        request_status: "selected",
      },
    ]);
  };

  // ✨ MODIFICATION: handleRemoveVendor now accepts a service
  const handleRemoveVendor = (vendorToRemove, serviceToRemove) => {
    setSelectedVendors((prev) =>
      prev.filter(
        (v) =>
          !(
            v.vendor.vendor_id === vendorToRemove.vendor_id &&
            v.service === serviceToRemove
          )
      )
    );
  };

  // ✨ MODIFICATION: handleSaveVendors now sends 'service_requested'
  const handleSaveVendors = async () => {
    if (isReadOnly) return;
    if (selectedVendors.length === 0) {
      setIsVendorsEditing(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Send vendor requests for each item in selectedVendors
      const requestPromises = selectedVendors.map(async (selection) => {
        const { vendor, service } = selection;
        try {
          const requestBody = {
            event_id: eventId,
            vendor_id: vendor.vendor_id,
            requester_id: user.id,
            service_requested: service, // <-- ✨ NEW FIELD
          };

          const response = await fetch(`${API_URL}/api/vendor-requests`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          const responseData = await response.json();

          return {
            vendor: `${vendor.business_name} (${service})`,
            success: response.ok,
            status: response.status,
            data: responseData,
          };
        } catch (error) {
          return {
            vendor: `${vendor.business_name} (${service})`,
            success: false,
            error: error.message,
          };
        }
      });

      const results = await Promise.all(requestPromises);
      console.log("All vendor request results:", results);

      const failedRequests = results.filter((result) => !result.success);

      if (failedRequests.length > 0) {
        console.error("Failed vendor requests details:", failedRequests);
        throw new Error(
          `${failedRequests.length} vendor request(s) failed. First error: ${
            failedRequests[0]?.data?.error || failedRequests[0]?.error
          }`
        );
      }

      // ✨ MODIFICATION: Clear selections and re-fetch requests from DB
      await fetchVendorRequests();
      setSelectedVendors([]);
      setIsVendorsEditing(false);
      setModalMessage(
        `Successfully sent ${selectedVendors.length} vendor request(s)!`
      );
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error sending vendor requests:", error);
      setModalMessage(`Failed to send vendor requests: ${error.message}`);
      setShowSuccessModal(true);
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

  const cleanThemeObject = (theme) => {
    if (!theme || typeof theme !== "object") {
      return { name: "", colors: [], notes: "" };
    }

    const hasCorruptedProperties = Object.keys(theme).some(
      (key) => !isNaN(parseInt(key)) && theme[key] !== undefined
    );

    if (hasCorruptedProperties) {
      return {
        name: theme.name || "",
        colors: Array.isArray(theme.colors) ? theme.colors : [],
        notes: theme.notes || "",
      };
    }

    return {
      name: theme.name || "",
      colors: Array.isArray(theme.colors) ? theme.colors : [],
      notes: theme.notes || "",
    };
  };

  const handleSaveMainDetails = async () => {
    if (isReadOnly) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const cleanTheme = cleanThemeObject(theme);

      const startTime = formData.time
        ? `${formData.date}T${formData.time}`
        : `${formData.date}T00:00:00`;

      const mainEventPayload = {
        name: formData.name,
        venue: formData.venue,
        theme: cleanTheme,
        start_time: `${formData.date}T${formData.time || "00:00"}:00`,
      };

      const response = await fetch(`${API_URL}/api/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mainEventPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event");
      }

      const result = await response.json();
      console.log("Save response:", result);

      setIsMainEditing(false);

      setEventData((prev) => ({
        ...prev,
        name: formData.name,
        start_time: startTime,
        venue: formData.venue,
        theme: cleanTheme,
      }));

      setModalMessage("Event details updated successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating event:", error);
      setModalMessage(`Failed to update event: ${error.message}`);
      setShowSuccessModal(true);
    }
  };

  const handleSaveSchedule = async () => {
    if (isReadOnly) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Map UI items to API shape, composing ISO start_time from selected event date + item.time
      const dateForItems =
        formData && formData.date
          ? formData.date
          : eventData?.start_time
          ? new Date(eventData.start_time).toISOString().split("T")[0]
          : null;
      const payload = Array.isArray(schedule)
        ? schedule.map((item, idx) => ({
            activity: item.activity ?? "",
            description: item.description ?? "",
            start_time:
              dateForItems && item.time
                ? `${dateForItems}T${item.time}:00`
                : null,
            end_time: null,
            position: idx,
          }))
        : [];

      const response = await fetch(
        `${API_URL}/api/events/${eventId}/schedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ schedule: payload }),
        }
      );

      if (!response.ok) {
        let serverMessage = "";
        try {
          const errJson = await response.json();
          serverMessage = errJson?.error || JSON.stringify(errJson);
        } catch (_e) {
          try {
            serverMessage = await response.text();
          } catch (__e) {
            serverMessage = "";
          }
        }
        const msg = serverMessage
          ? `Failed to update schedule: ${serverMessage}`
          : "Failed to update schedule";
        throw new Error(msg);
      }

      setIsScheduleEditing(false);
      setModalMessage("Schedule updated successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating schedule:", error);
      setModalMessage(error.message || "Failed to update schedule");
      setShowSuccessModal(true);
    }
  };

  const handleSaveTheme = async () => {
    if (isReadOnly) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const cleanTheme = cleanThemeObject(theme);

      const response = await fetch(`${API_URL}/api/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme: cleanTheme,
        }),
      });

      if (!response.ok) throw new Error("Failed to update theme");

      setIsThemeEditing(false);
      setModalMessage("Theme updated successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating theme:", error);
      setModalMessage(`Failed to update theme: ${error.message}`);
      setShowSuccessModal(true);
    }
  };

  const handleSaveGuests = async () => {
    if (isReadOnly) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await handleGuestUpdates();

      // This loop for vendors seems redundant if handleSaveVendors is the main way
      // I'm leaving it commented out, as handleSaveVendors is the explicit action.
      /*
      for (const vendor of selectedVendors) {
        // ... (this logic is now incorrect as selectedVendors structure changed)
      }
      */

      const guestsResponse = await fetch(`${API_URL}/api/guests/${eventId}`);
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

      setIsGuestsEditing(false);
      setModalMessage("Guests updated successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating guests:", error);
      setModalMessage(`Failed to update guests: ${error.message}`);
      setShowSuccessModal(true);
    }
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

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ✨ FIX: Removed unused 'acceptedVendorsInfo' variable
  // (This logic is handled by filtering vendorRequests directly in the JSX)

  const pendingRequests = vendorRequests.filter(
    (req) => req.status === "pending"
  );

  // ✨ FIX: This variable is now used by the JSX
  const rejectedRequests = vendorRequests.filter(
    (req) => req.status === "rejected"
  );

  const uniqueVendorCategories = Array.from(
    new Set(
      allVendors
        .flatMap((v) =>
          v.service_type
            ? v.service_type.split(",").map((s) => s.trim().toLowerCase())
            : []
        )
        .filter(Boolean)
    )
  ).sort();

  return (
    <div className="event-details">
      {showSuccessModal && (
        <SuccessModal
          message={modalMessage}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="event-header">
        <button 
          onClick={() => navigate(currentUser?.role === 'vendor' ? "/vendor-dashboard" : "/dashboard")} 
          className="back-button"
        >
          <FaArrowLeft /> Back to {currentUser?.role === 'vendor' ? 'Vendor' : 'Planner'} Dashboard
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
          {/* ✨ FIX: Renamed button */}
          <button
            onClick={() => setActiveView("guests")}
            className={`new-button ${activeView === "guests" ? "active" : ""}`}
          >
            Guest List
          </button>
          {/* ✨ FIX: Renamed button */}
          <button
            onClick={() => setActiveView("vendors")}
            className={`new-button ${activeView === "vendors" ? "active" : ""}`}
          >
            Vendor List
          </button>
          {/* ✨ FIX: Renamed button */}
          <button
            onClick={() => setActiveView("documents")}
            className={`new-button ${
              activeView === "documents" ? "active" : ""
            }`}
          >
            Documents
          </button>
        </div>
        <div className="header-actions">
          <button onClick={handleExport} className="export-button">
            <FaUpload /> Export Event Data
          </button>
        </div>
      </div>

      <div className="event-main-details-section">
        <div className="section-header">
          <h2>Event Details</h2>
          {/* ✨ FIX: Edit button is now hidden in read-only mode */}
          {!isReadOnly && (
            <button
              onClick={() =>
                isMainEditing ? handleSaveMainDetails() : setIsMainEditing(true)
              }
              className="edit-button"
            >
              {isMainEditing ? <FaSave /> : <FaEdit />}{" "}
              {isMainEditing ? "Save Details" : "Edit Details"}
            </button>
          )}
        </div>

        <div
          className="event-info-boxes"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.8rem",
            marginTop: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div className="info-box date-box">
            <h4>
              <FaCalendarAlt /> Date
            </h4>
            <p>
              {isMainEditing ? (
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
              {isMainEditing ? (
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
              {isMainEditing ? (
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  placeholder="Venue"
                />
              ) : (
                eventData.venue || "Not specified"
              )}
            </p>
          </div>
          <div className="info-box theme-box">
            <h4>
              <FaStar /> Theme
            </h4>
            <p>{eventData.theme?.name || "Not specified"}</p>
          </div>
        </div>
      </div>

      <div className="event-sections">
        {activeView === "overview" && (
          <>
            <section>
              <EventSchedule
                schedule={schedule}
                onUpdate={setSchedule}
                isEditing={isScheduleEditing}
                onToggleEdit={() =>
                  isScheduleEditing
                    ? handleSaveSchedule()
                    : setIsScheduleEditing(true)
                }
                isReadOnly={isReadOnly}
              />
            </section>
            <section>
              <EventTheme
                theme={theme}
                onUpdate={setTheme}
                isEditing={isThemeEditing}
                onToggleEdit={() =>
                  isThemeEditing ? handleSaveTheme() : setIsThemeEditing(true)
                }
                isReadOnly={isReadOnly}
              />
            </section>
            {/* ✨ FIX: Unsplash section is now hidden in read-only mode */}
            {!isReadOnly && (
              <section>
                <div className="section-header">
                  <h2
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".5rem",
                    }}
                  >
                    <FaSearch /> Event Ideas
                    <span style={{ fontSize: ".8rem", color: "#888" }}>
                      (Photos by{" "}
                      <a
                        href="https://unsplash.com"
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ color: "#888" }}
                      >
                        Unsplash
                      </a>
                      )
                    </span>
                  </h2>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: ".5rem",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="text"
                    value={unsplashQuery}
                    onChange={(e) => setUnsplashQuery(e.target.value)}
                    placeholder="Search inspiration for this event"
                    className="form-input"
                    style={{ flex: 1, minWidth: 220 }}
                  />
                  <button
                    type="button"
                    className="edit-button"
                    onClick={async () => {
                      try {
                        setUnsplashLoading(true);
                        setUnsplashError("");
                        setUnsplashPage(1);
                        const base =
                          theme?.name ||
                          formData?.venue ||
                          formData?.name ||
                          "event";
                        const query = (unsplashQuery || base).toString();
                        const data = await searchUnsplashPhotos(query, 1, 12);
                        setUnsplashResults(data.results || []);
                      } catch (err) {
                        setUnsplashError(err.message || "Search failed");
                      } finally {
                        setUnsplashLoading(false);
                      }
                    }}
                    disabled={unsplashLoading}
                  >
                    {unsplashLoading ? "Searching..." : "Search"}
                  </button>
                </div>
                {unsplashError && (
                  <div
                    className="search-error"
                    style={{ marginTop: ".25rem", color: "#c00" }}
                  >
                    {unsplashError}
                  </div>
                )}
                {unsplashResults && unsplashResults.length > 0 && (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: "10px",
                        marginTop: "0.5rem",
                      }}
                    >
                      {unsplashResults.map((photo) => (
                        <div
                          key={photo.id}
                          style={{
                            position: "relative",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid #eee",
                          }}
                        >
                          <img
                            src={photo.urls?.small}
                            alt={photo.alt_description || "Unsplash photo"}
                            style={{
                              width: "100%",
                              height: "120px",
                              objectFit: "cover",
                              display: "block",
                            }}
                            loading="lazy"
                            onClick={async () => {
                              try {
                                await registerUnsplashDownload(photo.id);
                              } catch (_) {}
                              window.open(
                                photo.links?.html || photo.urls?.regular,
                                "_blank",
                                "noopener"
                              );
                            }}
                          />
                          <div
                            style={{
                              padding: "6px 8px",
                              fontSize: ".75rem",
                              background: "#fafafa",
                              borderTop: "1px solid #eee",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <a
                              href={photo.links?.html}
                              target="_blank"
                              rel="noreferrer noopener"
                              style={{ color: "#555", textDecoration: "none" }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await registerUnsplashDownload(photo.id);
                                } catch (_) {}
                              }}
                              title="View on Unsplash"
                            >
                              {photo.user?.name || "Photographer"}
                            </a>
                            <a
                              href="https://unsplash.com"
                              target="_blank"
                              rel="noreferrer noopener"
                              style={{ color: "#999", textDecoration: "none" }}
                            >
                              Unsplash
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: ".5rem",
                        marginTop: "0.75rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="new-button"
                        onClick={async () => {
                          if (unsplashPage <= 1) return;
                          try {
                            setUnsplashLoading(true);
                            const newPage = unsplashPage - 1;
                            const base =
                              theme?.name ||
                              formData?.venue ||
                              formData?.name ||
                              "event";
                            const query = (unsplashQuery || base).toString();
                            const data = await searchUnsplashPhotos(
                              query,
                              newPage,
                              12
                            );
                            setUnsplashResults(data.results || []);
                            setUnsplashPage(newPage);
                          } catch (err) {
                            setUnsplashError(
                              err.message || "Failed to load page"
                            );
                          } finally {
                            setUnsplashLoading(false);
                          }
                        }}
                        disabled={unsplashLoading || unsplashPage <= 1}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className="new-button"
                        onClick={async () => {
                          try {
                            setUnsplashLoading(true);
                            const newPage = unsplashPage + 1;
                            const base =
                              theme?.name ||
                              formData?.venue ||
                              formData?.name ||
                              "event";
                            const query = (unsplashQuery || base).toString();
                            const data = await searchUnsplashPhotos(
                              query,
                              newPage,
                              12
                            );
                            setUnsplashResults(data.results || []);
                            setUnsplashPage(newPage);
                          } catch (err) {
                            setUnsplashError(
                              err.message || "Failed to load page"
                            );
                          } finally {
                            setUnsplashLoading(false);
                          }
                        }}
                        disabled={unsplashLoading}
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
        {activeView === "guests" && (
          <GuestManagement
            guests={guests}
            onUpdate={setGuests}
            isEditing={isGuestsEditing}
            onToggleEdit={() =>
              isGuestsEditing ? handleSaveGuests() : setIsGuestsEditing(true)
            }
            isReadOnly={isReadOnly}
            eventData={eventData}
            API_URL={API_URL}
            setModalMessage={setModalMessage}
            setShowSuccessModal={setShowSuccessModal}
            plannerName={currentUser?.name}
          />
        )}
        {activeView === "vendors" && (
          <section className="vendors-section">
            <div className="section-header">
              <h2>Vendors</h2>
              {!isReadOnly && (
                <button
                  onClick={() => {
                    if (isVendorsEditing) {
                      // Call the save function when in editing mode
                      handleSaveVendors();
                    } else {
                      // Enter editing mode when not editing
                      setIsVendorsEditing(true);
                    }
                  }}
                  className="edit-button"
                >
                  {isVendorsEditing ? <FaSave /> : <FaPlus />}
                  {isVendorsEditing ? "Save Vendors" : "Add Vendors"}
                </button>
              )}
            </div>

            {viewingVendor ? (
              <ContractManagement
                eventData={eventData}
                currentUser={currentUser}
                vendor={viewingVendor}
                isVendorAccepted={true}
                onBack={() => setViewingVendor(null)}
              />
            ) : (
              <>
                {isVendorsEditing ? (
                  <div className="add-vendors-tool">
                    <div className="vendor-search-container">
                      <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                          type="text"
                          placeholder="Search to add new vendors"
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
                        {uniqueVendorCategories.map((category) => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() +
                              category.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      className="vendor-selection"
                      aria-label="Vendor Selection"
                    >
                      {allVendors
                        .filter((vendor) => {
                          const vendorServices =
                            vendor.service_type
                              .toLowerCase()
                              .split(",")
                              .map((s) => s.trim()) || [];
                          const matchesSearch =
                            !searchTerm ||
                            vendor.business_name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            vendorServices.some((s) =>
                              s.includes(searchTerm.toLowerCase())
                            );
                          const matchesCategory =
                            selectedCategory === "All" ||
                            vendorServices.includes(selectedCategory);
                          return matchesSearch && matchesCategory;
                        })
                        .map((vendor) => {
                          // ✨ MODIFICATION: Get all services
                          const services =
                            vendor.service_type
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean) || [];

                          return (
                            <div
                              key={vendor.vendor_id}
                              className="vendor-card"
                            >
                              <div className="vendor-card-content">
                                <div className="vendor-info">
                                  <h4>{vendor.business_name}</h4>
                                </div>
                                {/* ✨ MODIFICATION: Show services as tags */}
                                <div className="vendor-categories-list">
                                  {services.map((service) => (
                                    <span
                                      key={service}
                                      className="vendor-category-tag"
                                    >
                                      {service}
                                    </span>
                                  ))}
                                </div>
                                <div
                                  className="vendor-description"
                                  style={{ textAlign: "center" }}
                                >
                                  {vendor.description ||
                                    "No description available."}
                                </div>
                              </div>
                              {/* ✨ MODIFICATION: New actions UI */}
                              <div className="vendor-actions">
                                <button
                                  type="button"
                                  className="view-profile-btn"
                                  onClick={() =>
                                    handleVendorCardClick(vendor.vendor_id)
                                  }
                                >
                                  View Profile
                                </button>
                                <div className="vendor-service-buttons">
                                  {services.map((service) => {
                                    const key = `${vendor.vendor_id}-${service}`;

                                    // Find existing request
                                    const request = vendorRequests.find(
                                      (r) =>
                                        r.vendor_id === vendor.vendor_id &&
                                        r.service_requested === service
                                    );
                                    const status = request
                                      ? request.status
                                      : null;

                                    // Find newly selected request
                                    const isSelected = selectedVendors.some(
                                      (s) =>
                                        s.vendor.vendor_id ===
                                          vendor.vendor_id &&
                                        s.service === service
                                    );

                                    return (
                                      <div
                                        key={key}
                                        className="vendor-service-action"
                                      >
                                        {status === "accepted" ? (
                                          <button
                                            disabled
                                            className="add-vendor-btn accepted"
                                          >
                                            <FaCheck /> {service} Accepted
                                          </button>
                                        ) : status === "pending" ? (
                                          <button
                                            disabled
                                            className="add-vendor-btn added"
                                          >
                                            <FaCheck /> {service} Requested
                                          </button>
                                        ) : isSelected ? (
                                          <>
                                            <button
                                              disabled
                                              className="add-vendor-btn added selected"
                                            >
                                              <FaCheck /> {service} Selected
                                            </button>
                                            <button
                                              type="button"
                                              className="undo-request-btn"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveVendor(
                                                  vendor,
                                                  service
                                                );
                                              }}
                                            >
                                              <FaTimes />
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            type="button"
                                            className="add-vendor-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectVendor(
                                                vendor,
                                                service
                                              );
                                            }}
                                          >
                                            <FaPlus /> Select as {service}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* This 'view' mode now correctly reflects the grouped data
                        from the 'vendor-management-tools' section below,
                        but we can show a simpler list of confirmed vendors here.
                    */}
                    {vendorRequests.filter((req) => req.status === "accepted")
                      .length > 0 && (
                      <div className="confirmed-vendors-container">
                        <h4>Confirmed Vendors</h4>
                        <ul className="vendors-list-with-actions">
                          {/* We map over vendorRequests to show the specific service */}
                          {vendorRequests
                            .filter(
                              (req) => req.status === "accepted" && req.vendor
                            )
                            .map((request) => (
                              <li
                                key={request.request_id}
                                className="vendor-list-item"
                              >
                                <div className="vendor-info">
                                  <strong>
                                    {request.vendor.business_name}
                                  </strong>
                                  <span>- {request.service_requested}</span>
                                </div>
                                <div className="vendor-actions">
                                  {currentUser?.role === "planner" ? (
                                    <button
                                      onClick={() =>
                                        setViewingVendor(request.vendor)
                                      }
                                      className="view-contract-btn"
                                    >
                                      View Contract
                                    </button>
                                  ) : (
                                    currentUser?.id ===
                                      request.vendor.vendor_id && (
                                      <button
                                        onClick={() =>
                                          setViewingVendor(request.vendor)
                                        }
                                        className="view-contract-btn"
                                      >
                                        Manage Contract
                                      </button>
                                    )
                                  )}
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {pendingRequests.length > 0 && (
                      <div className="pending-vendors-container">
                        <h4>Pending Vendors</h4>
                        <div className="vendor-requests-list">
                          {pendingRequests.map((request) => (
                            <div
                              key={request.request_id}
                              className="vendor-request-item"
                            >
                              <div className="vendor-request-info">
                                <strong>
                                  {request.vendor?.business_name || "Vendor"}
                                </strong>
                                <div className="vendor-details">
                                  <small>
                                    Service:{" "}
                                    {/* ✨ Show specific requested service */}
                                    {request.service_requested || "Unknown"}
                                  </small>
                                </div>
                              </div>
                              <div className="vendor-request-actions">
                                <span className="status-label pending">
                                  Pending Approval
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ✨ FIX: Added UI for rejected requests */}
                    {rejectedRequests.length > 0 && (
                      <div className="vendor-requests-container">
                        <h4>Other Requests</h4>
                        <div className="vendor-requests-list">
                          {rejectedRequests.map((request) => (
                            <div
                              key={request.request_id}
                              className="vendor-request-item"
                            >
                              <div className="vendor-request-info">
                                <strong>
                                  {request.vendor?.business_name || "Vendor"}
                                </strong>
                                <div className="vendor-details">
                                  <small>
                                    Service:{" "}
                                    {request.service_requested || "Unknown"}
                                  </small>
                                </div>
                              </div>
                              <div className="vendor-request-actions">
                                <span className="status-label rejected">
                                  ✗ Rejected
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {vendorRequests.filter((req) => req.status === "accepted")
                      .length === 0 &&
                      pendingRequests.length === 0 &&
                      rejectedRequests.length === 0 && (
                        <p>
                          No vendors have been added or requested for this
                          event.
                        </p>
                      )}
                  </div>
                )}

                {/* ================================================================= */}
                {/* ✨ MODIFIED SECTION: Hides Booking/Price from ReadOnly Users */}
                {/* ================================================================= */}
                {(!isReadOnly &&
                  (vendorRequests.length > 0 ||
                    selectedVendors.length > 0)) && (
                  <div className="vendor-management-tools">
                    {(() => {
                      // ✨ FIX: 1. Get items from vendorRequests
                      const vendorsFromRequests = vendorRequests
                        .filter(
                          (req) =>
                            req.vendor &&
                            (req.status === "accepted" ||
                              req.status === "pending")
                        )
                        .map((req) => ({
                          ...req.vendor, // Spread vendor data (id, name, etc.)
                          service_type: req.service_requested, // CRITICAL: Override service_type
                          request_status: req.status,
                          // Use request_id as a unique key for this instance
                          instance_key: req.request_id,
                        }));

                      // ✨ FIX: 2. Get items from newly selected vendors
                      const vendorsFromSelections = selectedVendors.map(
                        (sel, idx) => ({
                          ...sel.vendor,
                          service_type: sel.service, // CRITICAL: Use the selected service
                          request_status: "selected",
                          // Create a temporary unique key
                          instance_key: `new-${sel.vendor.vendor_id}-${idx}`,
                        })
                      );

                      // ✨ FIX: 3. Combine them
                      const allRelevantVendors = [
                        ...vendorsFromRequests,
                        ...vendorsFromSelections,
                      ];

                      // ✨ FIX: 4. Group them by the *single* service_type
                      const groupedVendors = allRelevantVendors.reduce(
                        (acc, vendor) => {
                          // 'vendor.service_type' is now a single string like "Photographer"
                          let category =
                            vendor.service_type || "Uncategorized";
                          category =
                            category.charAt(0).toUpperCase() +
                            category.slice(1);

                          if (!acc[category]) {
                            acc[category] = [];
                          }

                          // Now we push the vendor *instance*
                          // This allows the same vendor to appear in multiple categories
                          acc[category].push(vendor);
                          return acc;
                        },
                        {}
                      );

                      return (
                        <>
                          <VendorBookingNotes
                            groupedVendors={groupedVendors} // ✨ FIX: Pass grouped data
                            bookingNotes={vendorBookingNotes}
                            onUpdateNotes={setVendorBookingNotes}
                            prices={vendorPrices}
                            onUpdatePrices={setVendorPrices}
                          />

                          <PriceComparison
                            groupedVendors={groupedVendors} // ✨ FIX: Pass grouped data
                            prices={vendorPrices}
                            bookingNotes={vendorBookingNotes}
                          />
                        </>
                      );
                    })()}
                  </div>
                )}
                {/* ================================================================= */}
                {/* END OF MODIFIED SECTION */}
                {/* ================================================================= */}
              </>
            )}
          </section>
        )}
        {activeView === "documents" && (
          <section className="documents-section">
            <div className="section-header">
              <h2>Documents</h2>
              {/* ✨ FIX: Edit button is now hidden in read-only mode */}
              {!isReadOnly && (
                <button
                  onClick={() => setIsDocumentsEditing(!isDocumentsEditing)}
                  className="edit-button"
                >
                  {isDocumentsEditing ? <FaSave /> : <FaEdit />}{" "}
                  {isDocumentsEditing ? "Save Documents" : "Edit Documents"}
                </button>
              )}
            </div>
            {isDocumentsEditing && (
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
                      {isDocumentsEditing && (
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