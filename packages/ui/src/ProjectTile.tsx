import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useId,
} from "react";
import ReactDOM from "react-dom";
import styles from "./ProjectTile.module.css";
import ModalOverlay from "./ModalOverlay";
import { ProjectLink } from "./ProjectLink";
import { isValidExternalUrl } from "@myorg/utils";

import type { ProjectItem } from "@myorg/types";

export interface ProjectTileProps {
  project: ProjectItem;
  details?: React.ReactNode;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  onEdit?: ((id: string) => void) | undefined;
  onTitleChange?: ((id: string, title: string) => void) | undefined;
  onExternalUrlChange?: (id: string, url: string) => void;
  onDelete?: ((id: string) => void) | undefined;
  onConfirmDelete?: ((id: string) => void) | undefined;
  isPendingDelete?: boolean;
  onChangeColor?: ((id: string, color: string) => void) | undefined;
  onOpenColorPicker?: ((id: string, targetEl: HTMLElement) => void) | undefined;
  onReorder?: ((fromId: string, toId: string) => void) | undefined;
  isDragging?: boolean;
  currentUserId?: string;
  onLeave?: ((id: string) => void) | undefined;
  onArchiveToggle?: ((id: string, archived: boolean) => void) | undefined;
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

const SWIPE_OPEN_THRESHOLD = 44;
const SWIPE_AXIS_LOCK = 8;
const ACTIONS_WIDTH = 230;

export default function ProjectTile({
  project,
  details,
  // old 'size' used for both dimensions; newer code accepts width/height separately
  size = 200, // make default width/height larger so longer names fit
  width,
  height,
  onEdit = () => {},
  onTitleChange = () => {},
  onExternalUrlChange,
  onDelete = () => {},
  onConfirmDelete = () => {},
  isPendingDelete = false,
  onChangeColor = () => {},
  onOpenColorPicker = () => {},
  onReorder = () => {},
  isDragging = false,
  currentUserId,
  onLeave,
  onArchiveToggle,
}: ProjectTileProps) {
  const progress = useMemo(() => {
    // Derive progress solely from tasks; ignore any stored project.progress value.
    const allTasks = (project.subprojects || []).flatMap((s) => s.tasks || []);
    if (allTasks.length === 0) return 0;

    return Math.round(
      (allTasks.filter((t) => t.done).length / allTasks.length) * 100,
    );
  }, [project.subprojects]);

  const [touchActionsOpen, setTouchActionsOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(project.text || "");
  const [editingLink, setEditingLink] = useState(false);
  const [draftLink, setDraftLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const actionsHandleRef = useRef<HTMLButtonElement | null>(null);
  const trayHandleRef = useRef<HTMLButtonElement | null>(null);
  const actionsId = useId();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const linkButtonRef = useRef<HTMLButtonElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const saveLinkButtonRef = useRef<HTMLButtonElement | null>(null);
  const touchGestureRef = useRef<{
    x: number;
    y: number;
    axis: "none" | "x" | "y";
    open: boolean;
    trayHandle: boolean;
  } | null>(null);
  const swipedRef = useRef(false);
  const hasLink = isValidExternalUrl(project.externalUrl);

  const closeActions = () => {
    setTouchActionsOpen(false);
    setSwipeOffset(null);
  };

  const isInteractiveTarget = (target: EventTarget) =>
    target instanceof Element &&
    Boolean(target.closest("button, input, a, [role='dialog']"));

  const isTrayHandle = (target: EventTarget) =>
    target instanceof Element && Boolean(target.closest("[data-action-tray-handle]"));

  useEffect(() => {
    if (touchActionsOpen && document.activeElement === actionsHandleRef.current) {
      trayHandleRef.current?.focus();
    } else if (!touchActionsOpen && document.activeElement === trayHandleRef.current) {
      actionsHandleRef.current?.focus();
    }
  }, [touchActionsOpen]);

  useEffect(() => {
    if (!editingLink) return;
    linkInputRef.current?.focus();
    return () => linkButtonRef.current?.focus();
  }, [editingLink]);

  useEffect(() => {
    if (!touchActionsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        dragRef.current &&
        event.target instanceof Node &&
        !dragRef.current.contains(event.target)
      ) {
        closeActions();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [touchActionsOpen]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swipedRef.current = false;
    if (
      !event.isPrimary ||
      event.pointerType === "touch" ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (isInteractiveTarget(event.target) && !isTrayHandle(event.target))
    ) {
      return;
    }
    touchGestureRef.current = {
      x: event.clientX,
      y: event.clientY,
      axis: "none",
      open: touchActionsOpen,
      trayHandle: isTrayHandle(event.target),
    };
    if (isTrayHandle(event.target)) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const gesture = touchGestureRef.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.axis === "none") {
      if (
        Math.abs(dx) < SWIPE_AXIS_LOCK &&
        Math.abs(dy) < SWIPE_AXIS_LOCK
      ) {
        return;
      }
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (gesture.axis === "x") {
      swipedRef.current = true;
      updateSwipe(dx, gesture.open);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (event.pointerType === "mouse") event.preventDefault();
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const gesture = touchGestureRef.current;
    touchGestureRef.current = null;
    if (!gesture || gesture.axis !== "x") return;
    event.stopPropagation();

    const dx = event.clientX - gesture.x;
    finishSwipe(dx, gesture.open);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const gesture = touchGestureRef.current;
    touchGestureRef.current = null;
    setSwipeOffset(null);
    if (gesture?.axis === "x") {
      event.stopPropagation();
      swipedRef.current = false;
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    swipedRef.current = false;
    if (event.touches.length !== 1 || (isInteractiveTarget(event.target) && !isTrayHandle(event.target))) {
      touchGestureRef.current = null;
      return;
    }
    const touch = event.touches[0]!;
    touchGestureRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      axis: "none",
      open: touchActionsOpen,
      trayHandle: isTrayHandle(event.target),
    };
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current;
    if (!gesture) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if (gesture.axis === "none") {
      if (
        Math.abs(dx) < SWIPE_AXIS_LOCK &&
        Math.abs(dy) < SWIPE_AXIS_LOCK
      ) {
        return;
      }
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (gesture.axis === "x") {
      swipedRef.current = true;
      updateSwipe(dx, gesture.open);
    }
  };

  const updateSwipe = (dx: number, open: boolean) => {
    setSwipeOffset(Math.max(0, Math.min(ACTIONS_WIDTH, open ? ACTIONS_WIDTH - dx : Math.abs(dx))));
  };

  const finishSwipe = (dx: number, open: boolean) => {
    setSwipeOffset(null);
    const nextOpen = open ? dx < SWIPE_OPEN_THRESHOLD : Math.abs(dx) >= SWIPE_OPEN_THRESHOLD;
    setTouchActionsOpen(nextOpen);
    if (!nextOpen && document.activeElement === trayHandleRef.current) {
      actionsHandleRef.current?.focus();
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current;
    touchGestureRef.current = null;
    if (!gesture || gesture.axis !== "x") return;
    event.stopPropagation();

    const touch = event.changedTouches[0];
    if (touch) finishSwipe(touch.clientX - gesture.x, gesture.open);
    else setSwipeOffset(null);
  };

  const handleTouchCancel = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current;
    touchGestureRef.current = null;
    setSwipeOffset(null);
    if (gesture?.axis === "x") {
      event.stopPropagation();
      swipedRef.current = false;
    }
  };

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

  // compute final width/height with CSS variable overrides
  const resolvedWidth = width !== undefined ? width : size;
  const resolvedHeight = height !== undefined ? height : size;
  const widthStr = `var(--project-tile-width, ${typeof resolvedWidth === "number" ? resolvedWidth + "px" : resolvedWidth})`;
  const heightStr = `var(--project-tile-height, ${typeof resolvedHeight === "number" ? resolvedHeight + "px" : resolvedHeight})`;

  const handleEdit = () => {
    onEdit(project.id);
    closeActions();
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
    setTouchActionsOpen(true);
  };

  const handleLeave = () => {
    closeActions();
    setShowLeaveConfirm(true);
  };

  const confirmLeave = () => {
    onLeave?.(project.id);
    setShowLeaveConfirm(false);
  };

  // Membership-aware actions:
  // - sole member → show Delete only
  // - multiple members → show Leave only
  // - no membership info → show Delete (legacy / no-member projects)
  const members = project.members ?? [];
  const isAmongMultiple =
    !!currentUserId &&
    !!onLeave &&
    members.length > 1 &&
    members.some((m) => m.userId === currentUserId);
  const showDelete = !isAmongMultiple; // hide delete when others are present
  const showLeave = isAmongMultiple;   // show leave only when others are present

  const handleColorChange = (newColor: string) => {
    onChangeColor(project.id, newColor);
    closeActions();
  };

  const handleArchiveToggle = () => {
    onArchiveToggle?.(project.id, !project.archived);
    closeActions();
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
    const gesture = touchGestureRef.current;
    if (gesture?.trayHandle) {
      e.preventDefault();
      return;
    }
    if (
      gesture &&
      (gesture.axis === "x" ||
        Math.abs(e.clientX - gesture.x) > Math.abs(e.clientY - gesture.y))
    ) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        projectId: project.id,
      }),
    );
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

  const actionHandle = (
    <button
      ref={actionsHandleRef}
      type="button"
      className={styles.actionsHandle}
      aria-label={`${touchActionsOpen ? "Close" : "Open"} actions for ${project.text}`}
      aria-expanded={touchActionsOpen}
      aria-controls={actionsId}
      title={touchActionsOpen ? "Close actions" : "Open actions"}
      onClick={(event) => {
        event.stopPropagation();
        setSwipeOffset(null);
        setTouchActionsOpen((open) => !open);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") event.stopPropagation();
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      <svg width="32" height="24" viewBox="0 0 32 24" fill="currentColor" aria-hidden="true">
        <path
          d={touchActionsOpen ? "M3 7l5 5-5 5" : "M8 7l-5 5 5 5"}
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />
        <rect x="13" y="5" width="4" height="4" rx="1" />
        <rect x="20" y="5" width="4" height="4" rx="1" />
        <rect x="27" y="5" width="4" height="4" rx="1" />
        <rect x="13" y="12" width="4" height="4" rx="1" />
        <rect x="20" y="12" width="4" height="4" rx="1" />
        <rect x="27" y="12" width="4" height="4" rx="1" />
      </svg>
    </button>
  );

  return (
    <div
      className={`${styles.tile} ${details ? styles.brief : ""} ${touchActionsOpen ? `${styles.actionsOpen} project-tile-actions-open` : ""} ${swipeOffset !== null ? styles.swiping : ""}`}
      style={
        {
          width: widthStr,
          height: heightStr,
          "--project-color": color,
          opacity: isDragging ? 0.5 : project.archived ? 0.75 : 1,
          "--actions-offset": swipeOffset === null ? undefined : `${100 - swipeOffset / ACTIONS_WIDTH * 100}%`,
        } as React.CSSProperties
      }
      data-testid="project-tile"
      ref={dragRef}
      draggable={!editingLink && !editingName}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeActions();
          actionsHandleRef.current?.focus();
        }
      }}
      onClickCapture={(event) => {
        if (swipedRef.current) {
          swipedRef.current = false;
          event.preventDefault();
          event.stopPropagation();
        } else if (touchActionsOpen && !isInteractiveTarget(event.target)) {
          closeActions();
          event.preventDefault();
          event.stopPropagation();
        }
      }}
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
        {/* Project name and link */}
        <div className={`${styles.tileHeader} project-tile-header`}>
          <div className={`${styles.nameSection} project-name-section`}>
            <div className={`${styles.nameRow} project-name-row`}>
              {details && (
                <span className={styles.briefIcon} aria-hidden="true">
                  {project.avatarUrl ? <img src={project.avatarUrl} alt="" draggable={false} />
                    : project.text.charAt(0).toUpperCase()}
                </span>
              )}
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
                    e.stopPropagation();
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
                  onFocus={(e) => e.currentTarget.select()}
                />
              ) : (
                <>
                  <div className={`${styles.name} project-name`}>
                    {project.text}
                  </div>
                  {isValidExternalUrl(project.externalUrl) && (
                    <a
                      className="project-layout-link"
                      href={project.externalUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open project link for ${project.text} (opens in a new tab)`}
                      title="Open project link"
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      draggable={false}
                    >
                      <span className="material-icons" aria-hidden="true">link</span>
                    </a>
                  )}
                </>
              )}
              {editingName && <ProjectLink url={project.externalUrl} projectName={project.text} />}
              {actionHandle}
            </div>
              {editingLink && ReactDOM.createPortal(
              <div
                className={styles.linkDialogOverlay}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.target === e.currentTarget) setEditingLink(false);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
              <form
                className={styles.linkEditor}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`project-tile-link-title-${project.id}`}
                aria-describedby={`project-tile-link-description-${project.id}`}
                noValidate
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingLink(false);
                  }
                  if (e.key === "Tab") {
                    if (e.shiftKey && e.target === linkInputRef.current) {
                      e.preventDefault();
                      saveLinkButtonRef.current?.focus();
                    } else if (!e.shiftKey && e.target === saveLinkButtonRef.current) {
                      e.preventDefault();
                      linkInputRef.current?.focus();
                    }
                  }
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const url = draftLink.trim();
                  if (!isValidExternalUrl(url)) {
                    setLinkError("Enter a valid link starting with https:// or http://.");
                    return;
                  }
                  onExternalUrlChange?.(project.id, url);
                  setEditingLink(false);
                }}
              >
                <div className={styles.linkDialogIcon} aria-hidden="true">
                  <span className="material-icons">add_link</span>
                </div>
                <h2 id={`project-tile-link-title-${project.id}`}>{hasLink ? "Edit project link" : "Add project link"}</h2>
                <p id={`project-tile-link-description-${project.id}`} className={styles.linkDescription}>
                  Keep a useful resource one click away from <strong>{project.text}</strong>.
                </p>
                <div className={styles.linkField}>
                <label htmlFor={`project-tile-link-${project.id}`}>External Link</label>
                <span className={`material-icons ${styles.linkFieldIcon}`} aria-hidden="true">link</span>
                <input
                  ref={linkInputRef}
                  id={`project-tile-link-${project.id}`}
                  type="url"
                  placeholder="https://example.com"
                  value={draftLink}
                  onChange={(e) => {
                    setDraftLink(e.target.value);
                    setLinkError("");
                  }}
                  aria-invalid={Boolean(linkError)}
                  aria-describedby={`project-tile-link-help-${project.id}`}
                  autoFocus
                />
                </div>
                <p
                  id={`project-tile-link-help-${project.id}`}
                  className={linkError ? styles.linkError : styles.linkHelper}
                  role={linkError ? "alert" : undefined}
                >
                  {linkError || "Use an https:// or http:// URL. You can edit it later from the actions or overview."}
                </p>
                <div className={styles.linkEditorActions}>
                  <button className={styles.linkCancelButton} type="button" onClick={() => setEditingLink(false)}>Cancel</button>
                  <button ref={saveLinkButtonRef} className={styles.linkSaveButton} type="submit">Save link</button>
                </div>
              </form>
              </div>,
              document.body,
            )}
            <div className={`${styles.nameAccent} project-name-accent`} />
            {!details && <div
              className="project-inline-progress"
              role="progressbar"
              aria-label={`${project.text} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span
                className="project-inline-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>}
          </div>

        </div>

        {details || <>
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
              {(project.subprojects || []).flatMap((s) => s.tasks || []).filter((t) => !t.done).length}
            </span>
            <span className={`${styles.statLabel} stat-label`}>{(project.subprojects || []).flatMap((s) => s.tasks || []).filter((t) => !t.done).length === 1 ? "Task" : "Tasks"}</span>
          </div>
        </div>
        </>}

        {project.archived && !details && (
          <span
            className="project-archived-badge"
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(0, 0, 0, 0.55)',
              color: '#fff',
              zIndex: 3,
            }}
          >
            <span className="material-icons" style={{ fontSize: 13 }}>archive</span>
            Archived
          </span>
        )}
      </div>

      <div
        id={actionsId}
        className={styles.actionTray}
        role="group"
        aria-label={`${project.text} actions`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Escape") event.stopPropagation();
        }}
      >
        <div className={styles.actionGrid}>
        {showDelete && isPendingDelete ? (
          <div className={styles.deleteConfirmation}>
            <button type="button" className={`${styles.actionButton} ${styles.actionDelete}`}
              aria-label={`Confirm delete ${project.text}`} title="Confirm delete project"
              onClick={() => { closeActions(); onConfirmDelete(project.id); }}>
              <span className="material-icons" aria-hidden="true">delete_forever</span>
              <span>Confirm</span>
            </button>
            <button type="button" className={`${styles.actionButton} ${styles.actionCancel}`}
              aria-label="Cancel delete" title="Cancel delete"
              onClick={() => { onDelete(project.id); closeActions(); }}>
              <span className="material-icons" aria-hidden="true">close</span>
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <>
        <button type="button" className={`${styles.actionButton} ${styles.actionEdit}`}
          aria-label={`Edit ${project.text}`} title="Edit project" onClick={handleEdit}>
          <span className="material-icons" aria-hidden="true">edit</span>
          <span>Edit</span>
        </button>
        <button type="button" className={`${styles.actionButton} ${styles.actionRename}`}
          aria-label={`Rename ${project.text}`} title="Rename project"
          onClick={() => { closeActions(); setEditingName(true); }}>
          <span className="material-icons" aria-hidden="true">drive_file_rename_outline</span>
          <span>Rename</span>
        </button>
        <button type="button" className={`${styles.actionButton} ${styles.actionColor}`}
          aria-label={`Change ${project.text} color`} title="Change project color"
          onClick={handleOpenColorPicker}>
          <span className="material-icons" aria-hidden="true">palette</span>
          <span>Color</span>
        </button>
        {onExternalUrlChange && (
          <button type="button" ref={linkButtonRef}
            className={`${styles.actionButton} ${styles.actionLink}`}
            aria-label={hasLink ? `Edit link for ${project.text}` : `Add link to ${project.text}`}
            title={hasLink ? "Edit project link" : "Add project link"}
            aria-expanded={editingLink} aria-haspopup="dialog"
            onClick={() => {
              closeActions();
              setDraftLink(project.externalUrl || "");
              setLinkError("");
              setEditingLink(true);
            }}>
            <span className="material-icons" aria-hidden="true">add_link</span>
            <span>{hasLink ? "Edit link" : "Add link"}</span>
          </button>
        )}
        {onArchiveToggle && (
          <button type="button" className={`${styles.actionButton} ${styles.actionArchive}`}
            aria-label={`${project.archived ? "Restore" : "Complete"} ${project.text}`}
            title={project.archived ? "Restore project" : "Mark project complete"}
            onClick={handleArchiveToggle}>
            <span className="material-icons" aria-hidden="true">{project.archived ? "unarchive" : "archive"}</span>
            <span>{project.archived ? "Restore" : "Complete"}</span>
          </button>
        )}
        {showDelete && (
          <button type="button" className={`${styles.actionButton} ${styles.actionDelete}`}
            aria-label={`Delete ${project.text}`} title="Delete project" onClick={handleDelete}>
            <span className="material-icons" aria-hidden="true">delete</span>
            <span>Delete</span>
          </button>
        )}
        {showLeave && (
          <button type="button" className={`${styles.actionButton} ${styles.actionDelete}`}
            aria-label={`Leave ${project.text}`} title="Leave project" onClick={handleLeave}>
            <span className="material-icons" aria-hidden="true">exit_to_app</span>
            <span>Leave</span>
          </button>
        )}
          </>
        )}
        </div>
        <button
          ref={trayHandleRef}
          type="button"
          className={styles.trayHandle}
          data-action-tray-handle
          aria-label={`Close action tray for ${project.text}`}
          title="Click or drag right to close actions"
          onClick={() => {
            closeActions();
            actionsHandleRef.current?.focus();
          }}
          onDragStart={(event) => event.preventDefault()}
        >
          <svg width="20" height="40" viewBox="0 0 20 40" fill="none" aria-hidden="true">
            <path d="M7 6l5 5-5 5M7 25v9M12 25v9" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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

      {/* Leave Project Confirmation Modal */}
      <ModalOverlay
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        className="leave-confirm-modal-overlay"
        contentClassName="leave-confirm-modal-content"
        ariaLabelledby={`leave-confirm-title-${project.id}`}
      >
        <div className="leave-confirm-modal-header">
          <span className="material-icons leave-confirm-modal-icon" aria-hidden="true">logout</span>
          <h3 id={`leave-confirm-title-${project.id}`}>Leave project?</h3>
        </div>
        <div className="leave-confirm-modal-body">
          <p>Are you sure you want to leave <strong>{project.text}</strong>?</p>
          <p className="leave-confirm-warning">
            You will lose access to this project and all its tasks.
          </p>
        </div>
        <div className="leave-confirm-modal-actions">
          <button type="button" className="leave-confirm-cancel" onClick={() => setShowLeaveConfirm(false)}>
            Cancel
          </button>
          <button type="button" className="leave-confirm-submit" onClick={confirmLeave}>
            Leave Project
          </button>
        </div>
      </ModalOverlay>
    </div>
  );
}
