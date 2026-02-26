import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { PROJECT_COLORS } from "./ProjectTile";

export default function SubprojectRow({ 
  sub, 
  project,
  onEdit, 
  onNameChange, 
  onDelete,
  onColorChange,
  onDragOverSubprojectTile,
  onDragLeaveSubprojectTile,
  onDropOnSubprojectTile,
  isDragOverSubprojectTile = false,
  autoEdit = false, 
  isDragging = false,
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [menuFlippedVertically, setMenuFlippedVertically] = React.useState(false);
  const [dropdownStyle, setDropdownStyle] = React.useState({});
  const menuRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const colorPickerRef = React.useRef(null);

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

  // Determine the color for the folder icon or project-level background
  const subprojectColor = sub.color || (sub.isProjectLevel ? project?.color : undefined);

  // Helper to render avatar initials
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

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideMenu =
        (menuRef.current && menuRef.current.contains(event.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target)) ||
        (colorPickerRef.current && colorPickerRef.current.contains(event.target));
      if (!clickedInsideMenu) {
        setMenuOpen(false);
        setShowColorPicker(false);
      }
    }

    if (menuOpen || showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen, showColorPicker]);

  // Close modal when clicking overlay (mobile)
  // Removed document listener - using React onClick instead for better event handling

  // Position the dropdown in a fixed portal and update on resize/scroll
  React.useLayoutEffect(() => {
    if (!menuOpen) return;

    const updatePosition = () => {
      if (!menuRef.current || !dropdownRef.current) return;
      const buttonRect = menuRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const threshold = viewportWidth < 768 ? 20 : 10;

      const isBottomCutOff = buttonRect.bottom + dropdownRect.height > viewportHeight - threshold;
      setMenuFlippedVertically(isBottomCutOff);

      const top = isBottomCutOff
        ? buttonRect.top - dropdownRect.height - 4
        : buttonRect.bottom + 4;

      // Calculate the left position
      // Start with left-aligned to button
      let left = buttonRect.left;

      // Check if dropdown would overflow right side of viewport
      if (left + dropdownRect.width > viewportWidth - threshold) {
        // Right-align the dropdown with the button instead
        left = buttonRect.right - dropdownRect.width;
      }

      // Ensure the dropdown doesn't go off the left edge either
      left = Math.max(threshold, left);

      setDropdownStyle({ top: `${top}px`, left: `${left}px` });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);


  return (
    <div 
      className="subproject-row" 
      role="button"
      onClick={() => onEdit(sub.id)}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragOverSubprojectTile ? 'rgba(0, 0, 0, 0.02)' : (sub.color ? `${sub.color}15` : 'white'),
        borderLeft: isDragOverSubprojectTile ? '3px solid #1a73e8' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (onDragOverSubprojectTile) onDragOverSubprojectTile();
      }}
      onDragLeave={() => {
        if (onDragLeaveSubprojectTile) onDragLeaveSubprojectTile();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (onDropOnSubprojectTile) onDropOnSubprojectTile(e);
      }}
    >
      {/* expand/collapse button */}
      <button
        className="subproject-expand-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit(sub.id);
        }}
        title="Expand to edit"
      >
        <span className="material-icons">expand_more</span>
      </button>

      {/* icon representing a subproject/folder or project-level tasks */}
      <span 
        className="material-icons subproject-icon" 
        aria-hidden="true"
        style={subprojectColor ? { color: subprojectColor } : {}}
      >
        {sub.isProjectLevel ? "assignment_turned_in" : "folder"}
      </span>

      <span className="subproject-row-title" title={sub.isProjectLevel ? "Tasks" : sub.text} style={subprojectColor ? { color: subprojectColor } : {}}>
        <span>{sub.isProjectLevel ? "Tasks" : (sub.text || "Untitled")}</span>
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
      </div>

      {/* hamburger menu on far right — outside of right-group so it's not constrained by its z-index */}
      {!sub.isProjectLevel && (
        <div className="project-menu" ref={menuRef} style={menuOpen || showColorPicker ? { zIndex: 10000 } : {}}>
          <button
            className="menu-button"
            title="More options"
            onClick={(e) => {
              e.stopPropagation();
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
          {menuOpen && (
            ReactDOM.createPortal(
              <div
                className="project-menu-dropdown"
                ref={dropdownRef}
                onClick={(e) => e.stopPropagation()}
                data-flipped-v={menuFlippedVertically ? "true" : "false"}
                style={{
                  position: "fixed",
                  ...dropdownStyle,
                  right: "auto",
                  zIndex: 1001,
                }}
              >
              {!sub.isProjectLevel && onColorChange && (
                <button
                  className="menu-item color-menu-item"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title="Change color"
                >
                  <span className="material-icons">palette</span>
                  <span>Color</span>
                  <span className="menu-arrow">›</span>
                </button>
              )}

              <div className="menu-divider" />

              {!sub.isProjectLevel && (
                <button
                  className="menu-item edit-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(sub.id);
                  }}
                  title="Edit subproject"
                >
                  <span className="material-icons">edit</span>
                  <span>Edit</span>
                </button>
              )}
              {onDelete && !sub.isProjectLevel && (
                <button
                  className="menu-item delete-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(sub.id);
                  }}
                  title="Delete subproject"
                >
                  <span className="material-icons">delete</span>
                  <span>Delete</span>
                </button>
              )}
            </div>,
            document.body
          )
        )}
        </div>
      )}

      {/* Color picker modal - rendered at document root to avoid scroll clipping */}
      {showColorPicker && !sub.isProjectLevel && onColorChange && ReactDOM.createPortal(
        <div 
          className="color-picker-modal-overlay"
          onClick={(e) => {
            e.stopPropagation();
            // Only close if clicking directly on the overlay background
            if (e.target === e.currentTarget) {
              setShowColorPicker(false);
            }
          }}
        >
          <div 
            className="color-picker-modal"
            ref={colorPickerRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="color-picker-modal-header">
              <h3>Choose Color</h3>
              <button
                className="color-picker-modal-close"
                onClick={() => setShowColorPicker(false)}
                aria-label="Close color picker"
                type="button"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="color-picker-grid">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-option ${c === sub.color ? "selected" : ""}`}
                  style={{ backgroundColor: c }}
                  title={`Set color to ${c}`}
                  type="button"
                  onClick={() => {
                    onColorChange(sub.id, c);
                    setShowColorPicker(false);
                    setMenuOpen(false);
                  }}
                  aria-label={`Color ${c}`}
                >
                  {c === sub.color && (
                    <span className="material-icons">check</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
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
    color: PropTypes.string,
    isProjectLevel: PropTypes.bool,
  }).isRequired,
  project: PropTypes.shape({
    id: PropTypes.string,
    color: PropTypes.string,
  }),
  onEdit: PropTypes.func.isRequired,
  onNameChange: PropTypes.func,
  onDelete: PropTypes.func,
  onColorChange: PropTypes.func,
  onDragOverSubprojectTile: PropTypes.func,
  onDragLeaveSubprojectTile: PropTypes.func,
  onDropOnSubprojectTile: PropTypes.func,
  isDragOverSubprojectTile: PropTypes.bool,
  autoEdit: PropTypes.bool,
  isDragging: PropTypes.bool,
};
