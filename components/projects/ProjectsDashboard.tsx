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
  currentUserId?: string;
  onInviteMember?: (projectId: string, member: import('@myorg/types').ProjectMember) => void;
  onRemoveMember?: (projectId: string, userId: string) => void;
  onLeave?: (projectId: string) => void;
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
  currentUserId = '',
  onInviteMember,
  onRemoveMember,
  onLeave,
}: ProjectsDashboardProps) {

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isFilterActive = (filterType: string) => filters.includes(filterType);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  const [llmUnavailableMsg, setLlmUnavailableMsg] = useState('');
  const [llmProvider, setLlmProvider] = useState<string | null>(null);

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
    const updatedSubs = (project.subprojects || []).map((sub) =>
      sub.id === subprojectId
        ? { ...sub, tasks: (sub.tasks || []).map((t) => t.id === taskId ? { ...t, ...patch } : t) }
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
                  </div>
                  <div className="dashboard-summary dashboard-project-header-summary">
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
              currentUserId={currentUserId}
              onInviteMember={(member) => onInviteMember?.(selectedProject.id, member)}
              onRemoveMember={(userId) => onRemoveMember?.(selectedProject.id, userId)}
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

          {/* Combined search results (projects + tasks) */}
          {searchResults !== null ? (
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
              <div className="dashboard-tiles-grid">
                {projects.map((p) => (
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
                      currentUserId={currentUserId}
                      onLeave={onLeave ? () => onLeave(p.id) : undefined}
                    />
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {isAssistantOpen && selectedProject && (
        <ProjectAssistant
          projectExport={buildAIContext(selectedProject, people)}
          onClose={() => {
            setIsAssistantOpen(false);
            try { window.dispatchEvent(new CustomEvent('close-project-assistant')); } catch (e) {}
          }}
          onApplyChange={onApplyChange}
          project={selectedProject}
          onAddSubproject={(title: string) => onAddSubproject?.(selectedProject.id, title)}
          providerLabel={llmProvider}
        />
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