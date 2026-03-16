import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { PROJECT_COLORS } from './ProjectTile';
import styles from './SubprojectRow.module.css';
import type { ProjectSubproject, ProjectItem } from "@myorg/types";

export interface SubprojectRowProps {
  sub: ProjectSubproject;
  project?: ProjectItem;
  onEdit: (subprojectId: string) => void;
  onNameChange?: (newName: string) => void;
  onDelete?: (subprojectId: string) => void;
  onColorChange?: (subprojectId: string, color: string) => void;
  onDragOverSubprojectTile?: () => void;
  onDragLeaveSubprojectTile?: () => void;
  onDropOnSubprojectTile?: (e: React.DragEvent) => void;
  isDragOverSubprojectTile?: boolean;
  /* when rendered as the header of an expanded subproject */
  expanded?: boolean;
  autoEdit?: boolean;
  isDragging?: boolean;
}

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
  expanded = false,
  autoEdit = false, 
  isDragging = false,
}: SubprojectRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFlippedVertically, setMenuFlippedVertically] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // state for inline renaming when expanded
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(sub.text || "");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoEdit) {
      setEditingName(true);
    }
  }, [autoEdit]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingName]);

  const finishEditing = () => {
    if (draftName.trim() && draftName !== sub.text) {
      onNameChange?.(draftName.trim());
    }
    setEditingName(false);
  };

  // Listen for global menu close events to prevent multiple menus from being open
  useEffect(() => {
    function handleCloseAllMenus(event: Event) {
      // Only close this menu if it's different from the one opening
      const customEvent = event as CustomEvent<{ subprojectId: string }>;
      if (customEvent.detail && customEvent.detail.subprojectId !== sub.id) {
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
  const taskCountLabel = count === 0 ? "(EMPTY)" : doneCount === count ? "(DONE)" : `(${doneCount}/${count})`;
  const hasDescription = sub.description && sub.description.trim() !== "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owners = (sub.owners || (sub as any).people || []) as { name: string }[];

  // Determine the color for the folder icon or project-level background
  const subprojectColor = sub.color || (sub.isProjectLevel ? project?.color : undefined);

  // Helper to Render avatar initials
  const renderAvatar = (name: string) => (
    <div key={name} className={`${styles.avatar} avatar small`} title={name}>
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </div>
  );

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedInsideMenu =
        (menuRef.current && menuRef.current.contains(event.target as Node)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target as Node));
      if (!clickedInsideMenu) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const handleOpenColorPicker = () => {
    // Send message to framework to open color picker
    window.parent?.postMessage?.({
      type: 'colorpicker-open',
      subprojectId: sub.id
    }, '*');
  };

  // Listen for color selection from framework
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event?.data) return;

      const { type, color, subprojectId } = event.data;
      if (type === 'color-selected' && typeof color === 'string' && subprojectId === sub.id) {

        onColorChange?.(sub.id, color);
        setMenuOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onColorChange, sub.id]);

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

      const top = isBottomCutOff
        ? buttonRect.top - dropdownRect.height
        : buttonRect.bottom;

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
      className={`${styles.subprojectRow}${expanded ? ` ${styles.expanded}` : ""} subproject-row${expanded ? " expanded" : ""}`} 
      role="button"
      onClick={() => {
        if (editingName) return;
        onEdit(sub.id);
      }}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragOverSubprojectTile ? 'rgba(0, 0, 0, 0.02)' : (sub.color ? `${sub.color}15` : 'white'),
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
        className={`${styles.expandBtn} subproject-expand-btn`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit(sub.id);
        }}
        title={expanded ? "Hide tasks" : "Show tasks"}
      >
        <span className="material-icons">{expanded ? "expand_less" : "expand_more"}</span>
      </button>

      {/* icon representing a subproject/folder or project-level tasks */}
      <span 
        className={`material-icons ${styles.subprojectIcon} subproject-icon`} 
        aria-hidden="true"
        style={subprojectColor ? { color: subprojectColor } : {}}
      >
        {sub.isProjectLevel ? "assignment_turned_in" : "folder"}
      </span>

      {editingName ? (
        <input
          ref={nameInputRef}
          className={`${styles.rowNameInput} ${expanded ? "subproject-name-input-expanded" : "subproject-name-input"}`}
          value={draftName}
          maxLength={100}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") finishEditing();
          }}
        />
      ) : (
        <span className={`${styles.rowTitle} subproject-row-title subproject-name-display`} title={sub.isProjectLevel ? "Tasks" : sub.text} style={subprojectColor ? { color: subprojectColor } : {}}>
          <span className={`${styles.rowNameText} subproject-name-text`}>{sub.isProjectLevel ? "Tasks" : (sub.text || "Untitled")}</span>
          <span className={`${styles.taskCount} subproject-task-count`}>{taskCountLabel}</span>
          {!sub.isProjectLevel && (
            <button
              className="subproject-name-edit-btn"
              onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
              title="Rename sub-project"
            >
              <span className="material-icons">edit</span>
            </button>
          )}
        </span>
      )}

      {/* Right group: description icon, owners, and menu button */}
      <div className={`${styles.rightGroup} subproject-right-group`}>
        {hasDescription && (
          <span className={`material-icons ${styles.descIcon} desc-icon`} title="Has description">
            description
          </span>
        )}
        {owners.length > 0 && (
          <div className={`${styles.owners} owners`}>
            {owners.slice(0, 2).map((o: { name: string }) => renderAvatar(o.name))}
            {owners.length > 2 && (
              <div className={`${styles.peopleCount} people-count`}>+{owners.length - 2}</div>
            )}
          </div>
        )}
      </div>

      {/* hamburger menu on far right — outside of right-group so it's not constrained by its z-index */}
      {!sub.isProjectLevel && (
        <div className={`${styles.menu} project-menu`} ref={menuRef} style={menuOpen ? { zIndex: 10000 } : {}}>
          <button
            className={`${styles.menuButton} menu-button`}
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
                className={`${styles.menuDropdown} project-menu-dropdown`}
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
                  className={`${styles.menuItem} ${styles.colorMenuItem} menu-item color-menu-item`}
                  onClick={() => {
                    setMenuOpen(false);
                    handleOpenColorPicker();
                  }}
                  title="Change color"
                >
                  <span className="material-icons">palette</span>
                  <span>Color</span>
                  <span className={`${styles.menuArrow} menu-arrow`}>›</span>
                </button>
              )}

              <div className={`${styles.menuDivider} menu-divider`} />

              {!sub.isProjectLevel && (
                <button
                  className={`${styles.menuItem} ${styles.editMenuItem} menu-item edit-menu-item`}
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
                  className={`${styles.menuItem} ${styles.deleteMenuItem} menu-item delete-menu-item`}
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
    </div>
  );
}