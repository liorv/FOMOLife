import React from "react";

export interface AddBarProps {
  type?: "tasks" | "people" | string;
  input: string;
  dueDate?: string | null;
  onInputChange: (value: string) => void;
  onDueDateChange?: (date: string) => void;
  onAdd: () => void;
}

export default function AddBar({
  type,
  input,
  onInputChange,
  onAdd,
}: AddBarProps) {
  // calendar functionality removed; dueDate prop still accepted but not used

  return (
    <div className="add-bar">
      <input
        id={`add-${type || "item"}-input`}
        name={`add-${type || "item"}`}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={
          type === "people"
            ? "Add a new person (press Enter)"
            : type === "tasks"
            ? "Add a new task (press Enter)"
            : `Add a new ${type} (press Enter)`
        }
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      {/* add button removed to simplify UI; tasks are added via Enter */}
    </div>
  );
}
