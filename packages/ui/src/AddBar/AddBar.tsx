/**
 * AddBar - Shared add input component
 * 
 * A reusable input component for adding new items (tasks, people, etc.).
 * Used across tasks and projects apps.
 */

import React from 'react';

export interface AddBarProps {
  /** Type of item being added (used for placeholder text) */
  type?: 'tasks' | 'people' | string;
  /** Current input value */
  input: string;
  /** Callback when input value changes */
  onInputChange: (value: string) => void;
  /** Callback when add button/enter is pressed */
  onAdd: () => void;
  /** Optional due date (currently not used but accepted for future) */
  dueDate?: string | null;
  /** Callback when due date changes */
  onDueDateChange?: (date: string) => void;
  /** Optional inline style to apply to wrapper when focused */
  focusStyle?: React.CSSProperties;
  /** Optional additional class to apply to wrapper when focused */
  focusClassName?: string;
}

export default function AddBar({
  type,
  input,
  onInputChange,
  onAdd,
  focusStyle,
  focusClassName,
}: AddBarProps) {
  const [focused, setFocused] = React.useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onAdd();
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'people':
        return 'Add a new person (press Enter)';
      case 'tasks':
        return 'Add a new task (press Enter)';
      default:
        return `Add a new ${type || 'item'} (press Enter)`;
    }
  };

  return (
    <div
      className={`add-bar${focused ? ' focused' : ''}${focused && focusClassName ? ' ' + focusClassName : ''}`}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={focused ? focusStyle : undefined}
    >
      <input
        id={`add-${type || 'item'}-input`}
        name={`add-${type || 'item'}`}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={getPlaceholder()}
        onKeyDown={handleKeyDown}
      />
      {/* add button removed to simplify UI; tasks are added via Enter */}
    </div>
  );
}
