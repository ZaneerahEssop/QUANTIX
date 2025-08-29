// EventSchedule.jsx
import React, { useState } from 'react';
import { FaPlus, FaSave, FaTrash, FaEdit } from 'react-icons/fa';

const EventSchedule = ({ schedule, onUpdate, isEditing }) => {
  const [editableSchedule, setEditableSchedule] = useState(schedule || []);

  const handleAddItem = () => {
    setEditableSchedule([...editableSchedule, { time: '', activity: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newSchedule = editableSchedule.filter((_, i) => i !== index);
    setEditableSchedule(newSchedule);
    onUpdate(newSchedule);
  };

  const handleItemChange = (index, field, value) => {
    const newSchedule = [...editableSchedule];
    newSchedule[index][field] = value;
    setEditableSchedule(newSchedule);
  };

  const handleSave = () => {
    onUpdate(editableSchedule);
  };

  return (
    <div className="schedule-section">
      <h2>Schedule</h2>
      {isEditing ? (
        <>
          {editableSchedule.map((item, index) => (
            <div key={index} className="schedule-item editable">
              <input
                type="time"
                value={item.time}
                onChange={(e) => handleItemChange(index, 'time', e.target.value)}
              />
              <input
                type="text"
                value={item.activity}
                onChange={(e) => handleItemChange(index, 'activity', e.target.value)}
                placeholder="Activity"
              />
              <button onClick={() => handleRemoveItem(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          ))}
          <button onClick={handleAddItem} className="add-btn">
            <FaPlus /> Add Activity
          </button>
          <button onClick={handleSave} className="save-schedule-btn">
            <FaSave /> Save Schedule
          </button>
        </>
      ) : (
        <div className="schedule-list">
          {schedule.length > 0 ? (
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

export default EventSchedule;