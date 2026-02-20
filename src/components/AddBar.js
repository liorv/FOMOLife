import React from 'react';

export default function AddBar({
  type,
  input,
  dueDate,
  onInputChange,
  onDueDateChange,
  onAdd,
}) {
  return (
    <div className="add-bar">
      <input
        value={input}
        onChange={e => onInputChange(e.target.value)}
        placeholder={`Add a new ${type === 'people' ? 'person' : type.slice(0, -1)}`}
        onKeyDown={e => e.key === 'Enter' && onAdd()}
      />
      {type === 'tasks' && (
        <input
          type="date"
          value={dueDate}
          onChange={e => onDueDateChange(e.target.value)}
          className="due-date-input"
          title="Due date"
        />
      )}
      <button onClick={onAdd}>Add</button>
    </div>
  );
}
