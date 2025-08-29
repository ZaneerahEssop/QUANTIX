// EventTheme.jsx
import React, { useState, useEffect } from 'react';
import { FaPalette, FaPencilAlt, FaStickyNote,FaSave } from 'react-icons/fa';
//import { useParams, useNavigate } from 'react-router-dom';

const predefinedColors = [
    '#E5ACBF', // Blush
    '#F6A28C', // Coral
    '#E8B180', // Peach
    '#E2C5AE', // Cream
    '#EF6AB3', // Azalea
    '#007bff', // Blue
    '#28a745', // Green
    '#dc3545', // Red
    '#6c757d'  // Gray
];

const EventTheme = ({ theme, onUpdate, isEditing }) => {
    const [editableTheme, setEditableTheme] = useState(theme || { name: '', colors: [], notes: '' });

    useEffect(() => {
        setEditableTheme(theme || { name: '', colors: [], notes: '' });
    }, [theme]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditableTheme(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleColorToggle = (color) => {
        setEditableTheme(prev => {
            const newColors = prev.colors.includes(color)
                ? prev.colors.filter(c => c !== color)
                : [...prev.colors, color];
            return { ...prev, colors: newColors };
        });
    };

    const handleSave = () => {
        onUpdate(editableTheme);
    };

    return (
        <div className="theme-section">
            <h2><FaPencilAlt /> Theme</h2>
            {isEditing ? (
                <div className="theme-edit-form">
                    <div className="form-group">
                        <label>Theme Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={editableTheme.name}
                            onChange={handleInputChange}
                            placeholder="e.g., Rustic Elegance"
                        />
                    </div>
                    <div className="form-group">
                        <label>Select Colors:</label>
                        <div className="color-palette">
                            {predefinedColors.map((color) => (
                                <div
                                    key={color}
                                    className={`color-swatch ${editableTheme.colors.includes(color) ? 'selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorToggle(color)}
                                ></div>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Notes:</label>
                        <textarea
                            name="notes"
                            value={editableTheme.notes}
                            onChange={handleInputChange}
                            placeholder="Add notes on decor, florals, etc."
                            rows="4"
                        ></textarea>
                    </div>
                    <button onClick={handleSave} className="save-theme-btn">
                        <FaSave /> Save Theme
                    </button>
                </div>
            ) : (
                <div className="theme-display">
                    <div className="theme-detail">
                        <span className="detail-label">Theme Name:</span>
                        <p>{theme?.name || 'Not specified'}</p>
                    </div>
                    <div className="theme-detail">
                        <span className="detail-label">Color Palette:</span>
                        <div className="theme-colors">
                            {theme?.colors?.length > 0 ? (
                                theme.colors.map((color, index) => (
                                    <div
                                        key={index}
                                        className="color-swatch display"
                                        style={{ backgroundColor: color }}
                                    ></div>
                                ))
                            ) : (
                                <p>No colors selected</p>
                            )}
                        </div>
                    </div>
                    <div className="theme-detail notes-display">
                        <span className="detail-label">Notes:</span>
                        <p>{theme?.notes || 'No notes added'}</p>
                    </div>
                    <button onClick={() => onUpdate(editableTheme)} className="edit-theme-button">Edit theme</button>
                </div>
            )}
        </div>
    );
};

export default EventTheme;