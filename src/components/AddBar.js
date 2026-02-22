import React from 'react';

export default function AddBar({
  type,
  input,
  dueDate,
  onInputChange,
  onDueDateChange,
  onAdd,
}) {
  // overlay state to show full‑screen calendar
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const openDatePicker = () => {
    // instead of invoking native picker directly, show overlay
    setCalendarOpen(true);
  };

  const closeCalendar = () => {
    setCalendarOpen(false);
  };

  const handleOverlayChange = e => {
    onDueDateChange(e.target.value);
    closeCalendar();
  };

  return (
    <div className="add-bar">
      <input
        value={input}
        onChange={e => onInputChange(e.target.value)}
        placeholder={`Add a new ${type === 'people' ? 'person' : type.slice(0, -1)}`}
        onKeyDown={e => e.key === 'Enter' && onAdd()}
      />
      {type === 'tasks' && (
        <>
          <input
            id="addbar-date"
            type="date"
            value={dueDate}
            onChange={e => onDueDateChange(e.target.value)}
            className="due-date-input hidden"
          />
          <button type="button" className="calendar-button" onClick={openDatePicker} title="Select due date">
            <span className="material-icons">calendar_today</span>
          </button>

          {calendarOpen && (
            <div className="calendar-overlay" onClick={closeCalendar}>
              <input
                type="date"
                value={dueDate}
                onChange={handleOverlayChange}
                className="fullscreen-date-input"
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
        </>
      )}
      <button onClick={onAdd}>Add</button>
    </div>
  );
}
