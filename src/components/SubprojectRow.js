import React from "react";
import PropTypes from "prop-types";

export default function SubprojectRow({ 
  sub, 
  onEdit, 
  onNameChange, 
  onDelete, 
  autoEdit = false, 
  onReorder = () => {},
  isDragging = false,
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [draftName, setDraftName] = React.useState(sub.text || "");
  const [editing, setEditing] = React.useState(autoEdit && (!sub.text || sub.text.trim() === ""));
  const menuRef = React.useRef(null);

  // Listen for global menu close events to prevent multiple menus from being open
  React.useEffect(() => {
    function handleCloseAllMenus(event) {
      // Only close this menu if it's different from the one opening
      if (event.detail && event.detail.subprojectId !== sub.id) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("closeAllSubprojectMenus", handleCloseAllMenus);
    return () => document.removeEventListener("closeAllSubprojectMenus", handleCloseAllMenus);
  }, [sub.id]);

  const tasks = sub.tasks || [];
  const count = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const percent = count ? Math.round((doneCount / count) * 100) : 0;
  const hasDescription = sub.description && sub.description.trim() !== "";
  const owners = sub.owners || sub.people || [];

  // helper to render avatar initials
  const renderAvatar = (name) => (
    <div key={name} className="avatar small" title={name}>
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </div>
  );

  const handleDragStart = (e) => {
    try {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/json", JSON.stringify({
          subprojectId: sub.id,
        }));
      }
    } catch (err) {
      // dataTransfer might not be available in test environment
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    try {
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    } catch (err) {
      // dataTransfer might not be available
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    // Safely get data, handling cases where dataTransfer is not properly set up
    let data = "";
    try {
      data = e.dataTransfer?.getData("application/json") || "";
    } catch (err) {
      // dataTransfer might not be available or might throw
      return;
    }
    
    if (!data) return;
    try {
      const { subprojectId } = JSON.parse(data);
      if (subprojectId !== sub.id) {
        onReorder(subprojectId, sub.id);
      }
    } catch (err) {
      // Silently handle parse errors
    }
  };

  return (
    <div 
      className="subproject-row" 
      role="button"
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {/* expand/collapse button */}
      <button
        className="subproject-expand-btn"
        onClick={(e) => {
          e.preventDefault();
          onEdit(sub.id);
        }}
        title="Expand to edit"
      >
        <span className="material-icons">expand_more</span>
      </button>

      {/* icon representing a subproject/folder */}
      <span className="material-icons subproject-icon" aria-hidden="true">
        folder
      </span>

      <span className="subproject-row-title" title={sub.text}>
        {editing ? (
          <input
            className="subproject-row-name-input"
            value={draftName}
            maxLength={100}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (onNameChange && draftName !== sub.text) {
                onNameChange(draftName);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.target.blur();
              }
            }}
            autoFocus
          />
        ) : (
          <div className="subproject-name-container">
            <span
              onClick={() => {
                if (onNameChange) {
                  setEditing(true);
                }
              }}
              style={{ cursor: onNameChange ? "text" : "default" }}
            >
              {sub.text}
            </span>
            {onNameChange && (
              <span
                className="material-icons editable-indicator"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
              >
                edit
              </span>
            )}
          </div>
        )}
      </span>

      {/* Right group: stats, description icon, owners, and menu button */}
      <div className="subproject-right-group">
        <span
          className="subproject-row-stats"
          title={`${count} tasks, ${percent}% complete`}
        >
          <span className="material-icons stats-icon" aria-hidden="true">
            assignment
          </span>
          {count} <span className="task-label">task{count !== 1 ? "s" : ""}</span> <span className="stat-percent">({percent}%)</span>
        </span>
        {hasDescription && (
          <span className="material-icons desc-icon" title="Has description">
            description
          </span>
        )}
        {owners.length > 0 && (
          <div className="owners">
            {owners.slice(0, 2).map((o) => renderAvatar(o.name))}
            {owners.length > 2 && (
              <div className="people-count">+{owners.length - 2}</div>
            )}
          </div>
        )}
        {/* hamburger menu on far right */}
        <button
          className="menu-button"
          title="More options"
          ref={menuRef}
          onClick={() => {
            // Dispatch event to close all other menus
            const event = new CustomEvent("closeAllSubprojectMenus", {
              detail: { subprojectId: sub.id },
            });
            document.dispatchEvent(event);
            setMenuOpen((o) => !o);
          }}
        >
          <span className="material-icons">more_vert</span>
        </button>
      </div>
      {menuOpen && (
        <div className="subproject-row-menu" ref={menuRef}>
          <button
            className="menu-item edit-item"
            onClick={() => {
              setMenuOpen(false);
              onEdit(sub.id);
            }}
          >
            <span className="material-icons menu-icon">edit</span> Edit
          </button>
          {onDelete && (
            <button
              className="menu-item delete-item"
              onClick={() => {
                setMenuOpen(false);
                onDelete(sub.id);
              }}
            >
              <span className="material-icons menu-icon">delete</span> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

SubprojectRow.propTypes = {
  sub: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string,
    tasks: PropTypes.array,
    description: PropTypes.string,
    owners: PropTypes.array,
    people: PropTypes.array,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onNameChange: PropTypes.func,
  onDelete: PropTypes.func,
  autoEdit: PropTypes.bool,
  onReorder: PropTypes.func,
  isDragging: PropTypes.bool,
};
