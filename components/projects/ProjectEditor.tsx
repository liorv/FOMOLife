import React, { useState, useEffect, useRef, useMemo } from "react";
import type { ProjectItem, ProjectSubproject, ProjectTask, Contact } from "@myorg/types";
import type { TaskFilter, TaskItem } from "@myorg/types";

// Subprojects used within the editor always have a defined `collapsed` boolean
interface EditorSubproject extends ProjectSubproject {
  collapsed: boolean;
}

// Local project state mirrors ProjectItem but narrows subprojects
interface LocalProject extends ProjectItem {
  subprojects: EditorSubproject[];
}

interface ProjectEditorProps {
  project: ProjectItem;
  onApplyChange?: (updated: Partial<ProjectItem>) => void;
  allPeople?: Contact[];
  onCreatePerson?: (name: string) => void;
  onOpenPeople?: () => void;
  onAddSubproject?: (name: string) => void;
  onBack?: () => void;
  newlyAddedSubprojectId?: string | null;
  onClearNewSubproject?: () => void;
  onSubprojectDeleted?: (payload: { projectId: string; subproject: ProjectSubproject; index: number }) => void;
  taskFilters?: string[];
  searchQuery?: string;
  canManage?: boolean;
  dashboardProjectHeaderTop?: React.ReactNode;
  dashboardSummary?: React.ReactNode;
  onToggleFilter?: (filter: string | null) => void;
  onExport?: () => void;
}

type DashboardTileProps = {
  icon: string;
  label: string;
  value: string | number;
  accent?: string;
  active?: boolean;
  clickable?: boolean;
  onClick?: () => void;
};

function DashboardTile({ icon, label, value, accent, active, clickable, onClick }: DashboardTileProps) {
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
          ? (e: React.KeyboardEvent<HTMLDivElement>) => {
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

import SubprojectEditor from "./SubprojectEditor";
import { TaskList } from "@myorg/ui";
import { generateId, applyFilters } from '@myorg/utils';

// Initialize local project state with collapsed defaults for subprojects
function initLocalProject(project: ProjectItem): LocalProject {
  return ({
    ...project,
    subprojects: project.subprojects
      ? project.subprojects.map((s) => ({
          ...s,
          collapsed: s.collapsed ?? false,
        }))
      : [],
  } as LocalProject);
}

export default function ProjectEditor({
  project,
  onApplyChange,
  allPeople,
  onCreatePerson,
  onOpenPeople,
  onAddSubproject,
  onBack,
  newlyAddedSubprojectId,
  onClearNewSubproject,
  onSubprojectDeleted,
  taskFilters = [], // array of active filters
  searchQuery = "",
  canManage = true,
  dashboardProjectHeaderTop,
  dashboardSummary,
  onToggleFilter,
  onExport,
}: ProjectEditorProps) {
  // --- State ---------------------------------------------------------------

  const [local, setLocal] = useState<LocalProject>(() => initLocalProject(project));
  // Ref always holds the latest pending local state so toggleSubCollapse
  // never reads a stale closure value during rapid successive clicks.
  const localRef = useRef<LocalProject>(null as unknown as LocalProject);
  localRef.current = local;
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timeline' | 'risk'>('overview');
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);
  const [newlyAddedTaskId, setNewlyAddedTaskId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ subId: string | null; taskId: string | null }>({ subId: null, taskId: null });
  const [draggedSubprojectId, setDraggedSubprojectId] = useState<string | null>(null);
  const [dragOverSubprojectId, setDragOverSubprojectId] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);


  // safe call wrappers for optional callbacks
  const safeOnApplyChange = onApplyChange ?? (() => {});
  const safeOnCreatePerson = onCreatePerson ?? (() => {});
  const safeOnOpenPeople = onOpenPeople ?? (() => {});
  const safeOnAddSubproject = onAddSubproject ?? (() => {});
  const safeOnClearNewSubproject = onClearNewSubproject ?? (() => {});
  const safeOnSubprojectDeleted = onSubprojectDeleted ?? (() => {});
  const safeOnBack = onBack ?? (() => {});
  const safeOnToggleFilter = onToggleFilter ?? (() => {});
  const safeOnExport = onExport ?? (() => {});

  // small helper to set local UI state and optionally persist via callback
  const setLocalAndApply = (updated: LocalProject, persist = true) => {
    setLocal(updated);
    if (persist) safeOnApplyChange(updated);
  };

  const peopleList: Contact[] = allPeople ?? [];

  // Which subproject, if any, is currently expanded?  We collapse all
  // others whenever one is toggled, so there should be at most one.
  const expandedSub = useMemo(() => {
    return (local.subprojects || []).find(
      (s) => !s.collapsed && !s.isProjectLevel,
    );
  }, [local.subprojects]);

  const projectTasks = useMemo(
    () => (local.subprojects || []).flatMap((s) => s.tasks || []),
    [local.subprojects],
  );

  const tasksRemaining = useMemo(
    () => projectTasks.filter((t) => !t.done).length,
    [projectTasks],
  );

  const effortRemaining = useMemo(() => {
    return projectTasks
      .filter((t) => !t.done)
      .reduce((sum, t) => sum + (t.effort || 0), 0);
  }, [projectTasks]);

  const earliestCompletionDate = useMemo(() => {
    const remainingDays = Math.max(0, effortRemaining);
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + Math.ceil(remainingDays));
    return date;
  }, [effortRemaining]);

  const earliestCompletionLabel = useMemo(() => {
    if (tasksRemaining === 0) {
      return "Today";
    }
    return earliestCompletionDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, [tasksRemaining, earliestCompletionDate]);

  const completedCount = useMemo(
    () => projectTasks.filter((t) => t.done).length,
    [projectTasks],
  );

  const starredCount = useMemo(
    () =>
      projectTasks.filter(
        (t) =>
          !t.done &&
          ((t as any).starred || t.favorite),
      ).length,
    [projectTasks],
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return projectTasks.filter(
      (t) =>
        !t.done &&
        t.dueDate &&
        new Date(t.dueDate) < today,
    ).length;
  }, [projectTasks]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(today.getDate() + 7);
    return projectTasks.filter((t) => {
      if (t.done || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= today && d <= inSeven;
    }).length;
  }, [projectTasks]);

  const handleSetEditorId = (id: string | null) =>
    setEditorTaskId((prev) => (prev === id ? null : id));


  const expandAll = () => {
    const updated = {
      ...localRef.current,
      subprojects: (localRef.current.subprojects || []).map(s => ({ ...s, collapsed: false }))
    } as LocalProject;
    setLocalAndApply(updated);
  };

  const collapseAll = () => {
    const updated = {
      ...localRef.current,
      subprojects: (localRef.current.subprojects || []).map(s => ({ ...s, collapsed: true }))
    } as LocalProject;
    setLocalAndApply(updated);
  };

  const updateProjectField = (field: keyof ProjectItem, value: any, commit = true) => {
    if (!canManage) return;
    const updated = { ...localRef.current, [field]: value };
    setLocal(updated);
    if (commit) {
      // send only the changed field to minimise payload
      safeOnApplyChange({ [field]: value } as Partial<ProjectItem>);
    }
  };

  // --- Task helpers (nested inside subprojects) ---------------------------

  const updateTask = (
    subId: string,
    taskId: string,
    changes: Partial<ProjectTask>
  ) => {
    if (!canManage) {
      // ignore updates when read-only
      return;
    }
    if (!taskId) {
      // should never happen, but guard against bugs where the editor
      // loses its id before the callback fires (e.g. rapid switching).
      // Previously we logged this to console; remove logging to keep output clean.
      return;
    }

    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId ? { ...t, ...changes } : t,
          ),
        };
      }),
    };
    setLocal(updated);
    safeOnApplyChange(updated);
  };

  const handleEditorSave = (subId: string) =>
    async (updatedTask: ProjectTask) => {
    // use the id that comes with the payload if we have it; falling back to
    // the current editorTaskId guards against situations where the value
    // has been cleared by a race (for example a fast double-click on the
    // close button).  log if we ever end up with no id.
    const taskId = updatedTask?.id || editorTaskId;
    if (!taskId) return; // nothing to update
    updateTask(subId, taskId, updatedTask);
    setEditorTaskId(null);
  };

  // parent of TaskList: onEditorUpdate is called with (taskId, updatedTask)
  const handleEditorUpdate = (subId: string) =>
    async (taskId: string, updatedTask: Partial<ProjectTask>) => {
    const id = taskId || updatedTask?.id || editorTaskId;
    if (!id) return;
    updateTask(subId, id, updatedTask);
  };

  const handleEditorClose = () => setEditorTaskId(null);


  useEffect(() => {
    setLocal((prev) => ({
      ...project,
      subprojects: project.subprojects
        ? project.subprojects.map((s) => {
            const existing = (prev.subprojects || []).find((ps) => ps.id === s.id);
            return {
              ...s,
              // collapsed is UI-only state owned by this component.
              // Preserve it across prop updates (e.g. async API responses)
              // so that out-of-order responses don't overwrite the user's toggle.
              collapsed: existing !== undefined ? existing.collapsed : (s.collapsed ?? false),
            };
          })
        : [],
    } as LocalProject));
  }, [project]);

  // Scroll expanded task into view
  useEffect(() => {
    if (!editorTaskId || !editorContainerRef.current) return;

    const scrollToExpanded = () => {
      const expandedElement = editorContainerRef.current?.querySelector(`[data-task-id="${editorTaskId}"]`);
      if (expandedElement) {
        // Scroll the task to the top of the visible area so users can see the whole editor
        setTimeout(() => {
          if (typeof expandedElement.scrollIntoView === 'function') {
            expandedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
    };

    scrollToExpanded();
  }, [editorTaskId]);



  // --- Subproject helpers --------------------------------------------------

  const deleteSubproject = (id: string) => {
    // Prevent deletion of project-level tasks subproject
    const subproject = (local.subprojects || []).find((s) => s.id === id);
    const deletedIndex = (local.subprojects || []).findIndex((s) => s.id === id);
    if (subproject && subproject.isProjectLevel) {
      return;
    }
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).filter((s) => s.id !== id),
    } as LocalProject;
    setLocalAndApply(updated);
    // Trigger callback for undo snack bar
    if (subproject) {
      safeOnSubprojectDeleted({
        projectId: local.id || project.id,
        subproject,
        index: deletedIndex,
      });
    }
  };

  const updateSubText = (id: string, text: string) => {
    const subproject = (local.subprojects || []).find((s) => s.id === id);
    
    // Prevent updating the project-level subproject
    if (subproject && subproject.isProjectLevel) {
      return;
    }

    // if text is empty, check if we should delete or give a temp name
    if (!text || text.trim() === "") {
      if (subproject) {
        const taskCount = (subproject.tasks || []).length;
        // always give it a temporary name, don't delete
        const tempName = taskCount > 0 ? `Untitled (${taskCount})` : "Untitled";
        const updated = {
          ...local,
          subprojects: (local.subprojects || []).map((s) =>
            s.id === id ? { ...s, text: tempName } : s,
          ),
        };
        setLocal(updated);
        safeOnApplyChange(updated);
        if (id === newlyAddedSubprojectId) {
          safeOnClearNewSubproject();
        }
        return;
      }
    }
    
    // normal case: update the text
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) =>
        s.id === id ? { ...s, text } : s,
      ),
    };
    setLocalAndApply(updated);
    // clear the newly added flag when the name is edited
    if (id === newlyAddedSubprojectId) {
      safeOnClearNewSubproject();
    }
  };

  const updateSubColor = (id: string, color: string) => {
    const subproject = (local.subprojects || []).find((s) => s.id === id);
    
    // Prevent updating the project-level subproject
    if (subproject && subproject.isProjectLevel) {
      return;
    }

    const updatedSubprojects = (local.subprojects || []).map((s) =>
      s.id === id ? { ...s, color } : s,
    );
    setLocal({ ...local, subprojects: updatedSubprojects });
    // Only send the changed subprojects — not the full project — to minimise payload
    safeOnApplyChange({ subprojects: updatedSubprojects });
  };

  const toggleSubCollapse = (id: string) => {
    // Always read from the ref so back-to-back calls before a re-render
    // each see the result of the previous call, not the stale closure value.
    const current = localRef.current;
    const subToToggle = (current.subprojects || []).find((s) => s.id === id);

    // If currently expanded (about to collapse) and it's empty — delete it silently
    if (subToToggle && !subToToggle.collapsed && !subToToggle.isProjectLevel) {
      const hasName = subToToggle.text && subToToggle.text.trim() !== "";
      const hasTasks = (subToToggle.tasks || []).filter((t) => t.text && t.text.trim() !== "").length > 0;
      if (!hasName && !hasTasks) {
        const updated = {
          ...current,
          subprojects: (current.subprojects || []).filter((s) => s.id !== id),
        };
        localRef.current = updated;
        setLocal(updated);
        safeOnApplyChange(updated);
        if (id === newlyAddedSubprojectId) {
          safeOnClearNewSubproject();
        }
        return;
      }
    }

    const updated = {
      ...current,
      subprojects: (current.subprojects || []).map((s) => {
        if (s.id === id) {
          // flip the clicked one
          return { ...s, collapsed: !s.collapsed };
        }
                // leave all others as they are
        return s;
      }),
    };
    // if we're collapsing the requested subproject, strip any unnamed tasks
    const cleaned = {
      ...updated,
      subprojects: updated.subprojects
        .map((s) => {
          if (s.id === id && s.collapsed) {
            return {
              ...s,
              tasks: (s.tasks || []).filter((t) => t.text && t.text.trim() !== ""),
            };
          }
          return s;
        })
        // discard any unnamed taskless sub-projects that got force-collapsed
        .filter((s) => {
          if (s.isProjectLevel || !s.collapsed) return true;
          const hasName = s.text && s.text.trim() !== "";
          const hasTasks = (s.tasks || []).filter((t) => t.text && t.text.trim() !== "").length > 0;
          return hasName || hasTasks;
        }),
    };
    localRef.current = cleaned;
    setLocal(cleaned);
    safeOnApplyChange(cleaned);
  };


  const addTask = (subId: string, text = "", allowBlank = false) => {
    // prevent creating tasks with no name (or only whitespace) unless caller
    // explicitly asked for a blank placeholder.
    if ((!text || text.trim() === "") && !allowBlank) {
      return;
    }

    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        const newTask = {
          id: generateId(),
          text,
          done: false,
          dueDate: null,
          favorite: false,
          people: [],
        };
        return {
          ...s,
          tasks: [...(s.tasks || []), newTask],
        };
      }),
    };
    setLocal(updated);
    safeOnApplyChange(updated);
    // if task was created blank, mark it as newly added so it enters edit mode
    if (!text || text.trim() === "") {
      const newTask = updated.subprojects
        .find((s) => s.id === subId)
        ?.tasks.slice(-1)[0];
      if (newTask) {
        setNewlyAddedTaskId(newTask.id);
      }
    }
  };

  const handleTaskToggle = (subId: string, taskId: string) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t,
          ),
        };
      }),
    };
    setLocal(updated);
    safeOnApplyChange(updated);
  };

  const handleTaskDelete = (subId: string, taskId: string) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).filter((t) => t.id !== taskId),
        };
      }),
    };
    setLocal(updated);
    safeOnApplyChange(updated);
  };

  const handleTaskStar = (subId: string, taskId: string) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId ? { ...t, favorite: !t.favorite } : t,
          ),
        };
      }),
    };
    setLocal(updated);
    safeOnApplyChange(updated);
  };

  // --- Drag / drop (task reordering within a subproject) ------------------

  const handleDragStart = (subId: string) =>
    (taskId: string) => {
    setDraggedTask({ subId, taskId });
  };

  const handleDragOverSubproject = (subId: string) => {
    setDragOverSubprojectId(subId);
  };

  const handleDragLeaveSubproject = () => {
    setDragOverSubprojectId(null);
  };


  const handleDrop = (subId: string) =>
    (taskId: string) => {
    const { subId: fromSub, taskId: draggedId } = draggedTask;
    if (!draggedId) {
      setDraggedTask({ subId: null, taskId: null });
      setDragOverSubprojectId(null);
      return;
    }

    setLocal((prev) => {
      let updated = null;
      // If dropping on same subproject and same task, do nothing
      if (fromSub === subId && draggedId === taskId) {
        return prev;
      }

      // If dropping on a different subproject, move the task
      if (fromSub !== subId) {
        const fromSubIdx = (prev.subprojects || []).findIndex((s) => s.id === fromSub);
        const toSubIdx = (prev.subprojects || []).findIndex((s) => s.id === subId);
        
        if (fromSubIdx === -1 || toSubIdx === -1) {
          return prev;
        }

        const newSubprojects = [...(prev.subprojects || [])];
        
        // Find and remove task from source subproject
        const fromSubTasks = [...(newSubprojects[fromSubIdx]!.tasks || [])];
        const taskIdx = fromSubTasks.findIndex((t) => t.id === draggedId);
        if (taskIdx === -1) {
          return prev;
        }
        
        const [movedTask] = fromSubTasks.splice(taskIdx, 1);
        if (!movedTask) {
          return prev;
        }
        newSubprojects[fromSubIdx] = {
          ...(newSubprojects[fromSubIdx] as EditorSubproject),
          tasks: fromSubTasks,
        };

        // Add task to target subproject
        const toSubTasks = [...(newSubprojects[toSubIdx]!.tasks || [])];
        
        // If taskId is specified and exists in target, insert before it
        const toTaskIdx = toSubTasks.findIndex((t) => t.id === taskId);
        if (toTaskIdx !== -1) {
          toSubTasks.splice(toTaskIdx, 0, movedTask);
        } else {
          // Otherwise append at end
          toSubTasks.push(movedTask);
        }
        
        newSubprojects[toSubIdx] = {
          ...(newSubprojects[toSubIdx] as EditorSubproject),
          tasks: toSubTasks,
        };

        updated = { ...prev, subprojects: newSubprojects };
        // call callback immediately while we have access to updated
        safeOnApplyChange(updated);
        return updated;
      }

      // Otherwise, reorder within same subproject
      const subs = (prev.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        const tasks = [...(s.tasks || [])];
        const fromIdx = tasks.findIndex((t) => t.id === draggedId);
        const toIdx = tasks.findIndex((t) => t.id === taskId);
        if (fromIdx === -1 || toIdx === -1) return s;
        const [moved] = tasks.splice(fromIdx, 1);
        if (!moved) return s;
        tasks.splice(toIdx, 0, moved);
        return { ...s, tasks };
      });
      updated = { ...prev, subprojects: subs };
      safeOnApplyChange(updated);
      return updated;
    });
    // debug note: log updated variable is useless now since update happens inside
    // setLocal callback
    setDraggedTask({ subId: null, taskId: null });
    setDragOverSubprojectId(null);
  };

  const handleDropOnSubprojectTile =
    (subId: string) =>
    (e: React.DragEvent) => {
    e.preventDefault();
    const { subId: fromSub, taskId: draggedId } = draggedTask;
    if (!draggedId || fromSub === subId) {
      setDraggedTask({ subId: null, taskId: null });
      setDragOverSubprojectId(null);
      return;
    }

    let updated = null;
    setLocal((prev) => {
      const fromSubIdx = (prev.subprojects || []).findIndex((s) => s.id === fromSub);
      const toSubIdx = (prev.subprojects || []).findIndex((s) => s.id === subId);
      
      if (fromSubIdx === -1 || toSubIdx === -1) {
        return prev;
      }

      const newSubprojects = [...(prev.subprojects || [])];
      
      // Find and remove task from source subproject
      const fromSubTasks = [...(newSubprojects[fromSubIdx]!.tasks || [])];
      const taskIdx = fromSubTasks.findIndex((t) => t.id === draggedId);
      if (taskIdx === -1) {
        return prev;
      }
      
      const [movedTask] = fromSubTasks.splice(taskIdx, 1);
      if (!movedTask) {
        return prev;
      }
      newSubprojects[fromSubIdx] = {
        ...(newSubprojects[fromSubIdx] as EditorSubproject),
        tasks: fromSubTasks,
      };

      // Append task to target subproject
      const toSubTasks = [...(newSubprojects[toSubIdx]!.tasks || [])];
      toSubTasks.push(movedTask);
      
      newSubprojects[toSubIdx] = {
        ...(newSubprojects[toSubIdx] as EditorSubproject),
        tasks: toSubTasks,
      };

      updated = { ...prev, subprojects: newSubprojects };
      return updated;
    });
    if (updated) {
      safeOnApplyChange(updated);
    }
    setDraggedTask({ subId: null, taskId: null });
    setDragOverSubprojectId(null);
  };

  const handleDragEnd = () => {
    setDraggedTask({ subId: null, taskId: null });
  };

  const handleReorderSubprojects = async (
    draggedSubId: string,
    targetSubId: string,
  ) => {
    const draggedIndex = (local.subprojects || []).findIndex((s) => s.id === draggedSubId);
    const targetIndex = (local.subprojects || []).findIndex((s) => s.id === targetSubId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Prevent reordering the project-level tasks subproject
    const draggedSub = (local.subprojects || [])[draggedIndex];
    const targetSub = (local.subprojects || [])[targetIndex];
    if (draggedSub?.isProjectLevel || targetSub?.isProjectLevel) {
      return;
    }

    // Create new array with reordered subprojects
    const newSubprojects = [...(local.subprojects || [])];
    const [removed] = newSubprojects.splice(draggedIndex, 1);
      if (!removed) return;
      newSubprojects.splice(targetIndex, 0, removed);
    // Update local state immediately for better UX
    const updated = {
      ...local,
      subprojects: newSubprojects,
    };
    setLocal(updated);
    safeOnApplyChange(updated);
  };

  // --- Flat filter view helpers ------------------------------------------

  type FlatTask = ProjectTask & { _subId: string };
  const filteredFlatTasks = useMemo<FlatTask[]>(() => {
    // flatten and then apply the shared filter helper, which also handles
    // searchQuery
    const flat: TaskItem[] = (local.subprojects || []).flatMap((sub) =>
      (sub.tasks || []).map((t) => ({ ...t, _subId: sub.id } as any))
    );
    return (applyFilters(flat, taskFilters, searchQuery) as unknown) as FlatTask[];
  }, [local.subprojects, JSON.stringify(taskFilters), searchQuery]);

  const findSubIdForTask = (taskId: string): string | undefined =>
    filteredFlatTasks.find((t) => t.id === taskId)?._subId;

  // helper for empty-message text in flat-filter view
  const filterMessage = () => {
    if (searchQuery && searchQuery.trim() !== "") {
      return `No tasks match "${searchQuery}."`;
    }
    if (taskFilters.length === 1) {
      return `No ${taskFilters[0]} tasks found.`;
    }
    if (taskFilters.length > 1) {
      return `No tasks match those filters.`;
    }
    return null;
  };

  // --- Render --------------------------------------------------------------

  // Show flat filter view whenever any filter is active
  const showFlatFilterView = taskFilters.length > 0;

  return (
    <div
      className="project-editor"
      ref={editorContainerRef}
    >
      <div className="dashboard-project-header">
        {dashboardProjectHeaderTop && (
          <div className="dashboard-project-title-row">
            {dashboardProjectHeaderTop}
          </div>
        )}

        {/* Tabs moved inside sticky header */}
        <div className="project-editor-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          >Overview</button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
          >Tasks</button>

          {activeTab === 'tasks' && (
            <div className="tab-controls">
              <button onClick={expandAll} className="expand-collapse-btn">Expand All</button>
              <button onClick={collapseAll} className="expand-collapse-btn">Collapse All</button>
              {/* Export JSON button injected here */}
              {typeof onExport === 'function' && (
                <button onClick={onExport} className="expand-collapse-btn">Export JSON</button>
              )}
            </div>
          )}
        </div>

        {activeTab === 'tasks' && (
          <div className="dashboard-summary project-editor-filters">
            <DashboardTile
              icon="check_circle"
              label="Completed"
              value={completedCount}
              accent="success"
              clickable
              active={taskFilters.includes('completed')}
              onClick={() => safeOnToggleFilter('completed')}
            />
            <DashboardTile
              icon="star"
              label="Starred"
              value={starredCount}
              accent="star"
              clickable
              active={taskFilters.includes('starred')}
              onClick={() => safeOnToggleFilter('starred')}
            />
            <DashboardTile
              icon="warning"
              label="Overdue"
              value={overdueCount}
              accent="danger"
              clickable
              active={taskFilters.includes('overdue')}
              onClick={() => safeOnToggleFilter('overdue')}
            />
            <DashboardTile
              icon="upcoming"
              label="Upcoming"
              value={upcomingCount}
              accent="info"
              clickable
              active={taskFilters.includes('upcoming')}
              onClick={() => safeOnToggleFilter('upcoming')}
            />
          </div>
        )}
      </div>

      {!showFlatFilterView && (!searchQuery || searchQuery.trim() === "") && activeTab === 'overview' && (
        <div className="project-editor-header">
          <div className="dashboard-summary project-overview-metrics">
            <DashboardTile
              icon="task_alt"
              label="Tasks remaining"
              value={tasksRemaining}
              accent="danger"
            />
            <DashboardTile
              icon="schedule"
              label="Effort remaining"
              value={`${Math.round(effortRemaining * 10) / 10}d`}
              accent="info"
            />
            <DashboardTile
              icon="event_available"
              label="Earliest completion"
              value={earliestCompletionLabel}
              accent="success"
            />
          </div>

          <div className="project-editor-field">
            <label className="project-editor-field-label">
              <span className="material-icons field-icon">flag</span>
              Goal
            </label>
            <textarea
              value={local.goal || ''}
              onChange={(e) => updateProjectField('goal', e.target.value, false)}
              onBlur={() => safeOnApplyChange({ goal: localRef.current.goal } as Partial<ProjectItem>)}
              placeholder="What success looks like..."
              disabled={!canManage}
              className="project-editor-goal-input"
              rows={3}
            />
          </div>
          <div className="project-editor-field">
            <label className="project-editor-field-label">
              <span className="material-icons field-icon">description</span>
              Description
            </label>
            <textarea
              value={local.description || ''}
              onChange={(e) => updateProjectField('description', e.target.value, false)}
              onBlur={() => safeOnApplyChange({ description: localRef.current.description } as Partial<ProjectItem>)}
              placeholder="What this project is all about..."
              disabled={!canManage}
              className="project-editor-description-input"
            />
          </div>
          <div className="project-editor-field">
            <label className="project-editor-field-label">
              <span className="material-icons field-icon">event</span>
              End Date
            </label>
            <div className="project-editor-date-container">
              <input
                type="date"
                value={local.dueDate || ''}
                onChange={(e) => updateProjectField('dueDate', e.target.value, false)}
                onBlur={() => safeOnApplyChange({ dueDate: localRef.current.dueDate } as Partial<ProjectItem>)}
                disabled={!canManage}
              />
            </div>
          </div>
          <div className="project-editor-field">
            <label className="project-editor-field-label">
              <span className="material-icons field-icon">psychology</span>
              Special Instructions
            </label>
            <textarea
              value={local.aiInstructions || ''}
              onChange={(e) => updateProjectField('aiInstructions', e.target.value, false)}
              onBlur={() => safeOnApplyChange({ aiInstructions: localRef.current.aiInstructions } as Partial<ProjectItem>)}
              placeholder="Instructions for AI when reviewing the project..."
              disabled={!canManage}
              className="project-editor-ai-instructions-input"
            />
          </div>
        </div>
      )}

      {/* Conditionally render content */}
      {(showFlatFilterView || (searchQuery && searchQuery.trim() !== "") || activeTab === 'tasks') && (
        <div className="project-editor-content">
      {showFlatFilterView || (searchQuery && searchQuery.trim() !== "") ? (
        /* ── Flat filter view: replaces subproject list ───────────────────── */
        <div className="filter-flat-view">
          {filteredFlatTasks.length === 0 ? (
            <p className="filter-flat-empty">{filterMessage()}</p>
          ) : (
            <ul className="item-list">
              <TaskList
                items={filteredFlatTasks}
                type="tasks"
                editorTaskId={editorTaskId}
                setEditorTaskId={handleSetEditorId}
                handleToggle={(taskId) => {
                  const sid = findSubIdForTask(taskId);
                  if (sid) handleTaskToggle(sid, taskId);
                }}
                handleStar={(taskId) => {
                  const sid = findSubIdForTask(taskId);
                  if (sid) handleTaskStar(sid, taskId);
                }}
                handleDelete={(taskId) => {
                  const sid = findSubIdForTask(taskId);
                  if (sid) handleTaskDelete(sid, taskId);
                }}
                onTitleChange={(taskId, text) => {
                  const sid = findSubIdForTask(taskId);
                  if (sid) updateTask(sid, taskId, { text });
                }}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDrop={() => {}}
                onDragEnd={() => {}}
                onEditorSave={async (updatedTask) => {
                  const sid = (local.subprojects || []).find((s) =>
                    (s.tasks || []).some((t) => t.id === editorTaskId)
                  )?.id;
                  if (sid && editorTaskId) updateTask(sid, editorTaskId, updatedTask);
                  setEditorTaskId(null);
                }}
                onEditorUpdate={async (_taskId, updatedTask: Partial<ProjectTask>) => {
                  const sid = (local.subprojects || []).find((s) =>
                    (s.tasks || []).some((t) => t.id === editorTaskId)
                  )?.id;
                  if (sid && editorTaskId) updateTask(sid, editorTaskId, updatedTask);
                }}
                onEditorClose={handleEditorClose}
                allPeople={peopleList}
                onOpenPeople={safeOnOpenPeople}
                onCreatePerson={safeOnCreatePerson}
              />
            </ul>
          )}
        </div>
      ) : (
        /* ── Normal subproject view ──────────────────────────────────────── */
        <div className="subprojects-list">
      {(local.subprojects || []).map((sub) => (
        <SubprojectEditor
          key={sub.id}
          sub={sub}
          project={local}
          editorTaskId={editorTaskId}
          setEditorTaskId={handleSetEditorId}
          onDelete={() => deleteSubproject(sub.id)}
          onUpdateText={(text) => updateSubText(sub.id, text)}
          onUpdateColor={(color) => updateSubColor(sub.id, color)}
          onToggleCollapse={() => toggleSubCollapse(sub.id)}
          onAddTask={(text, allowBlank) => addTask(sub.id, text, allowBlank)}
          handleTaskToggle={(taskId) => handleTaskToggle(sub.id, taskId)}
          handleTaskStar={(taskId) => handleTaskStar(sub.id, taskId)}
          handleTaskDelete={(taskId) => handleTaskDelete(sub.id, taskId)}
          onDragStart={handleDragStart(sub.id)}
          onDragOver={() => { /* noop - no extra logic needed */ }}
          onDrop={handleDrop(sub.id)}
          onDragEnd={handleDragEnd}
          onDragOverSubprojectTile={() => handleDragOverSubproject(sub.id)}
          onDragLeaveSubprojectTile={handleDragLeaveSubproject}
          onDropOnSubprojectTile={handleDropOnSubprojectTile(sub.id)}
          isDragOverSubprojectTile={dragOverSubprojectId === sub.id && draggedTask.taskId !== null}
          onEditorSave={handleEditorSave(sub.id)}
          onEditorUpdate={handleEditorUpdate(sub.id)}
          onEditorClose={handleEditorClose}
          allPeople={peopleList}
          onOpenPeople={safeOnOpenPeople}
          onCreatePerson={safeOnCreatePerson}
          onTaskTitleChange={(taskId, newText) => updateTask(sub.id, taskId, { text: newText })}
          autoEdit={newlyAddedSubprojectId === sub.id}
          newlyAddedTaskId={newlyAddedTaskId}
          onClearNewTask={() => setNewlyAddedTaskId(null)}
          onReorder={handleReorderSubprojects}
          isDragging={draggedSubprojectId === sub.id}
        />
      ))}
        </div>
      )}
        </div>
      )}

    </div>
  );
}

