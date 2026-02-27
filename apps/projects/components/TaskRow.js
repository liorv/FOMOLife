import React, { useState, useEffect } from "react";

/**
 * A single task row.  Columns (left → right):
 *   expand toggle | checkbox | title | date | people avatars | star | delete
 */
export default function TaskRow({
  item,
  id,
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,
  handleStar,
  handleDelete,
  onTitleChange,
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
  // Compute days until due date.
  // Parse the date string as LOCAL midnight (not UTC) so that "2026-02-26"
  // means Feb 26 at 00:00 in the user's timezone, matching filter logic.
  let isPast = false;
  let daysLeft = null;
  if (item.dueDate) {
    const [y, m, d] = item.dueDate.split("-").map(Number);
    const due = new Date(y, m - 1, d); // local midnight of due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);        // local midnight of today
    const msPerDay = 24 * 60 * 60 * 1000;
    daysLeft = Math.round((due - today) / msPerDay);
    isPast = daysLeft < 0; // strictly before today
  }

  return (
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
      {/* Left group: expand, checkbox, title */}
      <div className="left-group">
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

      {/* Title */}
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

      {/* Right group: date, avatars, star, delete */}
      <div className="right-group">
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
