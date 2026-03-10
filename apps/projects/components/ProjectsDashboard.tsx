import React, {
  useMemo,
  KeyboardEvent,
  MouseEvent,
  useEffect,
} from "react";
import type {
  ProjectItem,
  ProjectSubproject,
  ProjectTask,
} from "@myorg/types";
import { ProjectTile } from "@myorg/ui";
// JavaScript components imported for now; they'll be migrated later
import ProjectEditor from "./ProjectEditor";

// ─── Summary metric card ─────────────────────────────────────────────────────

type SummaryCardProps = {
  icon: string;
  label: string;
  value: string | number;
  accent?: string | undefined;
  onClick?: () => void;
  active?: boolean | undefined;
  clickable?: boolean | undefined;
};

function SummaryCard({
  icon,
  label,
  value,
  accent,
  onClick,
  active,
  clickable,
}: SummaryCardProps) {
  return (
    <div
      className={[
        "dashboard-card",
        accent ? `dashboard-card--${accent}` : "",
        clickable ? "dashboard-card--clickable" : "",
        active ? "dashboard-card--active" : "",
        active && accent ? `dashboard-card--${accent}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable && onClick
          ? (e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
          : undefined
      }
    >
      <span className="material-icons dashboard-card__icon">{icon}</span>
      <div className="dashboard-card__body">
        <span className="dashboard-card__value">{value}</span>
        <span className="dashboard-card__label">{label}</span>
      </div>
      {active && <span className="dashboard-card__active-dot" />}
    </div>
  );
}

// ─── Main dashboard component ─────────────────────────────────────────────────

// fully typed props for ProjectsDashboard
interface ProjectsDashboardProps {
  projects?: ProjectItem[];
  people?: any[];
  selectedProjectId?: string | null;
  onSelectProject?: (id: string | null) => void;
  onApplyChange?: (projectId: string, updated: Partial<ProjectItem>) => void;
  onAddSubproject?: (projectId: string, name: string) => void;
  newlyAddedSubprojectId?: string | null;
  onClearNewSubproject?: () => void;
  onSubprojectDeleted?: (payload: { projectId: string; subproject: any; index: number }) => void;
  onColorChange?: (projectId: string, color: string) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  onDeleteProject?: (id: string) => void;
  pendingDeleteProjectId?: string | null;
  onConfirmDeleteProject?: (id: string) => void;
  onAddProject?: () => void;
  onOpenPeople?: () => void;
  onCreatePerson?: (name: string) => void;
  onTitleChange?: (projectId: string, title: string) => void;
  projectSearch?: string;
  filters?: string[];
  onToggleFilter?: (filter: string | null) => void;
}

export default function ProjectsDashboard({
  projects = [] as ProjectItem[],
  people = [] as any[],
  selectedProjectId,
  onSelectProject,
  onApplyChange,
  onAddSubproject,
  newlyAddedSubprojectId,
  onClearNewSubproject,
  onSubprojectDeleted,
  onColorChange,
  onReorder,
  onDeleteProject,
  pendingDeleteProjectId,
  onConfirmDeleteProject,
  onAddProject,
  onOpenPeople,
  onCreatePerson,
  onTitleChange,
  projectSearch = "",
  filters = [] as string[],
  onToggleFilter = () => { },
}: ProjectsDashboardProps) {

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isFilterActive = (filterType: string) => filters.includes(filterType);

  // thumb configuration helpers ------------------------------------------------
  // the projects tab uses a custom svg asset for the thumb button. the file is
  // stored in the projects app's public assets directory and will be referenced
  // by a URL path. the action value is also given a descriptive name so the host
  // can distinguish it from the generic fab event used by other apps.
  const getThumbIcon = () => {
    // show a different thumb icon when a project is currently selected/being
    // edited; the host already sends the icon URL through origin prefixing.
    return selectedProjectId ? '/assets/add-sub-project.svg' : '/assets/add-project.svg';
  };
  const getThumbAction = () => (selectedProjectId ? 'add-subproject' : 'add-project');

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      try {
        const data = e.data;
        if (data.type == getThumbAction()) {
          // not matching the thumb action should be impossible
          if (selectedProject) {
            onAddSubproject?.(selectedProject.id, '');
          }
          else {
            onAddProject?.();
          }
        }
        else if (data.type === 'get-thumb-config') {
          // reply with our current icon/action
          try {
            window.parent?.postMessage?.(
              { type: 'thumb-config', icon: getThumbIcon(), action: getThumbAction() },
              '*',
            );
          }
          catch (err) {
            console.error('Error posting thumb-config message from ProjectsDashboard:', err);
          }
        }
      } catch (err) {
        console.error('Error handling message event in ProjectsDashboard:', err);
      }
    }

    window.addEventListener('message', onMessage);

    // send our desired configuration as soon as we mount; this guards against a
    // race where the parent asks for config before our listener is attached.
    try {
      window.parent?.postMessage?.(
        { type: 'thumb-config', icon: getThumbIcon(), action: getThumbAction() },
        '*',
      );
    } catch {
      // ignore
    }

    return () => window.removeEventListener('message', onMessage);
  }, [selectedProjectId, selectedProject, onAddProject]);

  // Filter sidebar by search query
  const visibleProjects = useMemo(
    () =>
      !projectSearch.trim()
        ? projects
        : projects.filter((p) =>
          (p.text || "").toLowerCase().includes(projectSearch.toLowerCase()),
        ),
    [projects, projectSearch],
  );

  // ── Metrics: scoped to selected project when one is selected ──────────────

  const scopedTasks = useMemo(() => {
    const source = selectedProject ? [selectedProject] : projects;
    return source.flatMap((p) => (p.subprojects || []).flatMap((s) => s.tasks || []));
  }, [projects, selectedProject]);

  const scopedSubprojects = useMemo(() => {
    const source = selectedProject ? [selectedProject] : projects;
    return source.flatMap((p) =>
      (p.subprojects || []).filter((s) => !s.isProjectLevel),
    );
  }, [projects, selectedProject]);

  const completedTasks = useMemo(() => scopedTasks.filter((t) => t.done).length, [scopedTasks]);
  const completedSubprojects = useMemo(
    () =>
      scopedSubprojects.filter(
        (s) => (s.tasks || []).length > 0 && (s.tasks || []).every((t) => t.done),
      ).length,
    [scopedSubprojects],
  );

  const starredCount = useMemo(
    () => scopedTasks.filter((t) => (t as any).starred || t.favorite).length,
    [scopedTasks],
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scopedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < today).length;
  }, [scopedTasks]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(today.getDate() + 7);
    return scopedTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= today && d <= inSeven;
    }).length;
  }, [scopedTasks]);

  // Clear filter when switching projects
  const handleSelectProject = (id: string | null) => {
    onSelectProject?.(id);
  };

  // Navigate back (deselect project — useful on mobile)
  const handleBack = () => {
    onSelectProject?.(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`projects-dashboard${selectedProject ? " dashboard--has-project" : ""}`}>
      {selectedProject ? (
        /* ── Main body: full-width content for selected project ── */
        <div className="dashboard-body">
          <div className="dashboard-content">
            {/* Sticky project header with inline-editable title */}
            <div className="dashboard-project-header">
              <button
                className="dashboard-back-btn"
                onClick={handleBack}
                title="Back to projects"
                aria-label="Back to projects"
              >
                <span className="material-icons">arrow_back_ios</span>
              </button>
              <span
                className="dashboard-project-dot-lg"
                style={{ background: selectedProject.color || "#1a73e8" }}
              />
              <h2
                className="dashboard-project-title"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newText = e.currentTarget.textContent.trim();
                  if (newText && newText !== selectedProject.text) {
                    onTitleChange?.(selectedProject.id, newText);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              >
                {selectedProject.text}
              </h2>
            </div>

            {/* Summary chips — contextual to selected project */}
            <div className="dashboard-summary">
              <SummaryCard
                icon="folder_copy"
                label="Sub-Projects"
                value={`${completedSubprojects} / ${scopedSubprojects.length}`}
              />
              <SummaryCard
                icon="check_circle"
                label="Completed"
                value={completedTasks}
                accent="success"
                clickable
                active={isFilterActive("completed")}
                onClick={() => onToggleFilter?.("completed")}
              />
              <SummaryCard
                icon="star"
                label="Starred"
                value={starredCount}
                accent="star"
                clickable
                active={isFilterActive("starred")}
                onClick={() => onToggleFilter?.("starred")}
              />
              <SummaryCard
                icon="warning"
                label="Overdue"
                value={overdueCount}
                accent="danger"
                clickable
                active={isFilterActive("overdue")}
                onClick={() => onToggleFilter?.("overdue")}
              />
              <SummaryCard
                icon="upcoming"
                label="Upcoming"
                value={upcomingCount}
                accent="info"
                clickable
                active={isFilterActive("upcoming")}
                onClick={() => onToggleFilter?.("upcoming")}
              />
            </div>

            {/* Project editor (subprojects + tasks) */}
            <ProjectEditor
              key={selectedProject.id}
              project={selectedProject}
              onApplyChange={(updated: Partial<ProjectItem>) =>
                onApplyChange?.(selectedProject.id, updated)
              }
              onAddSubproject={(name: string) => onAddSubproject?.(selectedProject.id, name)}
              newlyAddedSubprojectId={newlyAddedSubprojectId ?? null}
              onClearNewSubproject={onClearNewSubproject ?? (() => { })}
              allPeople={people}
              onOpenPeople={onOpenPeople ?? (() => { })}
              onCreatePerson={onCreatePerson ?? (() => { })}
              onSubprojectDeleted={onSubprojectDeleted ?? (() => { })}
              taskFilters={filters}
              searchQuery={projectSearch}
            />
          </div>
        </div>
      ) : (
        /* ── Home: watermark + direct grid ── */
        <>
          {/* Subtle background watermark */}
          <div className="dashboard-home-bg">
            <span className="material-icons dashboard-home-bg__icon">folder_open</span>
            <p className="dashboard-home-bg__text">
              {projects.length === 0 ? (
                <>No projects yet. Tap <strong>+</strong> to create one.</>
              ) : (
                <>Tap a project to open it, or press <strong>+</strong> to create one.</>
              )}
            </p>
            <div className="dashboard-global-stats">
              <span className="dashboard-stat-chip">
                <span className="material-icons">folder</span>
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
              <span className="dashboard-stat-chip">
                <span className="material-icons">group</span>
                {people.length} contact{people.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Project tiles grid */}
          {visibleProjects.length === 0 && projectSearch ? (
            <p className="sidebar-no-results">
              No matches for &ldquo;{projectSearch}&rdquo;
            </p>
          ) : (
            <div className="dashboard-tiles-grid">
              {visibleProjects.map((p) => (
                <div
                  key={p.id}
                  className="dashboard-tile-wrapper"
                  onClick={() => handleSelectProject(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSelectProject(p.id)}
                >
                  <ProjectTile
                    project={p}
                    onEdit={handleSelectProject}
                    onTitleChange={onTitleChange}
                    onDelete={onDeleteProject}
                    onConfirmDelete={onConfirmDeleteProject}
                    isPendingDelete={pendingDeleteProjectId === p.id}
                    onChangeColor={onColorChange}
                    onReorder={onReorder}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}