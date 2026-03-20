import React, {
  useState,
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
import { ProjectTile, EmptyState } from "@myorg/ui";
// JavaScript components imported for now; they'll be migrated later
import ProjectEditor from "./ProjectEditor";
import AiBlueprintModal from "./AiBlueprintModal";

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
      <div className="dashboard-card__content">
        <span className="dashboard-card__value">{value}</span>
        {label ? <span className="dashboard-card__label">{label}</span> : null}
      </div>
    </div>
  );
}

// ─── Main dashboard component ─────────────────────────────────────────────────

// fully typed props for ProjectsDashboard
interface ProjectsDashboardProps {
  onReprioritize?: (projectId: string) => void;
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
  onOpenColorPicker?: (projectId: string, targetEl: HTMLElement) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  onDeleteProject?: (id: string) => void;
  pendingDeleteProjectId?: string | null;
  onConfirmDeleteProject?: (id: string) => void;
  onAddProject?: () => void;
  onGenerateProject?: (data: any, formData: {goal: string, targetDate: string, context: string}) => Promise<void>;
  onEnhanceProject?: (projectId: string, data: any, formData: {goal: string, targetDate: string, context: string}) => Promise<void>;
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
  onOpenColorPicker,
  onReorder,
  onDeleteProject,
  pendingDeleteProjectId,
  onConfirmDeleteProject,
  onAddProject,
  onGenerateProject,
  onEnhanceProject,
  onOpenPeople,
  onCreatePerson,
  onTitleChange,
  onReprioritize,
  projectSearch = "",
  filters = [] as string[],
  onToggleFilter = () => { },
}: ProjectsDashboardProps) {

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isFilterActive = (filterType: string) => filters.includes(filterType);

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

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
      if (t.done || !t.dueDate) return false;
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
            {/* Project editor (subprojects + tasks) */}
            <ProjectEditor
              dashboardProjectHeaderTop={
                <>
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
                </>
              }
              onToggleFilter={onToggleFilter}
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
          {/* Home watermark removed */}

          {/* Project tiles grid */}
          {visibleProjects.length === 0 ? (
            projectSearch ? (
              <p className="sidebar-no-results">
                No matches for &ldquo;{projectSearch}&rdquo;
              </p>
            ) : (
              <div className="dashboard-watermark empty-watermark">
                <EmptyState
                  icon="folder_open"
                  title="No projects yet"
                  description="Create your first project to start organizing your tasks"
                />
              </div>
            )
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
                    onOpenColorPicker={onOpenColorPicker}
                    onReorder={onReorder}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(onAddProject || onAddSubproject) && (
        <div className="fab-container">
          {isFabMenuOpen && (
            <div
              className="fab-menu"
            >
              <button
                className="fab-menu-item"
                onClick={() => {
                  setIsFabMenuOpen(false);
                  if (selectedProject) {
                    onAddSubproject?.(selectedProject.id, '');
                  } else {
                    onAddProject?.();
                  }
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px', color: '#666' }}>
                  add
                </span>
                {selectedProject ? 'Create Subproject' : 'Create Project'}
              </button>

              {selectedProject && onReprioritize && (
                <button
                  className="fab-menu-item"
                  onClick={() => {
                    setIsFabMenuOpen(false);
                    onReprioritize(selectedProject.id);
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '18px', color: '#666' }}>
                    sort
                  </span>
                  Sort By Timeline
                </button>
              )}

              <button
                className="fab-menu-item"
                onClick={() => {
                  setIsFabMenuOpen(false);
                  setShowAiModal(true);
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px', color: '#666' }}>
                  psychology
                </span>
                {selectedProject ? 'Enhance with AI' : 'Create with AI'}
              </button>
            </div>
          )}

          {isFabMenuOpen && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 100,
              }}
              onClick={() => setIsFabMenuOpen(false)}
            />
          )}

          <button
            type="button"
            className="content-fab"
            aria-label={isFabMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
            style={{ zIndex: 102 }}
          >
            <span className="material-icons">{isFabMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      )}

      {showAiModal && (
        <AiBlueprintModal 
          onClose={() => setShowAiModal(false)}
          onConfirm={async (data, formData) => {
            if (selectedProject) {
              await onEnhanceProject?.(selectedProject.id, data, formData);
            } else {
              await onGenerateProject?.(data, formData);
            }
          }}
          isForExistingProject={!!selectedProject}
          {...(selectedProject ? {
            existingSubprojects: selectedProject.subprojects,
            initialValues: {
              goal: `${selectedProject.goal || ''}\n\n${selectedProject.description || ''}`.trim(),
              targetDate: selectedProject.dueDate || '',
              context: selectedProject.aiInstructions || '',
            }
          } : {})}
        />
      )}
    </div>
  );
}