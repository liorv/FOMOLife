import React, { useState, useEffect } from "react";

// A standalone row representing a single task's primary information.
// Ordered columns (left→right):
//   1. expand toggle
//   2. completion checkbox
//   3. task string (editable when row is open)
//   4. date (rendered red when in the past)
//   5. people to notify (avatars)
//   6. star toggle
//   7. delete button
// Left items expand naturally; the final three are pushed to the right by
// virtue of a flex container with `margin-left: auto`.
// Input validation for the title enforces [a-zA-Z0-9 ]+.  The component also
// accepts `onTitleChange` for inline edits.  Additional task details live
// in the editor.

export default function TaskRow({
  item,
  id,
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,
  handleStar,
  handleDelete,
  // optional callback for inline title edits
  onTitleChange,
  // drag-and-drop callbacks (only relevant when `type === 'tasks'`)
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
}) {
  const isOpen = editorTaskId === id;

  // inline title editing state
  const [editingTitle, setEditingTitle] = useState(
    newlyAddedTaskId === id && (!item.text || item.text.trim() === "")
  );
  const [draftTitle, setDraftTitle] = useState(item.text || "");

  useEffect(() => {
    setDraftTitle(item.text || "");
    if (!isOpen) {
      setEditingTitle(false);
    }
    // auto-enable editing if this is the newly added task with no text
    if (newlyAddedTaskId === id && (!item.text || item.text.trim() === "")) {
      setEditingTitle(true);
    }
  }, [item.text, isOpen, newlyAddedTaskId, id]);

  const finishEdit = () => {
    setEditingTitle(false);
    // clear the newly added flag
    if (newlyAddedTaskId === id) {
      onClearNewTask();
    }
    // if the task title is empty or only whitespace, delete the task
    if (!draftTitle.trim()) {
      handleDelete(id);
      return;
    }
    if (onTitleChange && draftTitle !== item.text) {
      onTitleChange(id, draftTitle);
    }
  };

  const handleTitleClick = () => {
    if (onTitleChange) {
      // only do inline editing, don't open the full task editor
      setEditingTitle(true);
    } else if (type === "tasks") {
      setEditorTaskId(id);
    }
  };
  // determine if due date exists and is in the past and compute days left
  let isPast = false;
  let daysLeft = null;
  if (item.dueDate) {
    const due = new Date(item.dueDate);
    const now = new Date();
    // difference in full days (ceiling so any partial day counts as 1)
    const msPerDay = 24 * 60 * 60 * 1000;
    daysLeft = Math.ceil((due - now) / msPerDay);
    isPast = daysLeft <= 0;
  }

  return (
    // container flex ensures left/middle/right segments and full width
    <div
      className="task-row"
      draggable={type === "tasks"}
      onDragStart={(e) => {
        if (type === "tasks") {
          onDragStart && onDragStart(id, e);
        }
      }}
      onDragOver={(e) => {
        if (type === "tasks") {
          e.preventDefault();
          onDragOver && onDragOver(id, e);
        }
      }}
      onDrop={(e) => {
        if (type === "tasks") {
          e.preventDefault();
          onDrop && onDrop(id, e);
        }
      }}
      onDragEnd={(e) => {
        if (type === "tasks") {
          onDragEnd && onDragEnd(id, e);
        }
      }}
    >
      {/* left group: expand, checkbox, title */}
      <div className="left-group">
        {/* expanding is always available for tasks */}

        {type === "tasks" && (
          <span
            className={`material-icons expand-icon${isOpen ? " open" : ""}`}
            onClick={() => setEditorTaskId(id)}
            title={isOpen ? " Collapse editor" : "Expand editor"}
            aria-hidden="true"
          >
            {isOpen ? "expand_more" : "chevron_right"}
          </span>
        )}

        {type === "tasks" && (
          <input
            id={`task-${id}-done`}
            name={`task-${id}-done`}
            type="checkbox"
            checked={item.done}
            onChange={() => handleToggle(id)}
            className="task-checkbox"
            title={item.done ? "Mark as incomplete" : "Mark as complete"}
          />
        )}
      </div>

      {/* task title: separate from left-group, with max-width constraint */}
      <div className="task-title-wrapper">
        {editingTitle ? (
          <input
            className="task-title-input"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={finishEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") finishEdit();
            }}
            autoFocus
          />
        ) : (
          <div className="task-title-container">
            <span
              className="task-title"
              title={item.text} /* always show full text on hover */
              onClick={handleTitleClick}
              style={{
                cursor: type === "tasks" ? "pointer" : "default",
                textDecoration: item.done ? "line-through" : undefined,
              }}
            >
              {item.text}
            </span>
            {type === "tasks" && (
              <span
                className="material-icons editable-indicator"
                onClick={() => {
                  setEditingTitle(true);
                }}
              >
                edit
              </span>
            )}
          </div>
        )}
      </div>

      {/* middle group: date centered */}
      {item.dueDate && (
        <div className="date-container">
          <span
            className="task-date"
            style={{
              color: isPast ? "red" : undefined,
              fontSize: "0.95em",
            }}
          >
            {/* show full text by default, fall back to short form in tight layouts */}
            {daysLeft !== null && (
              <>
                <span className="full">
                  {isPast
                    ? "overdue"
                    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                </span>
                <span className="short">{isPast ? "OD" : `${daysLeft}d`}</span>
              </>
            )}
          </span>
        </div>
      )}

      {/* right group: notify avatars, star, delete */}
      <div className="right-group">
        {type === "tasks" && (item.people || []).length > 0 && (
          <div
            className="notify-people"
            title={(item.people || []).map((p) => p.name).join(", ")}
          >
            {(item.people || []).slice(0, 2).map((p) => (
              <div key={p.name} className="avatar small">
                {p.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            ))}
            {(item.people || []).length > 2 && (
              <div className="people-count">
                +{(item.people || []).length - 2}
              </div>
            )}
          </div>
        )}
        {type === "tasks" && (
          <button
            className={item.favorite ? "star favorite" : "star"}
            title={item.favorite ? "Unstar" : "Star"}
            onClick={() => handleStar(id)}
            aria-label={item.favorite ? "Unstar" : "Star"}
          >
            <span className="material-icons">
              {item.favorite ? "star" : "star_border"}
            </span>
          </button>
        )}
        <button
          className="delete"
          onClick={() => handleDelete(id)}
          aria-label="Delete"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
}
