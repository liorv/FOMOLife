import React from 'react';

export default function AddBar({
  type,
  input,
  dueDate,
  onInputChange,
  onDueDateChange,
  onAdd,
}) {
  // clicking the calendar icon will focus (or showPicker) the hidden date input
  const openDatePicker = () => {
    const el = document.getElementById('addbar-date');
    if (el) {
      if (el.showPicker) el.showPicker();
      else el.focus();
    }
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
        </>
      )}
      <button onClick={onAdd}>Add</button>
    </div>
  );
}
