import React, { useState, useEffect } from 'react';
import { FaPencilAlt, FaSave, FaEdit, FaTimes } from 'react-icons/fa';

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

const EventTheme = ({ theme, onUpdate, isEditing, onToggleEdit, onSave }) => {
    const [localTheme, setLocalTheme] = useState(theme || { name: '', colors: [], notes: '' });

    useEffect(() => {
        setLocalTheme(theme || { name: '', colors: [], notes: '' });
    }, [theme]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLocalTheme(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleColorToggle = (color) => {
        setLocalTheme(prev => {
            const newColors = prev.colors.includes(color)
                ? prev.colors.filter(c => c !== color)
                : [...prev.colors, color];
            return { ...prev, colors: newColors };
        });
    };

    const handleSave = () => {
        onUpdate(localTheme);
        onSave();
    };

    const handleCancel = () => {
        setLocalTheme(theme || { name: '', colors: [], notes: '' });
        onToggleEdit();
    };

    return (
        <div className="theme-section">
            <div className="section-header">
                <h2><FaPencilAlt /> Theme</h2>
                {!isEditing ? (
                    <button onClick={onToggleEdit} className="edit-component-btn">
                        <FaEdit />
                    </button>
                ) : (
                    <div className="component-actions">
                        <button onClick={handleSave} className="save-component-btn">
                            <FaSave /> Save
                        </button>
                        <button onClick={handleCancel} className="cancel-component-btn">
                            <FaTimes /> Cancel
                        </button>
                    </div>
                )}
            </div>
            {isEditing ? (
                <div className="theme-edit-form">
                    <div className="form-group">
                        <label>Theme Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={localTheme.name}
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
                                    className={`color-swatch ${localTheme.colors.includes(color) ? 'selected' : ''}`}
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
                            value={localTheme.notes}
                            onChange={handleInputChange}
                            placeholder="Add notes on decor, florals, etc."
                            rows="4"
                        ></textarea>
                    </div>
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
                </div>
            )}
        </div>
    );
};

export default EventTheme;