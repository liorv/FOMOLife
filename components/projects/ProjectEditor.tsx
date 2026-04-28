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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timeline' | 'risk'>('tasks');
  const [showOverviewEditor, setShowOverviewEditor] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [iconSearchResults, setIconSearchResults] = useState<any[]>([]);
  const iconDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearchingIcons, setIsSearchingIcons] = useState(false);
  const [iconInputMode, setIconInputMode] = useState<'upload' | 'search'>('search');
  
  const effectiveDefaultIconUrl = useMemo(() => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(local.text || 'Project')}&background=random`;
  }, [local.text]);

  // Icon search functionality
  const searchIcons = async (query: string) => {
    if (!query.trim()) return;

    setIsSearchingIcons(true);
    try {
      // Using Iconify API to fetch actual icons (SVG format)
      const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=24&prefix=twemoji`);

      if (response.ok) {
        const data = await response.json();
        
        // Map the Iconify response IDs (e.g., 'mdi:cat') to standard URLs
        const icons = (data.icons || []).map((iconId: string, index: number) => {
          const [prefix, name] = iconId.split(':');
          return {
            id: iconId || `icon-${index}`,
            url: `https://api.iconify.design/${prefix}/${name}.svg`
          };
        });

        setIconSearchResults(icons);
      } else {
        throw new Error('Failed to fetch icons');
      }
    } catch (error) {
      console.error('Icon search failed:', error);
      // Optional fallback if API is unreachable
      setIconSearchResults([]);
    } finally {
      setIsSearchingIcons(false);
    }
  };

  const selectIcon = (icon: any) => {
    // Determine the selected icon's URL
    const iconUrl = icon.url || icon.raster_sizes?.[0]?.formats?.[0]?.source ||
                   icon.images?.[0]?.url ||
                   icon.preview_url;

    if (iconUrl) {
      updateProjectField('avatarUrl', iconUrl, true);
      setIconSearchResults([]);
      setIconSearchQuery('');
    }
  };
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

    // If collapsing (currently expanded), close the task editor if it belongs here
    if (subToToggle && !subToToggle.collapsed && editorTaskId) {
      const taskIds = (subToToggle.tasks || []).map((t) => t.id);
      if (taskIds.includes(editorTaskId)) {
        setEditorTaskId(null);
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

        {/* Project header controls */}
        <div className="project-editor-header-controls">
          <div className="tab-controls">
            <button onClick={expandAll} className="expand-collapse-btn" title="Expand All">
              <span className="material-icons">unfold_more</span>
              <span className="btn-label">Expand</span>
            </button>
            <button onClick={collapseAll} className="expand-collapse-btn" title="Collapse All">
              <span className="material-icons">unfold_less</span>
              <span className="btn-label">Collapse</span>
            </button>
            {typeof onExport === 'function' && (
              <button onClick={onExport} className="expand-collapse-btn export-btn" title="Export JSON">
                <span className="material-icons">download</span>
                <span className="btn-label">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Project profile icon */}
        <div className="project-profile-icon-container">
          <div
            className="project-profile-icon"
            onClick={() => setShowOverviewEditor(true)}
            title="Edit project overview"
          >
            {local.avatarUrl ? (
              <img
                src={local.avatarUrl}
                alt="Project avatar"
                className="project-avatar"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <img
                src={effectiveDefaultIconUrl}
                alt="Project default avatar"
                className="project-avatar"
                style={{ objectFit: 'cover' }}
              />
            )}
            <div className="project-profile-hover-overlay">
              <span className="material-icons">edit</span>
            </div>
          </div>
        </div>

      </div>

      {/* Overview Editor Modal */}
      {showOverviewEditor && (
        <div className="project-overview-modal-overlay" onClick={() => setShowOverviewEditor(false)}>
          <div className="project-overview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="project-overview-modal-header">
              <h2>Edit Project Overview</h2>
              <button
                className="project-overview-modal-close"
                onClick={() => setShowOverviewEditor(false)}
                title="Close"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="project-overview-modal-content">
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
                  <span className="material-icons field-icon">photo</span>
                  Project Icon / Picture
                </label>

                {/* Visible Preview in Editor */}
                <div className="project-overview-avatar-preview" style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  
                  {/* Left Column: Image and Link */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px' }}>
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={local.avatarUrl || effectiveDefaultIconUrl} 
                        alt="Project preview" 
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }} 
                      />
                    </div>
                    {local.avatarUrl && local.avatarUrl.startsWith('http') && (
                      <a 
                        href={local.avatarUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: '10px', color: '#2196f3', textDecoration: 'none', wordBreak: 'break-all', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}
                        title={local.avatarUrl}
                      >
                        Source Link
                      </a>
                    )}
                    {!local.avatarUrl && (
                      <span style={{ fontSize: '10px', color: '#666', textAlign: 'center', maxWidth: '80px' }}>Suggested default icon</span>
                    )}
                  </div>

                  {/* Right Column: Toggle Switch and Input Area */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Switch Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', color: iconInputMode === 'search' ? '#333' : '#888', fontWeight: iconInputMode === 'search' ? 'bold' : 'normal' }}>
                        Search Online
                      </span>
                      <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                        <input 
                          type="checkbox" 
                          checked={iconInputMode === 'upload'} 
                          onChange={(e) => setIconInputMode(e.target.checked ? 'upload' : 'search')} 
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{ 
                          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                          backgroundColor: '#ccc', transition: '.4s', borderRadius: '24px' 
                        }}>
                          <span style={{
                            position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                            backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                            transform: iconInputMode === 'upload' ? 'translateX(16px)' : 'translateX(0)'
                          }} />
                        </span>
                      </label>
                      <span style={{ fontSize: '14px', color: iconInputMode === 'upload' ? '#333' : '#888', fontWeight: iconInputMode === 'upload' ? 'bold' : 'normal' }}>
                        Upload
                      </span>
                    </div>

                    {/* Input Content */}
                    <div>
                      {iconInputMode === 'upload' ? (
                        <div className="project-picture-upload">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const MAX_SIZE = 256;
                                    let width = img.width;
                                    let height = img.height;

                                    if (width > height) {
                                      if (width > MAX_SIZE) {
                                        height *= MAX_SIZE / width;
                                        width = MAX_SIZE;
                                      }
                                    } else {
                                      if (height > MAX_SIZE) {
                                        width *= MAX_SIZE / height;
                                        height = MAX_SIZE;
                                      }
                                    }

                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0, width, height);
                                      const avatarUrl = canvas.toDataURL('image/jpeg', 0.7);
                                      updateProjectField('avatarUrl', avatarUrl, true);
                                    }
                                  };
                                  img.src = event.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            disabled={!canManage}
                            className="project-picture-input"
                          />
                        </div>
                      ) : (
                  <div className="icon-search-section">
                    <div className="icon-search-input-container">
                      <input
                        type="text"
                        value={iconSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIconSearchQuery(val);
                          if (iconDebounceRef.current) clearTimeout(iconDebounceRef.current);
                          if (val.trim()) {
                            iconDebounceRef.current = setTimeout(() => searchIcons(val), 400);
                          } else {
                            setIconSearchResults([]);
                          }
                        }}
                        placeholder="Search for icons online..."
                        className="icon-search-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (iconDebounceRef.current) clearTimeout(iconDebounceRef.current);
                            searchIcons(iconSearchQuery);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => searchIcons(iconSearchQuery)}
                        disabled={!iconSearchQuery.trim() || isSearchingIcons}
                        className="icon-search-button"
                        title="Search icons"
                      >
                        <span className="material-icons">
                          {isSearchingIcons ? 'hourglass_empty' : 'search'}
                        </span>
                      </button>
                    </div>

                    {iconSearchResults.length > 0 && (
                      <div className="icon-search-results">
                        <div className="icon-results-grid">
                          {iconSearchResults.map((icon) => {
                            const iconUrl = icon.raster_sizes?.[0]?.formats?.[0]?.source ||
                                           icon.images?.[0]?.url ||
                                           icon.preview_url ||
                                           icon.url;

                            return (
                              <button
                                key={icon.icon_id || icon.id}
                                type="button"
                                onClick={() => selectIcon(icon)}
                                className="icon-result-item"
                                title="Select this icon"
                              >
                                <img
                                  src={iconUrl}
                                  alt="Icon"
                                  className="icon-result-image"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const colors = ['4CAF50', '2196F3', 'FF9800', '9C27B0', 'F44336', '00BCD4', '8BC34A', 'FFC107'];
                                    const randomColor = colors[Math.floor(Math.random() * colors.length)] || '4CAF50';
                                    target.src = `https://via.placeholder.com/64x64/${randomColor}/FFFFFF?text=Icon`;
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* END Toggle Section */}
              </div>
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
          </div>
        </div>
      )}

      {/* Main content - always show tasks */}
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

    </div>
  );
}

