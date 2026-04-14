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
          <button
            type="button"
            className="content-fab"
            aria-label={selectedProject ? 'Add subproject' : 'Add project'}
            onClick={() => {
              if (selectedProject) {
                onAddSubproject?.(selectedProject.id, '');
              } else {
                onAddProject?.();
              }
            }}
            style={{ zIndex: 102 }}
          >
            <span className="material-icons">add</span>
          </button>
        </div>
      )}

      {isAssistantOpen && selectedProject && (
        <ProjectAssistant
          projectExport={buildProjectExport(selectedProject, people)}
          onClose={() => {
            setIsAssistantOpen(false);
            try { window.dispatchEvent(new CustomEvent('close-project-assistant')); } catch (e) {}
          }}
          onApplyBlueprint={(patch: any) => {
            try {
              if (patch && typeof patch === 'object') {
                // Normalize action name (support both `action` and `type` from assistant)
                const actionName = String(patch.action || patch.type || '').toLowerCase();
                // Support generic assistant actions
                if ((actionName === 'add_task' || actionName === 'add-task' || actionName === 'addtask') && patch.payload) {
                  const title = patch.payload.title || patch.payload.text || patch.payload.description || 'New Item';
                  const targetNameOrId = patch.payload.subprojectId || patch.payload.subproject || patch.payload.listName || null;
                  const existingSubs = [...(selectedProject.subprojects || [])];
                  let targetSub = null;
                  if (targetNameOrId) {
                    const tn = String(targetNameOrId).toLowerCase();
                    targetSub = existingSubs.find((s: any) => String(s.id) === tn || (s.title || s.text || '').toLowerCase().includes(tn));
                  } else {
                    targetSub = existingSubs.find((s: any) => {
                      const t = (s.title || s.text || '').toLowerCase();
                      return t.includes('list') || t.includes('tv') || t.includes('inbox') || t.includes('todo') || t.includes('tasks');
                    });
                  }
                  
                  const newTask = { id: `ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: title, description: title, people: [], done: false, favorite: false, dueDate: null };
                  let updatedSubprojects = existingSubs;
                  if (targetSub) {
                    updatedSubprojects = updatedSubprojects.map((s: any) => s.id === targetSub?.id ? { ...s, tasks: [...(s.tasks || []), newTask] } : s);
                  } else {
                    const newSubName = targetNameOrId || 'General List';
                    const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: newSubName, title: newSubName, tasks: [newTask] };
                    updatedSubprojects = [...existingSubs, newSub];
                  }
                  onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
                } else if ((actionName === 'batch_actions' || actionName === 'batch_update' || actionName === 'batchupdate') && Array.isArray(patch.payload?.actions)) {
                  let updatedSubprojects = [...(selectedProject.subprojects || [])];
                  
                  // Helper to incrementally apply known operations to the local state reference before final save
                  const processAction = (subActionName: string, subPayload: any) => {
                     if ((subActionName === 'remove-task' || subActionName === 'remove_task' || subActionName === 'removetask') && subPayload) {
                        const taskId = subPayload.taskId || subPayload.id || subPayload.taskID;
                        if (taskId) {
                          updatedSubprojects = updatedSubprojects.map((s: any) => ({
                            ...s,
                            tasks: (s.tasks || []).filter((t: any) => String(t.id) !== String(taskId))
                          }));
                        }
                     } else if ((subActionName === 'add_task' || subActionName === 'add-task' || subActionName === 'addtask') && subPayload) {
                        const title = subPayload.title || subPayload.text || subPayload.description || 'New Item';
                        const targetNameOrId = subPayload.subprojectId || subPayload.subproject || subPayload.listName || null;
                        let targetSub = null;
                        if (targetNameOrId) {
                          const tn = String(targetNameOrId).toLowerCase();
                          targetSub = updatedSubprojects.find((s: any) => String(s.id) === tn || (s.title || s.text || '').toLowerCase().includes(tn));
                        } else {
                          targetSub = updatedSubprojects.find((s: any) => {
                            const t = (s.title || s.text || '').toLowerCase();
                            return t.includes('list') || t.includes('tv') || t.includes('inbox') || t.includes('todo') || t.includes('tasks');
                          });
                        }
                        const newTask = { id: `ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: title, description: title, people: [], done: false, favorite: false, dueDate: null };
                        if (targetSub) {
                          updatedSubprojects = updatedSubprojects.map((s: any) => s.id === targetSub?.id ? { ...s, tasks: [...(s.tasks || []), newTask] } : s);
                        } else {
                          const newSubName = targetNameOrId || 'General List';
                          const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: newSubName, title: newSubName, tasks: [newTask] };
                          updatedSubprojects = [...updatedSubprojects, newSub];
                        }
                     } else if ((subActionName === 'add_subproject' || subActionName === 'add-subproject' || subActionName === 'addsubproject') && subPayload) {
                        const title = subPayload.title || subPayload.text || subPayload.description || 'New List';
                        const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: title, title: title, tasks: [] };
                        updatedSubprojects = [...updatedSubprojects, newSub];
                     } else if ((subActionName === 'edit-task' || subActionName === 'edit_task' || subActionName === 'edittask') && subPayload) {
                       const taskId = subPayload.taskId || subPayload.id || subPayload.taskID;
                       if (taskId) {
                         updatedSubprojects = updatedSubprojects.map((s: any) => ({
                            ...s,
                            tasks: (s.tasks || []).map((t: any) => {
                              if (String(t.id) !== String(taskId)) return t;
                              const updatedTask = { ...t };
                              const newTitle = subPayload.text || subPayload.title || subPayload.description;
                              if (newTitle) {
                                updatedTask.text = newTitle;
                                updatedTask.description = newTitle;
                              } else if (subPayload.description) {
                                updatedTask.description = subPayload.description;
                              }
                              if (subPayload.done !== undefined) updatedTask.done = !!subPayload.done;
                              if (subPayload.priority !== undefined) updatedTask.priority = subPayload.priority;
                              if (subPayload.effort !== undefined) updatedTask.effort = subPayload.effort;
                              if (subPayload.dueDate !== undefined) updatedTask.dueDate = subPayload.dueDate;
                              if (subPayload.assignee !== undefined) updatedTask.assignee = subPayload.assignee;
                              return updatedTask;
                            })
                         }));
                       }
                     }
                  };

                  patch.payload.actions.forEach((a: any) => {
                    if (a && typeof a === 'object') {
                       processAction(String(a.action || a.type || '').toLowerCase(), a.payload);
                    }
                  });
                  onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
                } else if ((actionName === 'remove-task' || actionName === 'remove_task' || actionName === 'removetask') && patch.payload) {
                  const taskId = patch.payload.taskId || patch.payload.id || patch.payload.taskID;
                  if (taskId) {
                    const updatedSubprojects = (selectedProject.subprojects || []).map((s: any) => ({
                      ...s,
                      tasks: (s.tasks || []).filter((t: any) => String(t.id) !== String(taskId))
                    }));
                    onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
                  }
                } else if ((actionName === 'remove_subproject' || actionName === 'remove-subproject') && patch.payload) {
                  const subId = patch.payload.subprojectId || patch.payload.id;
                  if (subId) {
                    const updatedSubprojects = (selectedProject.subprojects || []).filter((s: any) => String(s.id) !== String(subId));
                    onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
                  }
                } else if ((actionName === 'edit-task' || actionName === 'edit_task' || actionName === 'edittask') && patch.payload) {
                  const taskId = patch.payload.taskId || patch.payload.id || patch.payload.taskID;
                  if (taskId) {
                    const updatedSubprojects = (selectedProject.subprojects || []).map((s: any) => ({
                      ...s,
                      tasks: (s.tasks || []).map((t: any) => {
                        if (String(t.id) !== String(taskId)) return t;
                        // merge editable fields from payload
                        const updated = { ...t };
                        const newTitle = patch.payload.text || patch.payload.title || patch.payload.description;
                        if (newTitle) {
                          updated.text = newTitle;
                          updated.description = newTitle;
                        } else if (patch.payload.description) {
                          updated.description = patch.payload.description;
                        }
                        if (patch.payload.done !== undefined) updated.done = !!patch.payload.done;
                        if (patch.payload.priority !== undefined) updated.priority = patch.payload.priority;
                        if (patch.payload.effort !== undefined) updated.effort = patch.payload.effort;
                        if (patch.payload.dueDate !== undefined) updated.dueDate = patch.payload.dueDate;
                        if (patch.payload.assignee !== undefined) updated.assignee = patch.payload.assignee;
                        return updated;
                      })
                    }));
                    onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
                  }
                } else {
                  // default: treat as a patch object and apply directly
                  onApplyChange?.(selectedProject.id, patch);
                }
              }
            } catch (err) {
              console.error("Error applying patch from assistant", err);
            }
          }}
          onAddSubproject={(title: string) => onAddSubproject?.(selectedProject.id, title)}
        />
      )}

    </div>
  );
}

// Build a complete, LLM-friendly export object from a ProjectItem
function buildProjectExport(proj: ProjectItem | any, people: any[] = []) {
  const { subprojects, ...rest } = proj as any;
  const metadata: Record<string, any> = { ...rest };

  return {
    id: proj.id ?? null,
    name: proj.text ?? proj.title ?? '',
    color: proj.color ?? null,
    metadata,
    sub_projects: (proj.subprojects || []).map((s: any) => ({
      id: s.id ?? null,
      title: s.title ?? s.text ?? '',
      isProjectLevel: !!s.isProjectLevel,
      description: s.description ?? null,
      color: s.color ?? null,
      owners: s.owners ?? null,
      tasks: (s.tasks || []).map((t: any) => ({
        id: t.id ?? null,
        description: t.description ?? t.text ?? '',
        priority: t.priority ?? null,
        effort: t.effort ?? null,
        dueDate: t.dueDate ?? null,
        done: !!t.done,
        assignee: (t as any).assignee ?? null,
        favorite: (t as any).favorite ?? null,
        people: (t as any).people ?? null,
      }))
    })),
    people: (people || []).map((p: any) => ({ id: p?.id ?? null, name: p?.name ?? p?.text ?? String(p) })),
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