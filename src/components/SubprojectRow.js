import React from "react";
import PropTypes from "prop-types";

export default function SubprojectRow({ sub, onEdit, onNameChange }) {
  const [editing, setEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState(sub.text || "");
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
      <button
        className="edit"
        title="Edit subproject"
        onClick={() => onEdit(sub.id)}
      >
        <span className="material-icons">edit</span>
      </button>
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
  // deletion is handled via the editor, not row
  onNameChange: PropTypes.func,
};
