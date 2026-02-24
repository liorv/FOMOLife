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
  const [draftName, setDraftName] = React.useState(sub.text || "");
  const [editing, setEditing] = React.useState(autoEdit && (!sub.text || sub.text.trim() === ""));
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [menuFlippedVertically, setMenuFlippedVertically] = React.useState(false);
  const [colorPickerFlipped, setColorPickerFlipped] = React.useState(false);
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
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
        setShowColorPicker(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Close modal when clicking overlay (mobile)
  React.useEffect(() => {
    function handleOverlayClick(event) {
      if (event.target.classList.contains("color-picker-modal-overlay")) {
        setShowColorPicker(false);
      }
    }

    if (showColorPicker && window.innerWidth < 768) {
      document.addEventListener("mousedown", handleOverlayClick);
      return () => document.removeEventListener("mousedown", handleOverlayClick);
    }
  }, [showColorPicker]);

  // Detect viewport boundaries and adjust menu positioning
  React.useEffect(() => {
    if (!menuOpen || !dropdownRef.current) return;

    const adjustMenuPosition = () => {
      const dropdown = dropdownRef.current;
      if (!dropdown) return;

      const rect = dropdown.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const threshold = viewportWidth < 768 ? 20 : 10;

      const isBottomCutOff = rect.bottom > viewportHeight - threshold;
      setMenuFlippedVertically(isBottomCutOff);

      if (colorPickerRef.current) {
        const colorPickerRect = colorPickerRef.current.getBoundingClientRect();
        const isRightCutOff = colorPickerRect.right > viewportWidth - threshold;
        const isLeftCutOff = colorPickerRect.left < threshold;
        setColorPickerFlipped(isRightCutOff && !isLeftCutOff);
      }
    };

    adjustMenuPosition();
    window.addEventListener("resize", adjustMenuPosition);
    const raf1 = requestAnimationFrame(adjustMenuPosition);
    const raf2 = requestAnimationFrame(() => {
      setTimeout(adjustMenuPosition, 50);
    });

    return () => {
      window.removeEventListener("resize", adjustMenuPosition);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [menuOpen]);

  // Additional effect to adjust color picker when it opens
  React.useEffect(() => {
    if (!showColorPicker || !colorPickerRef.current) return;

    const checkColorPickerPosition = () => {
      const colorPicker = colorPickerRef.current;
      if (!colorPicker) return;

      const rect = colorPicker.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const threshold = viewportWidth < 768 ? 20 : 10;

      const isRightCutOff = rect.right > viewportWidth - threshold;
      const isLeftCutOff = rect.left < threshold;
      setColorPickerFlipped(isRightCutOff && !isLeftCutOff);
    };

    checkColorPickerPosition();
    const raf1 = requestAnimationFrame(checkColorPickerPosition);
    const raf2 = requestAnimationFrame(() => {
      setTimeout(checkColorPickerPosition, 50);
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [showColorPicker]);


  return (
    <div 
      className="subproject-row" 
      role="button"
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragOverSubprojectTile ? 'rgba(0, 0, 0, 0.02)' : (sub.color ? `${sub.color}15` : 'white'),
        borderLeft: isDragOverSubprojectTile ? '3px solid #1a73e8' : 'none',
        transition: 'all 0.2s ease',
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

      <span className="subproject-row-title" title={sub.text} style={subprojectColor ? { color: subprojectColor } : {}}>
        {editing && !sub.isProjectLevel ? (
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
                if (onNameChange && !sub.isProjectLevel) {
                  setEditing(true);
                }
              }}
              style={{ cursor: onNameChange && !sub.isProjectLevel ? "text" : "default" }}
            >
              {sub.text}
            </span>
            {onNameChange && !sub.isProjectLevel && (
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
        <div className="project-menu" ref={menuRef}>
          <button
            className="menu-button"
            title="More options"
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
          {menuOpen && (
            <div
              className="project-menu-dropdown"
              ref={dropdownRef}
              data-flipped-v={menuFlippedVertically ? "true" : "false"}
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

              {/* On desktop, show color picker as submenu; on mobile it's a modal */}
              {showColorPicker && !sub.isProjectLevel && onColorChange && window.innerWidth >= 768 && (
                <div
                  className="color-picker-submenu"
                  ref={colorPickerRef}
                  data-flipped={colorPickerFlipped ? "true" : "false"}
                >
                  <div className="color-picker-grid">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`color-option ${c === sub.color ? "selected" : ""}`}
                        style={{ backgroundColor: c }}
                        title={`Set color to ${c}`}
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
            </div>
          )}
        </div>
      </div>

      {/* Mobile color picker modal - rendered at document root to avoid scroll clipping */}
      {showColorPicker && !sub.isProjectLevel && onColorChange && window.innerWidth < 768 && ReactDOM.createPortal(
        <div className="color-picker-modal-overlay">
          <div className="color-picker-modal">
            <div className="color-picker-modal-header">
              <h3>Choose Color</h3>
              <button
                className="color-picker-modal-close"
                onClick={() => setShowColorPicker(false)}
                aria-label="Close color picker"
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
