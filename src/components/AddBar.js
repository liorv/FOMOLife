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
        placeholder={`Add a new ${type === "people" ? "person" : type.slice(0, -1)}`}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      <button className="add-btn" onClick={onAdd} title="Add">
        <span className="material-icons">add</span>
      </button>
    </div>
  );
}
