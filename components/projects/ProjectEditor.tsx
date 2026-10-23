import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import type { ProjectItem, ProjectSubproject, ProjectTask, Contact, ProjectMember } from "@myorg/types";
import type { TaskItem } from "@myorg/types";
import { getProjectMemberContacts } from '@/lib/client/projectMembers';
import { advanceRecurringTask } from '@/lib/tasks/recurrence';
import DashboardMetricCard from './DashboardMetricCard';
import { deleteProjectTask, updateProjectTask } from '@/lib/projects/taskUpdates';

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
  targetTaskId?: string | null;
  onApplyChange?: (updated: Partial<ProjectItem>) => void;
  allPeople?: Contact[];
  onCreatePerson?: (name: string) => void;
  onOpenPeople?: () => void;
  onAddSubproject?: (name: string) => void;
  newlyAddedSubprojectId?: string | null;
  onClearNewSubproject?: () => void;
  onSubprojectDeleted?: (payload: { projectId: string; subproject: ProjectSubproject; index: number }) => void;
  onConvertSubprojectToProject?: (subprojectId: string) => void;
  taskFilters?: string[];
  searchQuery?: string;
  canManage?: boolean;
  dashboardProjectHeaderTop?: (members: React.ReactNode) => React.ReactNode;
  dashboardSummary?: React.ReactNode;
  workspaceContent?: React.ReactNode;
  workspaceView?: string;
  workspaceDirection?: 'forward' | 'backward' | 'none';
  taskToolbar?: React.ReactNode;
  taskFilterPanel?: React.ReactNode;
  projectActions?: React.ReactNode;
  onToggleFilter?: (filter: string | null) => void;
  onExport?: () => void;
  currentUserId?: string;
  onInviteMember?: (member: ProjectMember) => void;
  onRemoveMember?: (userId: string) => void;
  onArchiveToggle?: (archived: boolean) => void;
  collapseAllRef?: React.MutableRefObject<(() => void) | null>;
  expandAllRef?: React.MutableRefObject<(() => void) | null>;
  onTaskChatClick?: (task: ProjectTask) => void;
  taskCommentCounts?: Record<string, number>;
}

import SubprojectEditor from "./SubprojectEditor";
import { TaskList } from "@myorg/ui";
import { generateId, applyFilters, isValidExternalUrl } from '@myorg/utils';
import DismissibleHint from "../DismissibleHint";

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
  targetTaskId,
  onApplyChange,
  allPeople,
  onCreatePerson,
  onOpenPeople,
  newlyAddedSubprojectId,
  onClearNewSubproject,
  onSubprojectDeleted,
  onConvertSubprojectToProject,
  taskFilters = [], // array of active filters
  searchQuery = "",
  canManage = true,
  dashboardProjectHeaderTop,
  workspaceContent,
  workspaceView = 'tasks',
  workspaceDirection = 'none',
  taskToolbar,
  taskFilterPanel,
  projectActions,
  onToggleFilter,
  onExport,
  currentUserId = '',
  onInviteMember,
  onRemoveMember,
  onArchiveToggle,
  collapseAllRef,
  expandAllRef,
  onTaskChatClick,
  taskCommentCounts,
}: ProjectEditorProps) {
  // --- State ---------------------------------------------------------------

  const [local, setLocal] = useState<LocalProject>(() => initLocalProject(project));
  // Ref always holds the latest pending local state so toggleSubCollapse
  // never reads a stale closure value during rapid successive clicks.
  const localRef = useRef<LocalProject>(local);
  localRef.current = local;
  const [showOverviewEditor, setShowOverviewEditor] = useState(false);
  const [leaveArmed, setLeaveArmed] = useState(false);
  useEffect(() => {
    setLeaveArmed(false);
  }, [showOverviewEditor, project.id]);
  useEffect(() => {
    if (!leaveArmed) return;
    const timer = setTimeout(() => setLeaveArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [leaveArmed]);
  const [openToolPanel, setOpenToolPanel] = useState<'view' | 'more' | null>(null);
  const toolPanelId = useId();
  const toolTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeToolPanel = () => {
    setOpenToolPanel(null);
    toolTriggerRef.current?.focus();
  };
  useEffect(() => {
    if (!openToolPanel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenToolPanel(null);
        toolTriggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openToolPanel]);
  useEffect(() => {
    setOpenToolPanel(null);
  }, [project.id]);
  const [externalUrlDraft, setExternalUrlDraft] = useState(project.externalUrl ?? '');
  const [externalUrlError, setExternalUrlError] = useState('');
  useEffect(() => {
    setExternalUrlDraft(project.externalUrl ?? '');
    setExternalUrlError('');
  }, [project.id, project.externalUrl]);
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
  const [dragOverSubprojectId, setDragOverSubprojectId] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);


  // safe call wrappers for optional callbacks
  const safeOnApplyChange = onApplyChange ?? (() => {});
  const safeOnCreatePerson = onCreatePerson ?? (() => {});
  const safeOnOpenPeople = onOpenPeople ?? (() => {});
  const safeOnClearNewSubproject = onClearNewSubproject ?? (() => {});
  const safeOnSubprojectDeleted = onSubprojectDeleted ?? (() => {});

  // Members derived from project prop (always up-to-date from parent)
  const members: ProjectMember[] = project.members ?? [];

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Import Tasks modal state
  const [importSubId, setImportSubId] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<{ id: string; text: string }[]>([]);

  // small helper to set local UI state and optionally persist via callback
  const setLocalAndApply = (updated: LocalProject, persist = true) => {
    localRef.current = updated;
    setLocal(updated);
    if (persist) safeOnApplyChange(updated);
  };

  // Only show contacts who are members of this project as assignable people
  const allPeopleList: Contact[] = allPeople ?? [];
  const memberUserIds = new Set(members.map((m) => m.userId));
  
  // Create an assignable people list directly from project members so everyone (including the current user) can be assigned
  const peopleList = getProjectMemberContacts(members);

  // Contacts eligible to be invited: linked, not already a member
  const invitableContacts = allPeopleList.filter(
    (c) => c.linkedUserId && !memberUserIds.has(c.linkedUserId)
  );

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

  // Expose collapse/expand to parent via refs
  useEffect(() => {
    if (collapseAllRef) collapseAllRef.current = collapseAll;
    if (expandAllRef) expandAllRef.current = expandAll;
  });

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

    const current = localRef.current;
    const updated = {
      ...current,
      subprojects: (current.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId ? { ...t, ...changes } : t,
          ),
        };
      }),
    };
    setLocalAndApply(updated);
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
              // sortMode is persisted state — prefer local value if set, then fall back to prop.
              // This guards against out-of-order API responses overwriting the user's choice.
              sortMode: existing?.sortMode ?? s.sortMode,
            };
          })
        : [],
    } as LocalProject));
  }, [project]);

  useEffect(() => {
    if (!targetTaskId) return;
    setEditorTaskId(targetTaskId);
    setLocal(previous => ({
      ...previous,
      subprojects: previous.subprojects.map(subproject =>
        subproject.tasks.some(task => task.id === targetTaskId)
          ? { ...subproject, collapsed: false }
          : subproject
      ),
    }));
  }, [targetTaskId, project.id]);

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

  const updateSubSortMode = (id: string, mode: 'none' | 'due_date' | 'alphabetical') => {
    const updatedSubprojects = (local.subprojects || []).map((s) =>
      s.id === id ? { ...s, sortMode: mode } : s,
    );
    setLocal({ ...local, subprojects: updatedSubprojects });
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

  // Splits pasted text into individual task titles: newline-separated, or
  // comma-separated (CSV) when pasted as a single line/row.
  const parseImportText = (raw: string): string[] => {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== "");
    if (lines.length === 0) return [];
    const firstLine = lines[0];
    if (lines.length === 1 && firstLine && firstLine.includes(",")) {
      return firstLine
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");
    }
    return lines;
  };

  const openImportModal = (subId: string) => {
    setImportSubId(subId);
    setImportText("");
    setImportPreview([]);
  };

  const closeImportModal = () => {
    setImportSubId(null);
    setImportText("");
    setImportPreview([]);
  };

  const handleImportTextChange = (text: string) => {
    setImportText(text);
    setImportPreview(parseImportText(text).map((t) => ({ id: generateId(), text: t })));
  };

  const removeImportPreviewItem = (id: string) => {
    setImportPreview((items) => items.filter((i) => i.id !== id));
  };

  const confirmImportTasks = () => {
    if (!importSubId || importPreview.length === 0) {
      closeImportModal();
      return;
    }
    const newTasks: ProjectTask[] = importPreview.map((item) => ({
      id: generateId(),
      text: item.text,
      done: false,
      dueDate: null,
      favorite: false,
      people: [],
    }));
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== importSubId) return s;
        return {
          ...s,
          tasks: [...(s.tasks || []), ...newTasks],
        };
      }),
    };
    setLocal(updated);
    safeOnApplyChange(updated);
    closeImportModal();
  };

  const handleTaskToggle = (subId: string, taskId: string) => {
    if (!canManage) return;
    const current = localRef.current;
    const completedAt = new Date();
    const updated = {
      ...current,
      subprojects: updateProjectTask(
        current.subprojects || [],
        subId,
        taskId,
        (task) => {
          const completed = { ...task, done: !task.done };
          if (!completed.done) return { ...completed, completedAt: null };
          if (completed.recurrence) {
            return advanceRecurringTask(completed, completedAt) ?? completed;
          }
          return { ...completed, completedAt: completedAt.toISOString() };
        },
      ),
    };
    setLocalAndApply(updated);
  };

  const handleTaskDelete = (subId: string, taskId: string) => {
    if (!canManage) return;
    const current = localRef.current;
    const updated = {
      ...current,
      subprojects: deleteProjectTask(current.subprojects || [], subId, taskId),
    };
    setLocalAndApply(updated);
    if (editorTaskId === taskId) setEditorTaskId(null);
  };

  const handleTaskStar = (subId: string, taskId: string) => {
    const updated = {
      ...local,
      subprojects: updateProjectTask(
        local.subprojects || [],
        subId,
        taskId,
        (task) => ({ ...task, favorite: !task.favorite }),
      ),
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
    const currentUserName = members.find((m) => m.userId === currentUserId)?.name;
    return (applyFilters(flat, taskFilters, searchQuery, { currentUserName }) as unknown) as FlatTask[];
  }, [local.subprojects, JSON.stringify(taskFilters), searchQuery, members, currentUserId]);

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

  // Show flat filter view whenever any filter except 'hide_completed' is active
  const showFlatFilterView = taskFilters.length > 0 && !taskFilters.includes('hide_completed');

  const membersBar = (
    <div className="project-members-bar">
      {members.map((m) => (
        <div key={m.userId} className="project-member-avatar-wrap" title={m.name}>
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt={m.name} className="project-member-avatar" />
          ) : (
            <span className="project-member-avatar project-member-avatar--initials">
              {m.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      <button
        type="button"
        className="invite-members-btn"
        title="Invite a connection to this project"
        aria-label="Invite to project"
        onClick={() => setShowInviteModal(true)}
      >
        <span className="material-icons" aria-hidden="true">person_add</span>
        <span className="btn-label">Invite</span>
      </button>
    </div>
  );

  const projectTools = (
    <div className="project-editor-task-toolbar" role="group" aria-label="Project tools">
      {taskToolbar}
      {(['view', 'more'] as const).map((panel) => (
        <button
          key={panel}
          type="button"
          className={`project-action-btn${openToolPanel === panel ? ' project-action-btn--active' : ''}`}
          aria-label={panel === 'view' ? 'View options' : 'More project actions'}
          aria-expanded={openToolPanel === panel}
          aria-controls={`${toolPanelId}-${panel}`}
          onClick={(event) => {
            toolTriggerRef.current = event.currentTarget;
            setOpenToolPanel(openToolPanel === panel ? null : panel);
          }}
        >
          <span className="material-icons" aria-hidden="true">{panel === 'view' ? 'tune' : 'more_horiz'}</span>
          <span>{panel === 'view' ? 'View' : 'More'}</span>
        </button>
      ))}
    </div>
  );

  const toolOptions = openToolPanel && (
    <div
      id={`${toolPanelId}-${openToolPanel}`}
      role="group"
      aria-label={openToolPanel === 'view' ? 'View options' : 'More project actions'}
      className="project-editor-tool-options"
      onClick={(event) => {
        const button = event.target instanceof Element ? event.target.closest('button') : null;
        if (button && !button.hasAttribute('data-keep-open')) closeToolPanel();
      }}
    >
      <button
        type="button"
        className="project-editor-tool-options-close"
        aria-label={openToolPanel === 'view' ? 'Close view options' : 'Close more project actions'}
      >
        <span className="material-icons" aria-hidden="true">close</span>
      </button>
      {openToolPanel === 'view' ? (
        <>
          {onToggleFilter && (
            <label>
              <input
                type="checkbox"
                checked={!taskFilters.includes('hide_completed')}
                onChange={(e) => onToggleFilter(e.target.checked ? null : 'hide_completed')}
              />
              <span>Show completed tasks</span>
            </label>
          )}
          <button type="button" onClick={expandAll}>
            <span className="material-icons" aria-hidden="true">unfold_more</span>
            <span>Expand all sections</span>
          </button>
          <button type="button" onClick={collapseAll}>
            <span className="material-icons" aria-hidden="true">unfold_less</span>
            <span>Collapse all sections</span>
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setShowOverviewEditor(true)}>
            <span className="material-icons" aria-hidden="true">edit</span>
            <span>Project overview</span>
          </button>
          {projectActions}
          {onExport && (
            <button type="button" onClick={onExport}>
              <span className="material-icons" aria-hidden="true">download</span>
              <span>Export JSON</span>
            </button>
          )}
          {onArchiveToggle && (
            <button type="button" onClick={() => onArchiveToggle(!local.archived)}>
              <span className="material-icons" aria-hidden="true">{local.archived ? 'unarchive' : 'archive'}</span>
              <span>{local.archived ? 'Restore project' : 'Complete & archive'}</span>
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      className="project-editor"
      ref={editorContainerRef}
    >
      <div
        className={`dashboard-project-header${dashboardProjectHeaderTop ? ' dashboard-project-header--tile' : ''}`}
        style={{
          '--project-color': local.color || '#1a73e8',
        } as React.CSSProperties}
      >
        {dashboardProjectHeaderTop && (
          <div className="dashboard-project-title-row">
            {dashboardProjectHeaderTop(membersBar)}
          </div>
        )}

        {!dashboardProjectHeaderTop && (
          <div className="project-editor-header-controls">
            {membersBar}
            {projectTools}
          </div>
        )}
      </div>

      <div
        key={workspaceView}
        className={`project-editor-workspace project-editor-workspace--${workspaceDirection}`}
        data-workspace-view={workspaceView}
      >
      {dashboardProjectHeaderTop && !workspaceContent && (
        <div className="project-editor-actions-area">
          {projectTools}
          {taskFilterPanel}
          {toolOptions}
        </div>
      )}
      {!dashboardProjectHeaderTop && Boolean(taskFilterPanel || toolOptions) && (
        <div className="project-editor-actions-area">
          {taskFilterPanel}
          {toolOptions}
        </div>
      )}

      {/* Import Tasks Modal */}
      {importSubId && (
        <div className="project-overview-modal-overlay" onClick={closeImportModal}>
          <div className="project-overview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="project-overview-modal-header">
              <h2>Import Tasks</h2>
              <button className="project-overview-modal-close" onClick={closeImportModal} title="Close">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="project-overview-modal-content">
              <p style={{ marginTop: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Paste a list of tasks, one per line, or a comma-separated list.
              </p>
              <textarea
                value={importText}
                onChange={(e) => handleImportTextChange(e.target.value)}
                placeholder={"Buy groceries\nCall the plumber\nFinish report"}
                rows={6}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color, #d0d5dd)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                autoFocus
              />
              {importPreview.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    {importPreview.length} task{importPreview.length === 1 ? '' : 's'} to import
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 240, overflowY: 'auto' }}>
                    {importPreview.map((item) => (
                      <li
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 4px',
                          borderBottom: '1px solid var(--border-color, #eee)',
                        }}
                      >
                        <span style={{ flex: 1, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => removeImportPreviewItem(item.id)}
                          title="Remove"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                        >
                          <span className="material-icons" style={{ fontSize: 18 }}>close</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button
                  onClick={closeImportModal}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color, #d0d5dd)',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImportTasks}
                  disabled={importPreview.length === 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: importPreview.length === 0 ? '#a5b4fc' : 'var(--accent-primary, #4f46e5)',
                    color: 'white',
                    cursor: importPreview.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Import {importPreview.length > 0 ? importPreview.length : ''} task{importPreview.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="project-overview-modal-overlay" onClick={() => { setShowInviteModal(false); }}>
          <div className="project-overview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="project-overview-modal-header">
              <h2>Invite to project</h2>
              <button
                className="project-overview-modal-close"
                onClick={() => { setShowInviteModal(false); }}
                title="Close"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="project-overview-modal-content">
              {invitableContacts.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  {allPeopleList.some((c) => c.linkedUserId)
                    ? 'All your connections are already members.'
                    : 'No linked connections found. Connect with people in the Contacts tab first.'}
                </p>
              )}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {invitableContacts
                  .map((c) => (
                    <li
                      key={c.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer', borderRadius: 6 }}
                      className="invite-contact-row"
                      onClick={() => {
                        if (!c.linkedUserId) return;
                        onInviteMember?.({
                          userId: c.linkedUserId,
                          name: c.realName || c.name,
                          ...(c.avatarUrl ? { avatarUrl: c.avatarUrl } : {}),
                          role: 'member',
                        });
                        setShowInviteModal(false);
                      }}
                    >
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span className="project-member-avatar project-member-avatar--initials" style={{ width: 32, height: 32, fontSize: 14 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.realName || c.name}</div>
                        {c.realEmail && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.realEmail}</div>}
                      </div>
                      <span className="material-icons" style={{ marginLeft: 'auto', color: 'var(--accent-primary)', fontSize: 20 }}>add</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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
                <DashboardMetricCard
                  icon="task_alt"
                  label="Tasks remaining"
                  value={tasksRemaining}
                  accent="danger"
                />
                <DashboardMetricCard
                  icon="schedule"
                  label="Effort remaining"
                  value={`${Math.round(effortRemaining * 10) / 10}d`}
                  accent="info"
                />
                <DashboardMetricCard
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
                <div className="project-overview-avatar-preview">
                  
                  {/* Left Column: Image and Link */}
                  <div className="project-overview-avatar-left">
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={local.avatarUrl || effectiveDefaultIconUrl} 
                        alt="Project preview" 
                        className="project-overview-avatar-img"
                      />
                    </div>
                    {local.avatarUrl && local.avatarUrl.startsWith('http') && (
                      <a 
                        href={local.avatarUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="project-overview-avatar-link"
                        title={local.avatarUrl}
                      >
                        Source Link
                      </a>
                    )}
                    {!local.avatarUrl && (
                      <span className="project-overview-avatar-hint">Suggested default icon</span>
                    )}
                  </div>

                  {/* Right Column: Toggle Switch and Input Area */}
                  <div className="project-overview-avatar-right">
                    
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
                <label className="project-editor-field-label" htmlFor={`project-external-url-${project.id}`}>
                  <span className="material-icons field-icon" aria-hidden="true">link</span>
                  External Link
                </label>
                <input
                  id={`project-external-url-${project.id}`}
                  type="url"
                  className="project-editor-link-input"
                  value={externalUrlDraft}
                  onChange={(e) => {
                    setExternalUrlDraft(e.target.value);
                    setExternalUrlError('');
                  }}
                  onBlur={() => {
                    if (!canManage) return;
                    const value = externalUrlDraft.trim();
                    if (value && !isValidExternalUrl(value)) {
                      setExternalUrlError('Enter a valid link starting with https:// or http://.');
                      return;
                    }
                    setExternalUrlDraft(value);
                    setExternalUrlError('');
                    if (value !== (localRef.current.externalUrl ?? '')) {
                      updateProjectField('externalUrl', value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="https://example.com"
                  disabled={!canManage}
                  aria-invalid={Boolean(externalUrlError)}
                  aria-describedby={externalUrlError ? `project-external-url-error-${project.id}` : undefined}
                />
                {externalUrlError && (
                  <p id={`project-external-url-error-${project.id}`} role="alert">{externalUrlError}</p>
                )}
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
              {onRemoveMember && members.some((member) => member.userId === currentUserId) && (
                <div className="project-overview-leave">
                  <div>
                    <h3>Leave project</h3>
                    <p>You will lose access to this project unless you are invited again.</p>
                  </div>
                  <button
                    type="button"
                    className={`project-overview-leave-btn${leaveArmed ? ' project-overview-leave-btn--armed' : ''}`}
                    onClick={() => {
                      if (!leaveArmed) {
                        setLeaveArmed(true);
                        return;
                      }
                      setLeaveArmed(false);
                      onRemoveMember(currentUserId);
                      setShowOverviewEditor(false);
                    }}
                    onBlur={() => setLeaveArmed(false)}
                  >
                    <span className="material-icons" aria-hidden="true">{leaveArmed ? 'warning' : 'logout'}</span>
                    {leaveArmed ? 'Confirm leave project' : 'Leave project'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {workspaceContent ?? <div className="project-editor-content">
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
        <div className="subprojects-drag-hint-row">
          <DismissibleHint
            storageKey="subproject-drag-hint-dismissed"
            direction="down"
            lines={[
              'Drag...Tasks 2 re-order them',
              'Drag...Tasks 2 move between sub-projects',
              'Drag...Sub-projects 2 reorder',
            ]}
          />
        </div>
      {(local.subprojects || []).map((sub) => (
        <SubprojectEditor
          key={sub.id}
          sub={sub}
          project={local}
          editorTaskId={editorTaskId}
          setEditorTaskId={handleSetEditorId}
          onDelete={() => deleteSubproject(sub.id)}
          {...(onConvertSubprojectToProject && !sub.isProjectLevel
            ? { onConvertToProject: () => onConvertSubprojectToProject(sub.id) }
            : {})}
          onUpdateText={(text) => updateSubText(sub.id, text)}
          onUpdateColor={(color) => updateSubColor(sub.id, color)}
          onToggleCollapse={() => toggleSubCollapse(sub.id)}
          onAddTask={(text, allowBlank) => addTask(sub.id, text, allowBlank)}
          onImportTasks={() => openImportModal(sub.id)}
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
          taskFilters={taskFilters as any[]}
          currentUserName={members.find((m) => m.userId === currentUserId)?.name}
          onSortModeChange={(subId, mode) => updateSubSortMode(subId, mode)}
          {...(onTaskChatClick ? { onTaskChatClick } : {})}
          {...(taskCommentCounts ? { taskCommentCounts } : {})}
        />
      ))}
        </div>
      )}
    </div>}
      </div>

    </div>
  );
}
