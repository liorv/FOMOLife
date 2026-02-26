import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";

// a simple hash function to convert a string into an index for a color list
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    /* eslint-disable no-bitwise */
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
    /* eslint-enable no-bitwise */
  }
  return Math.abs(hash);
}

// restricted palette: darker blues, grays, golds, and dark complementary colors
const DEFAULT_COLORS = [
  "#D32F2F", // dark red
  "#0D47A1", // dark blue
  "#1976D2", // medium blue
  "#3F51B5", // indigo
  "#2196F3", // blue
  "#455A64", // blue grey dark
  "#607D8B", // blue grey
  "#9E9E9E", // grey
  "#424242", // dark grey
  "#FFC107", // amber (gold)
  "#FFA000", // dark amber
  "#FF8F00", // darker gold
  "#795548", // brown (dark)
  "#7B1FA2", // dark purple
  "#00796B", // dark teal
  "#F57F17", // dark orange
];

export const PROJECT_COLORS = DEFAULT_COLORS;

export default function ProjectTile({
  project,
  // old 'size' used for both dimensions; newer code accepts width/height separately
  size = 200, // make default width/height larger so longer names fit
  width,
  height,
  onEdit = () => {},
  onDelete = () => {},
  onChangeColor = () => {},
  onReorder = () => {},
  isDragging = false,
}) {
  const progress = useMemo(() => {
    const allTasks = (project.subprojects || []).flatMap((s) => s.tasks || []);
    if (allTasks.length === 0) return 0;
    return Math.round((allTasks.filter((t) => t.done).length / allTasks.length) * 100);
  }, [project.subprojects]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [menuFlippedVertically, setMenuFlippedVertically] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const menuRef = useRef(null);
  const dragRef = useRef(null);
  const dropdownRef = useRef(null);

  const color = useMemo(() => {
    if (project.color) return project.color;
    const idx = hashString(project.id || project.text || "") % DEFAULT_COLORS.length;
    return DEFAULT_COLORS[idx];
  }, [project.id, project.text, project.color]);

  // Close menu when clicking outside (including portal dropdown)
  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideMenu =
        (menuRef.current && menuRef.current.contains(event.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target));
      if (!clickedInsideMenu) {
        setMenuOpen(false);
        setShowColorPicker(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Close modal when clicking overlay (but not the modal itself)
  useEffect(() => {
    function handleOverlayClick(event) {
      // Only close if clicking on the overlay background itself (has the data attribute)
      if (event.target.hasAttribute("data-color-picker-overlay")) {
        setShowColorPicker(false);
      }
    }

    if (showColorPicker) {
      document.addEventListener("click", handleOverlayClick);
      return () => document.removeEventListener("click", handleOverlayClick);
    }
  }, [showColorPicker]);

  // Position the dropdown in a fixed portal and update on resize/scroll
  useLayoutEffect(() => {
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
      const left = buttonRect.right - dropdownRect.width;

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

  // Listen for global menu close events to prevent multiple menus from being open
  useEffect(() => {
    function handleCloseAllMenus(event) {
      // Only close this menu if it's different from the one opening
      if (event.detail && event.detail.projectId !== project.id) {
        setMenuOpen(false);
        setShowColorPicker(false);
      }
    }

    document.addEventListener("closeAllMenus", handleCloseAllMenus);
    return () => document.removeEventListener("closeAllMenus", handleCloseAllMenus);
  }, [project.id]);

  // compute final width/height with CSS variable overrides
  const resolvedWidth = width !== undefined ? width : size;
  const resolvedHeight = height !== undefined ? height : size;
  const widthStr = `var(--project-tile-width, ${typeof resolvedWidth === 'number' ? resolvedWidth + 'px' : resolvedWidth})`;
  const heightStr = `var(--project-tile-height, ${typeof resolvedHeight === 'number' ? resolvedHeight + 'px' : resolvedHeight})`;

  const handleEdit = () => {
    onEdit(project.id);
    setMenuOpen(false);
  };

  const handleDelete = () => {
    onDelete(project.id);
    setMenuOpen(false);
  };

  const handleColorChange = (newColor) => {
    onChangeColor(project.id, newColor);
    setShowColorPicker(false);
    setMenuOpen(false);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({
      projectId: project.id,
    }));
  };

  const handleDragEnd = (e) => {
    // Cleanup
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (data) {
      try {
        const { projectId } = JSON.parse(data);
        if (projectId !== project.id) {
          onReorder(projectId, project.id);
        }
      } catch (err) {
        console.error("Drop error:", err);
      }
    }
  };

  return (
    <div
      className="project-tile"
      style={{
        width: widthStr,
        height: heightStr,
        "--project-color": color,
        opacity: isDragging ? 0.5 : 1,
        zIndex: menuOpen || showColorPicker ? 999 : undefined,
      }}
      data-testid="project-tile"
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="project-header">
        <div className="project-name-wrapper">
          <div className="project-name">{project.text || project.name}</div>
        </div>
        <div className="project-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            className="project-menu-button"
            title="More options"
            onClick={(e) => {
              e.stopPropagation();
              // Dispatch event to close all other menus
              const event = new CustomEvent("closeAllMenus", {
                detail: { projectId: project.id },
              });
              document.dispatchEvent(event);
              setMenuOpen(!menuOpen);
            }}
            aria-label="Project menu"
          >
            <span className="material-icons">more_vert</span>
          </button>
          {menuOpen &&
            ReactDOM.createPortal(
              <div
                className="project-menu-dropdown"
                ref={dropdownRef}
                data-flipped-v={menuFlippedVertically ? "true" : "false"}
                style={{
                  position: "fixed",
                  ...dropdownStyle,
                  zIndex: 1001,
                }}
              >
              <button
                className="menu-item color-menu-item"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Change color"
              >
                <span className="material-icons">palette</span>
                <span>Color</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="menu-divider" />

              <button
                className="menu-item edit-menu-item"
                onClick={handleEdit}
                title="Edit project"
              >
                <span className="material-icons">edit</span>
                <span>Edit</span>
              </button>
              <button
                className="menu-item delete-menu-item"
                onClick={handleDelete}
                title="Delete project"
              >
                <span className="material-icons">delete</span>
                <span>Delete</span>
              </button>
            </div>,
              document.body
          )}
        </div>
      </div>

      {/* Color picker modal - rendered at document root to avoid scroll clipping */}
      {showColorPicker && ReactDOM.createPortal(
        <div className="color-picker-modal-overlay" data-color-picker-overlay>
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
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-option ${c === color ? "selected" : ""}`}
                  style={{ backgroundColor: c }}
                  title={`Change to ${c}`}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleColorChange(c);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleColorChange(c);
                  }}
                  aria-label={`Color ${c}`}
                >
                  {c === color && (
                    <span className="material-icons">check</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="project-body">
        <div className="project-progress-section">
          <div className="project-progress-container">
            <div
              className="project-progress"
              style={{ width: `${progress}%` }}
              data-testid="project-progress"
            />
          </div>
          <div className="project-percent" data-testid="project-percent">
            {progress}%
          </div>
        </div>
      </div>

      <div className="project-footer">
        <div className="project-accent-bar" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

ProjectTile.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string,
    text: PropTypes.string,
    name: PropTypes.string,
    color: PropTypes.string,
    progress: PropTypes.number,
  }).isRequired,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // legacy; width/height preferred
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
