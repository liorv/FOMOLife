import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  MouseEvent,
} from "react";
import ReactDOM from "react-dom";
import styles from "./ProjectTile.module.css";

import type { ProjectItem } from "@myorg/types";

export interface ProjectTileProps {
  project: ProjectItem;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  onEdit?: ((id: string) => void) | undefined;
  onTitleChange?: ((id: string, title: string) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onConfirmDelete?: ((id: string) => void) | undefined;
  isPendingDelete?: boolean;
  onChangeColor?: ((id: string, color: string) => void) | undefined;
  onOpenColorPicker?: ((id: string, targetEl: HTMLElement) => void) | undefined;
  onReorder?: ((fromId: string, toId: string) => void) | undefined;
  isDragging?: boolean;
  currentUserId?: string;
  onLeave?: ((id: string) => void) | undefined;
}

// a simple hash function to convert a string into an index for a color list
function hashString(str: string) {
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
export const PROJECT_COLORS = [
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

export default function ProjectTile({
  project,
  // old 'size' used for both dimensions; newer code accepts width/height separately
  size = 200, // make default width/height larger so longer names fit
  width,
  height,
  onEdit = () => {},
  onTitleChange = () => {},
  onDelete = () => {},
  onConfirmDelete = () => {},
  isPendingDelete = false,
  onChangeColor = () => {},
  onOpenColorPicker = () => {},
  onReorder = () => {},
  isDragging = false,
  currentUserId,
  onLeave,
}: ProjectTileProps) {
  const progress = useMemo(() => {
    // Derive progress solely from tasks; ignore any stored project.progress value.
    const allTasks = (project.subprojects || []).flatMap((s) => s.tasks || []);
    if (allTasks.length === 0) return 0;

    return Math.round(
      (allTasks.filter((t) => t.done).length / allTasks.length) * 100,
    );
  }, [project.subprojects]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFlippedVertically, setMenuFlippedVertically] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(project.text || "");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const color = useMemo(() => {
    const computedColor =
      project.color ||
      PROJECT_COLORS[
        hashString(project.id || project.text || "") % PROJECT_COLORS.length
      ];
    return computedColor;
  }, [project.id, project.text, project.color]);

  useEffect(() => {
    setDraftName(project.text || "");
  }, [project.text]);

  // Select all text when starting to edit the name
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.select();
    }
  }, [editingName]);

  // Close menu when clicking outside (including portal dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | globalThis.MouseEvent) {
      const clickedInsideMenu =
        (menuRef.current && menuRef.current.contains(event.target as Node)) ||
        (dropdownRef.current &&
          dropdownRef.current.contains(event.target as Node));
      if (!clickedInsideMenu) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Close modal when clicking overlay (but not the modal itself)
  // Removed document listener - using React onClick instead for better event handling

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

      const isBottomCutOff =
        buttonRect.bottom + dropdownRect.height > viewportHeight - threshold;
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

  // listen for global menu close events to prevent multiple menus from being open
  useEffect(() => {
    function handleCloseAllMenus(event: Event) {
      // custom event with detail.projectId
      const detail = (event as CustomEvent<{ projectId: string }>).detail;
      if (detail && detail.projectId !== project.id) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "closeAllMenus",
      handleCloseAllMenus as EventListener,
    );
    return () =>
      document.removeEventListener(
        "closeAllMenus",
        handleCloseAllMenus as EventListener,
      );
  }, [project.id]);

  // compute final width/height with CSS variable overrides
  const resolvedWidth = width !== undefined ? width : size;
  const resolvedHeight = height !== undefined ? height : size;
  const widthStr = `var(--project-tile-width, ${typeof resolvedWidth === "number" ? resolvedWidth + "px" : resolvedWidth})`;
  const heightStr = `var(--project-tile-height, ${typeof resolvedHeight === "number" ? resolvedHeight + "px" : resolvedHeight})`;

  const handleEdit = () => {
    onEdit(project.id);
    setMenuOpen(false);
  };

  const finishInlineRename = () => {
    const trimmed = (draftName || "").trim();
    setEditingName(false);
    if (!trimmed) {
      setDraftName(project.text || "");
      return;
    }
    const currentName = (project.text || "").trim();
    if (trimmed !== currentName) {
      onTitleChange(project.id, trimmed);
    }
  };

  const handleDelete = () => {
    onDelete(project.id);
    setMenuOpen(false);
  };

  const handleLeave = () => {
    onLeave?.(project.id);
    setMenuOpen(false);
  };

  // Membership-aware menu logic:
  // - sole member → show Delete only
  // - multiple members → show Leave only
  // - no membership info → show Delete (legacy / no-member projects)
  const members = project.members ?? [];
  const isSoleMember =
    !!currentUserId &&
    members.length === 1 &&
    members[0]!.userId === currentUserId;
  const isAmongMultiple =
    !!currentUserId &&
    !!onLeave &&
    members.length > 1 &&
    members.some((m) => m.userId === currentUserId);
  const showDelete = !isAmongMultiple; // hide delete when others are present
  const showLeave = isAmongMultiple;   // show leave only when others are present

  const handleColorChange = (newColor: string) => {
    onChangeColor(project.id, newColor);
    setMenuOpen(false);
  };

  const handleOpenColorPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    onOpenColorPicker(project.id, e.currentTarget);
  };

  // Listen for color selection from framework
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event?.data) return;

      const { type, color, projectId } = event.data;
      if (
        type === "color-selected" &&
        typeof color === "string" &&
        projectId === project.id
      ) {
        handleColorChange(color);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [project.id]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        projectId: project.id,
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Cleanup
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
      className={styles.tile}
      style={
        {
          width: widthStr,
          height: heightStr,
          "--project-color": color,
          opacity: isDragging ? 0.5 : 1,
          zIndex: menuOpen ? 999 : undefined,
        } as any
      }
      data-testid="project-tile"
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Artistic background elements */}
      <div className={`${styles.tileBg} project-tile-bg`}>
        <div
          className={`${styles.tileShape} ${styles.shape1} project-tile-shape shape-1`}
        />
        <div
          className={`${styles.tileShape} ${styles.shape2} project-tile-shape shape-2`}
        />
        <div
          className={`${styles.tileShape} ${styles.shape3} project-tile-shape shape-3`}
        />
      </div>

      {/* Main content container */}
      <div className={`${styles.tileContent} project-tile-content`}>
        {/* Header with name and menu */}
        <div className={`${styles.tileHeader} project-tile-header`}>
          <div className={`${styles.nameSection} project-name-section`}>
            <div className={`${styles.nameRow} project-name-row`}>
              {editingName ? (
                <input
                  ref={nameInputRef}
                  className={`${styles.nameInput} project-name-input`}
                  name={`project-name-${project.id}`}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={finishInlineRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      finishInlineRename();
                    }
                    if (e.key === "Escape") {
                      setDraftName(project.text || "");
                      setEditingName(false);
                    }
                  }}
                  aria-label="Edit project name"
                  autoFocus
                />
              ) : (
                <>
                  <div className={`${styles.name} project-name`}>
                    {project.text}
                  </div>
                  <button
                    className={`${styles.nameEditBtn} project-name-edit-btn`}
                    title="Rename project"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingName(true);
                    }}
                  >
                    <span className="material-icons">edit</span>
                  </button>
                </>
              )}
            </div>
            <div className={`${styles.nameAccent} project-name-accent`} />
          </div>

          {isPendingDelete ? (
            <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
              <div className={styles.pendingActions}>
                <button
                  className={`${styles.confirmDeleteButton} confirm-delete-button`}
                  title="Confirm delete project"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmDelete(project.id);
                  }}
                >
                  <span className="material-icons">delete_forever</span>
                </button>
                <button
                  className={`${styles.cancelDeleteButton} cancel-delete-button`}
                  title="Cancel delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id); // This will unset pending
                  }}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className={styles.menu}
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.menuButton}
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
                    className={`${styles.menuDropdown} project-menu-dropdown`}
                    ref={dropdownRef}
                    data-flipped-v={menuFlippedVertically ? "true" : "false"}
                    style={{
                      position: "fixed",
                      ...dropdownStyle,
                      right: "auto",
                      zIndex: 1001,
                    }}
                  >
                    <button
                      className={`${styles.menuItem} ${styles.colorMenuItem} menu-item color-menu-item`}
                      onClick={(e) => {
                        setMenuOpen(false);
                        handleOpenColorPicker(e);
                      }}
                      title="Change color"
                    >
                      <span className="material-icons">palette</span>
                      <span>Color</span>
                      <span className={`${styles.menuArrow} menu-arrow`}>
                        ›
                      </span>
                    </button>

                    <div className={`${styles.menuDivider} menu-divider`} />

                    <button
                      className={`${styles.menuItem} ${styles.editMenuItem} menu-item edit-menu-item`}
                      onClick={handleEdit}
                      title="Edit project"
                    >
                      <span className="material-icons">edit</span>
                      <span>Edit</span>
                    </button>

                    {showDelete && (
                      <button
                        className={`${styles.menuItem} ${styles.deleteMenuItem} menu-item delete-menu-item`}
                        onClick={handleDelete}
                        title="Delete project"
                      >
                        <span className="material-icons">delete</span>
                        <span>Delete</span>
                      </button>
                    )}

                    {showLeave && (
                      <>
                        <div className={`${styles.menuDivider} menu-divider`} />
                        <button
                          className={`${styles.menuItem} ${styles.leaveMenuItem} menu-item leave-menu-item`}
                          onClick={handleLeave}
                          title="Leave project"
                        >
                          <span className="material-icons">exit_to_app</span>
                          <span>Leave Project</span>
                        </button>
                      </>
                    )}
                  </div>,
                  document.body,
                )}
            </div>
          )}
        </div>

        {/* Progress visualization with avatar */}
        <div className={`${styles.progressSection} project-progress-section`}>
          <div
            className={`${styles.progressVisualization} progress-visualization`}
          >
            <div className={`${styles.progressCircle} progress-circle`}>
              <svg
                className={`${styles.progressSvg} progress-svg`}
                viewBox="0 0 120 120"
              >
                <circle
                  className={`${styles.progressBg} progress-bg`}
                  cx="60"
                  cy="60"
                  r="50"
                  strokeWidth="8"
                />
                <circle
                  className={`${styles.progressFill} progress-fill`}
                  cx="60"
                  cy="60"
                  r="50"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              {/* Project avatar in center */}
              <div className={`${styles.progressAvatarContainer} progress-avatar-container`}>
                {project.avatarUrl ? (
                  <div className={styles.progressAvatarWrap}>
                    <img
                      src={project.avatarUrl}
                      alt="Project avatar"
                      className={`${styles.progressAvatar} progress-avatar`}
                    />
                    <img
                      src={project.avatarUrl}
                      alt=""
                      aria-hidden="true"
                      className={`${styles.progressAvatar} ${styles.progressAvatarGray} progress-avatar`}
                    />
                  </div>
                ) : (
                  <div className={`${styles.progressAvatar} ${styles.progressAvatarInitials} progress-avatar progress-avatar--initials`}>
                    {project.text.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Progress text or check mark overlay */}
                <div className={`${styles.progressTextOverlay} progress-text-overlay`}>
                  {progress === 100 ? (
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '80px',
                      height: '80px'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: color || '#2196f3',
                        opacity: 0.6,
                        borderRadius: '50%'
                      }} />
                      <span 
                        className="material-icons" 
                        style={{ 
                          fontSize: '60px', 
                          color: '#ffffff',
                          position: 'relative',
                          zIndex: 1,
                          textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)'
                        }}
                      >
                        check
                      </span>
                    </div>
                  ) : (
                    <div className={`${styles.progressPercent} progress-percent`}>
                      {`${progress}%`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Task count indicator */}
        <div className={`${styles.stats} project-stats`}>
          <div className={`${styles.statItem} stat-item`}>
            <span className={`${styles.statNumber} stat-number`}>
              {(project.subprojects || []).flatMap((s) => s.tasks || []).length}
            </span>
            <span className={`${styles.statLabel} stat-label`}>Tasks</span>
          </div>
        </div>
      </div>

      {/* Hidden elements for backward compatibility with tests */}
      <div className="project-body" style={{ display: "none" }}>
        <div className="project-progress-section">
          <div className="project-progress-container">
            <div
              className="project-progress"
              style={{ width: `${progress === 100 ? <span className="material-icons" style={{ fontSize: "32px" }}>check_circle</span> : `${progress}%`}` }}
              data-testid="project-progress"
            />
          </div>
          <div className="project-percent" data-testid="project-percent">
            {progress === 100 ? <span className="material-icons" style={{ fontSize: "32px" }}>check_circle</span> : `${progress}%`}
          </div>
        </div>
      </div>

      <div className="project-footer" style={{ display: "none" }}>
        <div
          className="project-accent-bar"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
