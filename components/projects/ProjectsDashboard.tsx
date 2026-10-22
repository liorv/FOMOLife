import React, {
  useState,
  useMemo,
  useRef,
  KeyboardEvent,
  useEffect,
} from "react";
import type {
  ProjectItem,
  ProjectSubproject,
  ProjectTask,
} from "@myorg/types";
import { ProjectTile, ProjectLink, EmptyState } from "@myorg/ui";
// JavaScript components imported for now; they'll be migrated later
import ProjectEditor from "./ProjectEditor";
import ProjectAssistant from "./ProjectAssistant";
import DismissibleHint from "../DismissibleHint";
import { validateProjectImportJson, type ValidatedImportProject } from "@/lib/projects/importProject";
import { advanceRecurringTask } from "@/lib/tasks/recurrence";
import { TemplateLibrary, TemplateDialog, type TemplateAction } from "./ProjectTemplates";
import templateStyles from "./ProjectTemplates.module.css";

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
  selectedTaskId?: string | null;
  onSelectProject?: (id: string | null) => void;
  onApplyChange?: (projectId: string, updated: Partial<ProjectItem>) => void;
  onAddSubproject?: (projectId: string, name: string) => void;
  newlyAddedSubprojectId?: string | null;
  onClearNewSubproject?: () => void;
  onSubprojectDeleted?: (payload: { projectId: string; subproject: any; index: number }) => void;
  onConvertSubprojectToProject?: (projectId: string, subprojectId: string) => void;
  onColorChange?: (projectId: string, color: string) => void;
  onOpenColorPicker?: (projectId: string, targetEl: HTMLElement) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  onDeleteProject?: (id: string) => void;
  pendingDeleteProjectId?: string | null;
  onConfirmDeleteProject?: (id: string) => void;
  onAddProject?: () => void;
  onCreateTemplate?: (name: string) => Promise<void>;
  onUseTemplate?: (templateId: string, name: string) => Promise<void>;
  onConvertTemplate?: (projectId: string, isTemplate: boolean) => Promise<void>;
  onImportProject?: (projectId: string, subprojects: ProjectSubproject[]) => void;
  onOpenPeople?: () => void;
  onCreatePerson?: (name: string) => void;
  onTitleChange?: (projectId: string, title: string) => void;
  projectSearch?: string;
  filters?: string[];
  onToggleFilter?: (filter: string | null) => void;
  currentUserId?: string;
  onInviteMember?: (projectId: string, member: import('@myorg/types').ProjectMember) => void;
  onRemoveMember?: (projectId: string, userId: string) => void;
  onLeave?: (projectId: string) => void;
  onOpenProjectThread?: (project: ProjectItem) => void;
  onOpenTaskThread?: (task: ProjectTask, project: ProjectItem) => void;
  onArchiveProject?: (projectId: string, archived: boolean) => void;
}

type ProjectView = "cards" | "list" | "compact";
const PROJECT_VIEW_STORAGE_KEY = "fomo:projects:view";

function isProjectView(value: string | null): value is ProjectView {
  return value === "cards" || value === "list" || value === "compact";
}

export default function ProjectsDashboard({
  projects = [] as ProjectItem[],
  people = [] as any[],
  selectedProjectId,
  selectedTaskId,
  onSelectProject,
  onApplyChange,
  onAddSubproject,
  newlyAddedSubprojectId,
  onClearNewSubproject,
  onSubprojectDeleted,
  onConvertSubprojectToProject,
  onColorChange,
  onOpenColorPicker,
  onReorder,
  onDeleteProject,
  pendingDeleteProjectId,
  onConfirmDeleteProject,
  onAddProject,
  onCreateTemplate,
  onUseTemplate,
  onConvertTemplate,
  onImportProject,
  onOpenPeople,
  onCreatePerson,
  onTitleChange,
  projectSearch = "",
  filters = [] as string[],
  onToggleFilter = () => { },
  currentUserId = '',
  onInviteMember,
  onRemoveMember,
  onLeave,
  onOpenProjectThread,
  onOpenTaskThread,
  onArchiveProject,
}: ProjectsDashboardProps) {

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const taskFilterCount = filters.filter((filter) => filter !== 'hide_completed').length;

  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [projectView, setProjectView] = useState<ProjectView>("cards");
  const [templateAction, setTemplateAction] = useState<TemplateAction | null>(null);
  const templates = useMemo(() => projects.filter(project => project.isTemplate), [projects]);
  useEffect(() => {
    try {
      const savedView = localStorage.getItem(PROJECT_VIEW_STORAGE_KEY);
      if (isProjectView(savedView)) {
        setProjectView(savedView);
      }
    } catch {
      // Keep the default view when browser storage is unavailable.
    }
  }, []);

  const selectProjectView = (view: ProjectView) => {
    setProjectView(view);
    try {
      localStorage.setItem(PROJECT_VIEW_STORAGE_KEY, view);
    } catch {
      // The selected view still applies for this session if storage is unavailable.
    }
  };

  const visibleProjects = useMemo(
    () => projects.filter((p) => !p.isTemplate && (showArchived ? !!p.archived : !p.archived)),
    [projects, showArchived],
  );
  const archivedCount = useMemo(() => projects.filter((p) => !p.isTemplate && p.archived).length, [projects]);
  // Switch back to the active view once the archived tab becomes empty (e.g. restoring the last archived project)
  useEffect(() => {
    if (showArchived && archivedCount === 0) {
      setShowArchived(false);
    }
  }, [showArchived, archivedCount]);
  const collapseAllRef = useRef<(() => void) | null>(null);
  const expandAllRef = useRef<(() => void) | null>(null);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  const [llmUnavailableMsg, setLlmUnavailableMsg] = useState('');
  const [llmProvider, setLlmProvider] = useState<string | null>(null);
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({});

  // Fetch thread comment counts when project changes
  useEffect(() => {
    if (!selectedProjectId) { setThreadCounts({}); return; }
    fetch(`/api/projects/thread-counts?projectId=${encodeURIComponent(selectedProjectId)}`)
      .then((r) => r.ok ? r.json() : { counts: {} })
      .then((data) => setThreadCounts(data.counts ?? {}))
      .catch(() => setThreadCounts({}));
  }, [selectedProjectId]);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => {
        setLlmAvailable(data.available !== false);
        setLlmUnavailableMsg(data.message || '');
        setLlmProvider(data.provider || null);
      })
      .catch(() => {
        setLlmAvailable(false);
        setLlmUnavailableMsg('Could not reach AI service.');
      });
  }, []);

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
        if (showTemplates && onCreateTemplate) setTemplateAction({ kind: 'create' });
        else onAddProject?.();
      }
    };
    window.addEventListener('framework-action-add-project', handleAdd);
    return () => window.removeEventListener('framework-action-add-project', handleAdd);
  }, [selectedProject, onAddSubproject, onAddProject, showTemplates, onCreateTemplate]);

  // Notify thumb that project editor is open/closed so it can show the assistant glyph
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(selectedProject ? 'project-editor-open' : 'project-editor-close'));
    // also ensure we close on unmount
    return () => {
      window.dispatchEvent(new CustomEvent('project-editor-close'));
    };
  }, [selectedProject]);

  

  // ── Combined search results (projects + tasks) ────────────────────────────

  type SearchResultItem =
    | { kind: "project"; project: ProjectItem }
    | { kind: "task"; task: ProjectTask; subproject: ProjectSubproject; project: ProjectItem };

  const searchResults = useMemo<SearchResultItem[] | null>(() => {
    const q = projectSearch.trim();
    if (!q) return null;
    const ql = q.toLowerCase();
    const results: SearchResultItem[] = [];
    for (const p of projects) {
      const projectMatches = (p.text || "").toLowerCase().includes(ql);
      const matchingTasks: { task: ProjectTask; subproject: ProjectSubproject }[] = [];
      for (const sub of p.subprojects || []) {
        for (const task of sub.tasks || []) {
          if ((task.text || "").toLowerCase().includes(ql)) {
            matchingTasks.push({ task, subproject: sub });
          }
        }
      }
      if (projectMatches) {
        results.push({ kind: "project", project: p });
      }
      for (const { task, subproject } of matchingTasks) {
        results.push({ kind: "task", task, subproject, project: p });
      }
    }
    return results;
  }, [projects, projectSearch]);

  // ── Task mutation helpers (used in combined search results) ───────────────

  const updateTaskInProject = (
    project: ProjectItem,
    subprojectId: string,
    taskId: string,
    patch: Partial<ProjectTask>,
  ) => {
    const currentTask = (project.subprojects || [])
      .find((sub) => sub.id === subprojectId)?.tasks.find((task) => task.id === taskId);
    const completesTask = patch.done === true && currentTask?.done === false;
    const completedAt = new Date();
    const updatedSubs = (project.subprojects || []).map((sub) =>
      sub.id === subprojectId
        ? {
            ...sub,
            tasks: (sub.tasks || []).map((task) => {
              if (task.id !== taskId) return task;
              const updated = {
                ...task,
                ...patch,
              };
              if (!completesTask) return updated;
              if (updated.recurrence) return advanceRecurringTask(updated, completedAt) ?? updated;
              return { ...updated, completedAt: completedAt.toISOString() };
            }),
          }
        : sub,
    );
    onApplyChange?.(project.id, { subprojects: updatedSubs });
  };

  const deleteTaskFromProject = (
    project: ProjectItem,
    subprojectId: string,
    taskId: string,
  ) => {
    const updatedSubs = (project.subprojects || []).map((sub) =>
      sub.id === subprojectId
        ? { ...sub, tasks: (sub.tasks || []).filter((t) => t.id !== taskId) }
        : sub,
    );
    onApplyChange?.(project.id, { subprojects: updatedSubs });
  };

  // Tracks which search-result task rows are expanded or being renamed
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [leaveArmed, setLeaveArmed] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Import Project modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ data: ValidatedImportProject; stats: { subprojectCount: number; taskCount: number } } | null>(null);

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportJsonText("");
    setImportError(null);
    setImportPreview(null);
  };

  const handleImportFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setImportJsonText(text);
      setImportError(null);
      setImportPreview(null);
    };
    reader.readAsText(file);
  };

  const handlePreviewImport = () => {
    const result = validateProjectImportJson(importJsonText);
    if (!result.ok || !result.data || !result.stats) {
      setImportError(result.error ?? "Invalid project JSON.");
      setImportPreview(null);
      return;
    }
    setImportError(null);
    setImportPreview({ data: result.data, stats: result.stats });
  };

  const handleConfirmImport = () => {
    if (!importPreview || !selectedProject) return;
    onImportProject?.(selectedProject.id, importPreview.data.subprojects);
    closeImportModal();
  };

  // ── Metrics: scoped to selected project when one is selected ──────────────

  const scopedTasks = useMemo(() => {
    const source = selectedProject ? [selectedProject] : visibleProjects;
    return source.flatMap((p) => (p.subprojects || []).flatMap((s) => s.tasks || []));
  }, [visibleProjects, selectedProject]);

  const completedTasks = useMemo(() => scopedTasks.filter((t) => t.done).length, [scopedTasks]);

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

  const assignedToMeCount = useMemo(() => {
    if (!currentUserId) return 0;
    const currentUserName = projects.flatMap(p => p.members || []).find(m => m.userId === currentUserId)?.name;
    if (!currentUserName) return 0;
    return scopedTasks.filter(t => t.people?.some(p => p.name === currentUserName)).length;
  }, [scopedTasks, projects, currentUserId]);


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
              targetTaskId={selectedTaskId ?? null}
              dashboardProjectHeaderTop={
                <div 
                  className="dashboard-project-header-modern"
                  style={{
                    '--project-color': selectedProject.color || "#1a73e8",
                    '--project-color-rgb': hexToRgb(selectedProject.color || "#1a73e8")
                  } as React.CSSProperties}
                >
                  {selectedProject.isTemplate && (
                    <div className={templateStyles.banner}>
                      <span className="material-icons" aria-hidden="true">dashboard_customize</span>
                      <p><strong>Template</strong> &middot; Changes here apply to future projects, not existing copies.</p>
                      {onUseTemplate && <button type="button" className={templateStyles.primaryButton} onClick={() => setTemplateAction({ kind: 'use', project: selectedProject })}>Use template</button>}
                    </div>
                  )}
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
                      className={`dashboard-project-title${selectedProject.externalUrl ? ' dashboard-project-title--linked' : ''}`}
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={(e) => {
                        // Select all text when focusing
                        const range = document.createRange();
                        range.selectNodeContents(e.currentTarget);
                        const selection = window.getSelection();
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                      }}
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
                    <ProjectLink url={selectedProject.externalUrl} projectName={selectedProject.text} />
                  </div>
                </div>
              }
              taskFilterPanel={showFilters && (
                    <div className="project-actions-bar project-filter-bar">
                      <button
                        className="project-action-btn project-action-btn--close-filters"
                        onClick={() => { setShowFilters(false); onToggleFilter?.(null); }}
                        title="Close filters"
                      >
                        <span className="material-icons">close</span>
                      </button>
                      <SummaryCard
                        icon="person"
                        label="Assigned"
                        value={assignedToMeCount}
                        accent="primary"
                        clickable
                        active={filters.includes('assigned_to_me')}
                        onClick={() => onToggleFilter?.('assigned_to_me')}
                      />
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
              )}
              taskToolbar={
                <>
                      <button
                        className={`project-action-btn${taskFilterCount > 0 ? ' project-action-btn--active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        title="Filter tasks"
                        aria-label={`Filter tasks${taskFilterCount > 0 ? ` (${taskFilterCount} active)` : ''}`}
                        aria-expanded={showFilters}
                      >
                        <span className="material-icons" aria-hidden="true">filter_list</span>
                        <span>Filter{taskFilterCount > 0 ? ` (${taskFilterCount})` : ''}</span>
                      </button>
                      {onOpenProjectThread && (
                      <button
                        className={`project-action-btn${(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? ' project-action-btn--has-messages' : ''}`}
                        title={`Project conversation${(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? ` (${threadCounts[`proj:${selectedProject.id}`]} messages)` : ''}`}
                        aria-label="Project conversation"
                        onClick={() => onOpenProjectThread?.(selectedProject)}
                      >
                        <span className="material-icons" aria-hidden="true">{(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? 'forum' : 'chat_bubble_outline'}</span>
                        <span>Chat{(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? ` (${threadCounts[`proj:${selectedProject.id}`]})` : ''}</span>
                      </button>
                      )}
                </>
              }
              projectActions={
                <>
                      <hr />
                      {onConvertTemplate && (
                        <button
                          type="button"
                          onClick={() => setTemplateAction({ kind: selectedProject.isTemplate ? 'restore' : 'convert', project: selectedProject })}
                        >
                          <span className="material-icons" aria-hidden="true">{selectedProject.isTemplate ? 'folder_open' : 'dashboard_customize'}</span>
                          {selectedProject.isTemplate ? 'Convert to project' : 'Convert to template'}
                        </button>
                      )}
                      <button
                        title="Export JSON"
                        onClick={() => {
                          const exportObj = buildProjectExport(selectedProject, people);
                          const safeName = (exportObj.name || 'project').replace(/[^a-z0-9_-]/gi, '_');
                          downloadJSON(exportObj, `${safeName}_export.json`);
                        }}
                      >
                        <span className="material-icons" aria-hidden="true">download</span>
                        <span>Export</span>
                      </button>
                      {onImportProject && <button
                        title="Import sub-projects from JSON into this project"
                        onClick={() => setShowImportModal(true)}
                      >
                        <span className="material-icons" aria-hidden="true">upload</span>
                        <span>Import sub-projects</span>
                      </button>}
                      {(()  => {
                        const members = selectedProject.members ?? [];
                        const isCurrentUserMember = currentUserId && members.some((m) => m.userId === currentUserId);
                        const canLeave = isCurrentUserMember && onRemoveMember;
                        return canLeave ? (
                          <button
                            data-keep-open={!leaveArmed ? '' : undefined}
                            className={`project-action-btn--leave${leaveArmed ? " project-action-btn--leave-armed" : ""}`}
                            title={leaveArmed ? "Click again to confirm" : "Leave project"}
                            onClick={() => {
                              if (!leaveArmed) {
                                setLeaveArmed(true);
                                leaveTimerRef.current = setTimeout(() => setLeaveArmed(false), 3000);
                              } else {
                                if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                                setLeaveArmed(false);
                                onRemoveMember?.(selectedProject.id, currentUserId);
                              }
                            }}
                            onBlur={() => {
                              if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                              setLeaveArmed(false);
                            }}
                          >
                            <span className="material-icons" aria-hidden="true">{leaveArmed ? "warning" : "logout"}</span>
                            <span>{leaveArmed ? "Confirm Leave?" : "Leave"}</span>
                          </button>
                        ) : null;
                      })()}
                </>
              }
              onToggleFilter={onToggleFilter}
              key={selectedProject.id}
              project={selectedProject}
              onApplyChange={(updated: Partial<ProjectItem>) =>
                onApplyChange?.(selectedProject.id, updated)
              }
              {...(onArchiveProject && !selectedProject.isTemplate ? {
                onArchiveToggle: (archived: boolean) => onArchiveProject(selectedProject.id, archived),
              } : {})}
              onAddSubproject={(name: string) => onAddSubproject?.(selectedProject.id, name)}
              newlyAddedSubprojectId={newlyAddedSubprojectId ?? null}
              onClearNewSubproject={onClearNewSubproject ?? (() => { })}
              allPeople={people}
              onOpenPeople={onOpenPeople ?? (() => { })}
              onCreatePerson={onCreatePerson ?? (() => { })}
              onSubprojectDeleted={onSubprojectDeleted ?? (() => { })}
              onConvertSubprojectToProject={(subprojectId) =>
                onConvertSubprojectToProject?.(selectedProject.id, subprojectId)
              }
              taskFilters={filters}
              searchQuery={projectSearch}
              currentUserId={currentUserId}
              onInviteMember={(member) => onInviteMember?.(selectedProject.id, member)}
              onRemoveMember={(userId) => onRemoveMember?.(selectedProject.id, userId)}
              collapseAllRef={collapseAllRef}
              expandAllRef={expandAllRef}
              {...(onOpenTaskThread ? { onTaskChatClick: (task: ProjectTask) => onOpenTaskThread(task, selectedProject) } : {})}
              {...(Object.keys(threadCounts).length > 0 ? {
                taskCommentCounts: Object.fromEntries(
                  Object.entries(threadCounts)
                    .filter(([k, v]) => k.startsWith('task:') && v > 0)
                    .map(([k, v]) => {
                      // key format: "task:{projectId}:{taskId}"
                      const parts = k.split(':');
                      return [parts.slice(2).join(':'), v];
                    })
                )
              } : {})}
            />
            {/* Floating AI assistant FAB (project editor) */}
            <button
              type="button"
              className={`project-ai-fab${llmAvailable === false ? ' project-ai-fab--unavailable' : ''}`}
              aria-label="Open AI assistant"
              disabled={llmAvailable === false}
              title={llmAvailable === false ? (llmUnavailableMsg || 'AI assistant unavailable') : 'AI assistant'}
              onClick={() => {
                if (llmAvailable === false) return;
                window.dispatchEvent(new CustomEvent('open-project-assistant'));
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
          <div className={templateStyles.toolbar}>
            <div className={templateStyles.tabs} role="group" aria-label="Project views">
              <button type="button" className={templateStyles.tab} aria-pressed={!showTemplates} onClick={() => setShowTemplates(false)}>
                <span className="material-icons" aria-hidden="true">folder_open</span>Projects
              </button>
              <button type="button" className={templateStyles.tab} aria-pressed={showTemplates} onClick={() => setShowTemplates(true)}>
                <span className="material-icons" aria-hidden="true">dashboard_customize</span>Templates ({templates.length})
              </button>
            </div>
            <div className={templateStyles.toolbarActions}>
              {!showTemplates && (
                <div className={templateStyles.viewSwitcher} role="group" aria-label="Project layout">
                  <button
                    type="button"
                    className={templateStyles.viewButton}
                    aria-label="Cards view"
                    title="Cards view"
                    aria-pressed={projectView === "cards"}
                    onClick={() => selectProjectView("cards")}
                  >
                    <span className="material-icons" aria-hidden="true">dashboard</span>
                  </button>
                  <button
                    type="button"
                    className={templateStyles.viewButton}
                    aria-label="List view"
                    title="List view"
                    aria-pressed={projectView === "list"}
                    onClick={() => selectProjectView("list")}
                  >
                    <span className="material-icons" aria-hidden="true">view_list</span>
                  </button>
                  <button
                    type="button"
                    className={templateStyles.viewButton}
                    aria-label="Compact view"
                    title="Compact view"
                    aria-pressed={projectView === "compact"}
                    onClick={() => selectProjectView("compact")}
                  >
                    <span className="material-icons" aria-hidden="true">grid_view</span>
                  </button>
                </div>
              )}
              {!showTemplates && onAddProject && <button type="button" className={templateStyles.primaryButton} onClick={onAddProject}>
                <span className="material-icons" aria-hidden="true">add</span>New project
              </button>}
              {showTemplates && onCreateTemplate && <button type="button" className={templateStyles.primaryButton} onClick={() => setTemplateAction({ kind: 'create' })}>
                <span className="material-icons" aria-hidden="true">add</span>New template
              </button>}
            </div>
          </div>
          {/* Home watermark removed */}

          {/* Combined search results (projects + tasks) */}
          {showTemplates ? (
            <TemplateLibrary templates={templates} onEdit={handleSelectProject} onUse={onUseTemplate ? project => setTemplateAction({ kind: 'use', project }) : undefined} />
          ) : searchResults !== null ? (
            searchResults.length === 0 ? (
              <p className="sidebar-no-results">
                No matches for &ldquo;{projectSearch}&rdquo;
              </p>
            ) : (
              <div className="search-results-list">
                {searchResults.map((item) => {
                  if (item.kind === "project") {
                    const { project: p } = item;
                    return (
                      <div
                        key={`proj-${p.id}`}
                        className="search-result-row search-result-row--project"
                        onClick={() => handleSelectProject(p.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSelectProject(p.id)}
                      >
                        <span
                          className="search-result-dot"
                          style={{ background: p.color || "#1a73e8" }}
                        />
                        <span className="search-result-text">{p.text}</span>
                        <span className="search-result-badge">Project</span>
                        <span className="material-icons search-result-chevron">chevron_right</span>
                      </div>
                    );
                  }
                  // task row
                  const { task, subproject, project: p } = item;
                  const isExpanded = expandedTaskIds.has(task.id);
                  const isRenaming = renamingTaskId === task.id;
                  return (
                    <div key={`task-${task.id}`} className={`search-result-row search-result-row--task${task.done ? " search-result-row--done" : ""}`}>
                      {/* Complete toggle */}
                      <button
                        className="search-result-check"
                        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                        title={task.done ? "Mark incomplete" : "Mark complete"}
                        onClick={() => updateTaskInProject(p, subproject.id, task.id, { done: !task.done })}
                      >
                        <span className="material-icons">
                          {task.done ? "check_circle" : "radio_button_unchecked"}
                        </span>
                      </button>

                      {/* Task text / rename input */}
                      <div className="search-result-body">
                        {isRenaming ? (
                          <input
                            className="search-result-rename-input"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (renameValue.trim()) {
                                  updateTaskInProject(p, subproject.id, task.id, { text: renameValue.trim() });
                                }
                                setRenamingTaskId(null);
                              } else if (e.key === "Escape") {
                                setRenamingTaskId(null);
                              }
                            }}
                            onBlur={() => {
                              if (renameValue.trim()) {
                                updateTaskInProject(p, subproject.id, task.id, { text: renameValue.trim() });
                              }
                              setRenamingTaskId(null);
                            }}
                          />
                        ) : (
                          <span className="search-result-task-text">{task.text}</span>
                        )}
                        <span className="search-result-meta">
                          <span
                            className="search-result-dot search-result-dot--sm"
                            style={{ background: p.color || "#1a73e8" }}
                          />
                          {p.text}
                          {!subproject.isProjectLevel && (
                            <span className="search-result-meta-sep"> › {subproject.text}</span>
                          )}
                          {task.dueDate && (
                            <span className="search-result-due">
                              · due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                        {/* Expanded description */}
                        {isExpanded && task.description && (
                          <p className="search-result-description">{task.description}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="search-result-actions">
                        {/* Rename */}
                        <button
                          className="search-result-action-btn"
                          aria-label="Rename task"
                          title="Rename"
                          onClick={() => {
                            setRenameValue(task.text);
                            setRenamingTaskId(task.id);
                          }}
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        {/* Expand (show details) */}
                        <button
                          className="search-result-action-btn"
                          aria-label={isExpanded ? "Collapse task" : "Expand task"}
                          title={isExpanded ? "Collapse" : "Expand"}
                          onClick={() =>
                            setExpandedTaskIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(task.id)) next.delete(task.id);
                              else next.add(task.id);
                              return next;
                            })
                          }
                        >
                          <span className="material-icons">
                            {isExpanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                        {/* Go to project */}
                        <button
                          className="search-result-action-btn"
                          aria-label="Open in project"
                          title="Open project"
                          onClick={() => handleSelectProject(p.id)}
                        >
                          <span className="material-icons">open_in_new</span>
                        </button>
                        {/* Delete */}
                        <button
                          className="search-result-action-btn search-result-action-btn--danger"
                          aria-label="Delete task"
                          title="Delete task"
                          onClick={() => deleteTaskFromProject(p, subproject.id, task.id)}
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* No active search — show tile grid */
            projects.length === 0 ? (
              <div className="dashboard-watermark empty-watermark">
                <EmptyState
                  icon="folder_open"
                  title="No projects yet"
                  description="Create your first project to start organizing your tasks"
                />
              </div>
            ) : (
              <>
                <div className="dashboard-drag-hint-row">
                  {visibleProjects.length > 0 && (
                    <DismissibleHint
                      storageKey="project-swipe-actions-hint-dismissed"
                      direction="left"
                      lines={['Swipe left for actions']}
                    />
                  )}
                  <DismissibleHint
                    storageKey="project-drag-reorder-hint-dismissed"
                    direction="down"
                    lines={['drag a project 2 reorder']}
                  />
                </div>
                {archivedCount > 0 && (
                  <div className="project-archive-tabs">
                    <button
                      className={`project-archive-tab${!showArchived ? ' project-archive-tab--active' : ''}`}
                      onClick={() => setShowArchived(false)}
                    >
                      Active
                    </button>
                    <button
                      className={`project-archive-tab${showArchived ? ' project-archive-tab--active' : ''}`}
                      onClick={() => setShowArchived(true)}
                    >
                      Archived ({archivedCount})
                    </button>
                  </div>
                )}
                {visibleProjects.length === 0 ? (
                  <div className="dashboard-watermark empty-watermark">
                    <EmptyState
                      icon={showArchived ? "archive" : "folder_open"}
                      title={showArchived ? "No archived projects" : "No active projects"}
                      description={
                        showArchived
                          ? "Projects you mark complete will show up here."
                          : "Create a new project or use a template. Archived projects can be restored from the Archived tab."
                      }
                    />
                  </div>
                ) : (
                <div className={`dashboard-tiles-grid dashboard-tiles-grid--${projectView}`}>
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
                        {...(onApplyChange ? {
                          onExternalUrlChange: (id: string, externalUrl: string) => onApplyChange(id, { externalUrl }),
                        } : {})}
                        onDelete={onDeleteProject}
                        onConfirmDelete={onConfirmDeleteProject}
                        isPendingDelete={pendingDeleteProjectId === p.id}
                        onChangeColor={onColorChange}
                        onOpenColorPicker={onOpenColorPicker}
                        onReorder={onReorder}
                        currentUserId={currentUserId}
                        onLeave={onLeave ? () => onLeave(p.id) : undefined}
                        {...(onArchiveProject ? { onArchiveToggle: onArchiveProject } : {})}
                      />
                    </div>
                  ))}
                </div>
                )}
              </>
            )
          )}
        </>
      )}

      {templateAction && (
        <TemplateDialog
          action={templateAction}
          onClose={() => setTemplateAction(null)}
          onConfirm={async name => {
            if (templateAction.kind === 'create' && onCreateTemplate) {
              await onCreateTemplate(name);
            } else if (templateAction.kind === 'use' && onUseTemplate) {
              await onUseTemplate(templateAction.project.id, name);
              setShowTemplates(false);
            } else if ((templateAction.kind === 'convert' || templateAction.kind === 'restore') && onConvertTemplate) {
              await onConvertTemplate(templateAction.project.id, templateAction.kind === 'convert');
              setShowTemplates(templateAction.kind === 'convert');
            } else {
              throw new Error('This template action is not available.');
            }
          }}
        />
      )}

      {isAssistantOpen && selectedProject && (
        <ProjectAssistant
          projectExport={buildAIContext(selectedProject, people)}
          onClose={() => {
            setIsAssistantOpen(false);
            window.dispatchEvent(new CustomEvent('close-project-assistant'));
          }}
          onApplyChange={onApplyChange}
          project={selectedProject}
          onAddSubproject={(title: string) => onAddSubproject?.(selectedProject.id, title)}
          providerLabel={llmProvider}
        />
      )}

      {showImportModal && (
        <div className="project-overview-modal-overlay" onClick={closeImportModal}>
          <div className="project-overview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="project-overview-modal-header">
              <h2>Import into {selectedProject?.text}</h2>
              <button className="project-overview-modal-close" onClick={closeImportModal} title="Close">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="project-overview-modal-content">
              {!importPreview ? (
                <>
                  <p style={{ marginTop: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Select or paste a project JSON file matching the format produced by &quot;Export&quot;.
                    Its sub-projects and tasks will be added into <strong>{selectedProject?.text}</strong>.
                  </p>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFileSelected(file);
                      e.target.value = "";
                    }}
                    style={{ marginBottom: 12 }}
                  />
                  <textarea
                    value={importJsonText}
                    onChange={(e) => {
                      setImportJsonText(e.target.value);
                      setImportError(null);
                    }}
                    placeholder='{"name": "My project", "sub_projects": [...]}'
                    rows={10}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-color, #d0d5dd)',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      resize: 'vertical',
                    }}
                  />
                  {importError && (
                    <p style={{ color: '#d33b27', fontSize: 13, marginTop: 8 }}>{importError}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button
                      onClick={closeImportModal}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color, #d0d5dd)', background: 'white', cursor: 'pointer', fontSize: 14 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePreviewImport}
                      disabled={!importJsonText.trim()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: !importJsonText.trim() ? '#a5b4fc' : 'var(--accent-primary, #4f46e5)',
                        color: 'white',
                        cursor: !importJsonText.trim() ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Preview
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ marginTop: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Adding into <strong>{selectedProject?.text}</strong>:
                  </p>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    {importPreview.stats.subprojectCount} sub-project{importPreview.stats.subprojectCount === 1 ? '' : 's'}, {importPreview.stats.taskCount} task{importPreview.stats.taskCount === 1 ? '' : 's'}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflowY: 'auto' }}>
                    {importPreview.data.subprojects.map((sub) => (
                      <li key={sub.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color, #eee)' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{sub.text}</div>
                        {sub.tasks.length > 0 && (
                          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 12px' }}>
                            {sub.tasks.map((t) => (
                              <li key={t.id} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '2px 0' }}>
                                • {t.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => setImportPreview(null)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color, #d0d5dd)', background: 'white', cursor: 'pointer', fontSize: 14 }}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary, #4f46e5)', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                    >
                      Confirm Import
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Build a complete, LLM-friendly export object from a ProjectItem
/** Slim context sent to the AI — only what the LLM needs to make edits.
 *  Includes task IDs so edits can be matched back to real tasks on apply. */
function buildAIContext(proj: ProjectItem | any, _people: any[] = []) {
  return {
    name: proj.text ?? proj.title ?? '',
    goal: proj.goal ?? null,
    description: proj.description ?? null,
    end_date: proj.dueDate ?? null,
    special_instructions: proj.aiInstructions ?? null,
    sub_projects: (proj.subprojects || []).map((s: any) => ({
      id: s.id,
      title: s.title ?? s.text ?? '',
      tasks: (s.tasks || []).map((t: any) => ({
        id: t.id,
        title: t.text ?? t.description ?? '',
        effort: t.effort ?? null,
        done: t.done ?? false,
        due_date: t.dueDate ?? null,
        notes: t.notes ?? t.detailedDescription ?? null,
        owners: (t.people || []).map((p: any) => p.name ?? p),
      }))
    })),
  };
}

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