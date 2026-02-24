import React from "react";
import PropTypes from "prop-types";

export default function SubprojectRow({ sub, onEdit, onNameChange, onDelete, autoEdit = false }) {
  const [editing, setEditing] = React.useState(autoEdit && (!sub.text || sub.text.trim() === ""));
  const [draftName, setDraftName] = React.useState(sub.text || "");
  const [menuOpen, setMenuOpen] = React.useState(false);
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

  return (
    <div className="subproject-row" role="button">
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
      <span
        className="subproject-row-stats"
        title={`${count} tasks, ${percent}% complete`}
      >
        <span className="material-icons stats-icon" aria-hidden="true">
          assignment
        </span>
        {count} task{count !== 1 ? "s" : ""} ({percent}%)
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
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="material-icons">more_vert</span>
      </button>
      {menuOpen && (
        <div className="subproject-row-menu">
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
};
