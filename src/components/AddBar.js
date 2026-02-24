import React from "react";

export default function AddBar({
  type,
  input,
  dueDate,
  onInputChange,
  onDueDateChange,
  onAdd,
}) {
  // calendar functionality removed; dueDate prop still accepted but not used

  return (
    <div className="add-bar">
      <input
        id={`add-${type || "item"}-input`}
        name={`add-${type || "item"}`}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={type === "people" ? "Add a new person" : type === "tasks" ? "Add a new task" : `Add a new ${type}`}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      <button className="add-btn" onClick={onAdd} title="Add">
        <span className="material-icons">add</span>
      </button>
    </div>
  );
}
