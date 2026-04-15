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
import ProjectAssistant from "./ProjectAssistant";

// Helper function to convert hex color to RGB string
function hexToRgb(hex: string | undefined): string {
  if (!hex) return "26, 115, 232"; // default blue
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "26, 115, 232"; // default blue
  return `${parseInt(result[1]!, 16)}, ${parseInt(result[2]!, 16)}, ${parseInt(result[3]!, 16)}`;
}

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
  onOpenPeople,
  onCreatePerson,
  onTitleChange,
  projectSearch = "",
  filters = [] as string[],
  onToggleFilter = () => { },
}: ProjectsDashboardProps) {

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isFilterActive = (filterType: string) => filters.includes(filterType);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Open assistant when thumb button is pressed (global event)
  useEffect(() => {
    const handler = () => {
      setIsAssistantOpen(true);
    };
    window.addEventListener('open-project-assistant', handler as EventListener);
    return () => window.removeEventListener('open-project-assistant', handler as EventListener);
  }, []);

  // Handle add project from the thumb button
  useEffect(() => {
    const handleAdd = () => {
      if (selectedProject) {
        onAddSubproject?.(selectedProject.id, '');
      } else {
        onAddProject?.();
      }
    };
    window.addEventListener('framework-action-add-project', handleAdd);
    return () => window.removeEventListener('framework-action-add-project', handleAdd);
  }, [selectedProject, onAddSubproject, onAddProject]);

  // Notify thumb that project editor is open/closed so it can show the assistant glyph
  useEffect(() => {
    try {
      if (selectedProject) {
        window.dispatchEvent(new CustomEvent('project-editor-open'));
      } else {
        window.dispatchEvent(new CustomEvent('project-editor-close'));
      }
    } catch (e) {
      // ignore
    }
    // also ensure we close on unmount
    return () => {
      try { window.dispatchEvent(new CustomEvent('project-editor-close')); } catch (e) {}
    };
  }, [selectedProject]);

  

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
                <div 
                  className="dashboard-project-header-modern"
                  style={{
                    '--project-color': selectedProject.color || "#1a73e8",
                    '--project-color-rgb': hexToRgb(selectedProject.color || "#1a73e8")
                  } as React.CSSProperties}
                >
                  <div className="dashboard-project-header-main">
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
                  <div className="dashboard-summary dashboard-project-header-summary">
                    <SummaryCard
                      icon="check_circle"
                      label="Completed"
                      value={completedTasks}
                      accent="success"
                      clickable
                      active={filters.includes('completed')}
                      onClick={() => onToggleFilter?.('completed')}
                    />
                    <SummaryCard
                      icon="star"
                      label="Starred"
                      value={starredCount}
                      accent="star"
                      clickable
                      active={filters.includes('starred')}
                      onClick={() => onToggleFilter?.('starred')}
                    />
                    <SummaryCard
                      icon="warning"
                      label="Overdue"
                      value={overdueCount}
                      accent="danger"
                      clickable
                      active={filters.includes('overdue')}
                      onClick={() => onToggleFilter?.('overdue')}
                    />
                    <SummaryCard
                      icon="upcoming"
                      label="Upcoming"
                      value={upcomingCount}
                      accent="info"
                      clickable
                      active={filters.includes('upcoming')}
                      onClick={() => onToggleFilter?.('upcoming')}
                    />
                  </div>
                </div>
              }
              onToggleFilter={onToggleFilter}
              key={selectedProject.id}
              project={selectedProject}
              onExport={() => {
                const exportObj = buildProjectExport(selectedProject, people);
                const safeName = (exportObj.name || 'project').replace(/[^a-z0-9_\-]/gi, '_');
                downloadJSON(exportObj, `${safeName}_export.json`);
              }}
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
            {/* Floating AI assistant FAB (project editor) */}
            <button
              type="button"
              className="project-ai-fab"
              aria-label="Open AI assistant"
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent('open-project-assistant'));
                } catch (e) {}
                setIsAssistantOpen(true);
              }}
            >
              <span className="material-icons">auto_awesome</span>
            </button>
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

      {isAssistantOpen && selectedProject && (
        <ProjectAssistant
          projectExport={buildProjectExport(selectedProject, people)}
          onClose={() => {
            setIsAssistantOpen(false);
            try { window.dispatchEvent(new CustomEvent('close-project-assistant')); } catch (e) {}
          }}
          onApplyChange={onApplyChange}
          project={selectedProject}
          onAddSubproject={(title: string) => onAddSubproject?.(selectedProject.id, title)}
        />
      )}

    </div>
  );
}

// Build a complete, LLM-friendly export object from a ProjectItem
function buildProjectExport(proj: ProjectItem | any, people: any[] = []) {
  const { subprojects: _sub, id: _id, ...rest } = proj as any;
  // Strip any remaining id-like keys from metadata to prevent leaking internal identifiers
  const { id: _mid, userId: _uid, ...safeMetadata } = rest as any;

  return {
    name: proj.text ?? proj.title ?? '',
    color: proj.color ?? null,
    metadata: safeMetadata,
    sub_projects: (proj.subprojects || []).map((s: any) => ({
      title: s.title ?? s.text ?? '',
      isProjectLevel: !!s.isProjectLevel,
      description: s.description ?? null,
      color: s.color ?? null,
      owners: (s.owners ?? []).map((o: any) => ({ name: o?.name ?? String(o) })),
      tasks: (s.tasks || []).map((t: any) => ({
        description: t.description ?? t.text ?? '',
        effort: t.effort ?? null,
        dueDate: t.dueDate ?? null,
        done: !!t.done,
        favorite: (t as any).favorite ?? null,
        people: ((t as any).people ?? []).map((p: any) => ({ name: p?.name ?? String(p) })),
      }))
    })),
    people: (people || []).map((p: any) => ({ name: p?.name ?? p?.text ?? String(p) })),
    exportedAt: new Date().toISOString(),
    source: 'FOMOLife export v1',
  };
}

function downloadJSON(obj: any, filename = 'export.json') {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}