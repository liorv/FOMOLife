"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createProjectsApiClient, createTasksApiClient } from "@myorg/api-client";
import { createContactsApiClient } from "@myorg/api-client";
import type { ProjectItem, ProjectSubproject, Contact, TaskItem } from "@myorg/types";
import { generateId } from "@myorg/utils";
import ProjectsDashboard from "./ProjectsDashboard";
import layoutStyles from "../../styles/projects/layout.module.css";
import { PROJECT_COLORS, ColorPickerOverlay } from "@myorg/ui";
import GlobalSearchResults, { type FeedbackItem } from "../GlobalSearchResults";
import ContentHeader from "../ContentHeader";

// ProjectsDashboard is now a typed TSX component

export type Props = {
  canManage: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export default function ProjectsPage({ canManage, style, className }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const embeddedUid = searchParams.get("uid") ?? "";
  const initialProjectId = searchParams.get("projectId") || null;
  const apiClient = useMemo(
    () => createProjectsApiClient("", { uid: embeddedUid }),
    [embeddedUid],
  );
  // Contacts are served from the same origin in the monolith.
  const contactsClient = useMemo(() => createContactsApiClient(""), []);
  const tasksClient = useMemo(() => createTasksApiClient(""), []);

  // --- API helper wrappers to centralize optimistic updates and error handling
  const apiUpdateProject = async (projectId: string, updated: Partial<ProjectItem>) => {
    try {
      const next = await apiClient.updateProject(projectId, updated);
      setProjects((prev) => prev.map((item) => (item.id === projectId ? next : item)));
      return next;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    }
  };

  const apiCreatePerson = async (name: string) => {
    try {
      const created = await contactsClient.createContact({ name });
      setPeople((prev) => (prev.find((p) => p.name === created.name) ? prev : [...prev, created]));
      try { localStorage.setItem('fomo:contactsUpdated', Date.now().toString()); } catch {}
      return created;
    } catch (err) {
      console.warn('[Projects] failed to create person', err);
      throw err;
    }
  };

  const handleCreatePerson = async (name: string) => {
    try {
      return await apiCreatePerson(name);
    } catch (err) {
      return null;
    }
  };

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [people, setPeople] = useState<Contact[]>([]);
  const [globalTasks, setGlobalTasks] = useState<TaskItem[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(initialProjectId);
  const [newlyAddedSubprojectId, setNewlyAddedSubprojectId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const onNav = (e: CustomEvent) => {
      if (e.detail?.projectId) {
        setEditingProjectId(e.detail.projectId);
      }
    };
    window.addEventListener('framework-navigate-project', onNav as EventListener);
    return () => {
      window.removeEventListener('framework-navigate-project', onNav as EventListener);
    };
  }, []);

  useEffect(() => {
    if (initialProjectId) {
      setEditingProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null);

  const handleOpenColorPicker = (projectId: string) => {
    setColorPickerProjectId(projectId);
  };

const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<
    string | null
  >(null);
  const [filters, setFilters] = useState<string[]>([]);
  const projectSearch = searchParams.get('q') || '';
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // display ready state - only show content after framework acknowledges loading
  // If not embedded, immediately show content for standalone usage and tests
  
  const displayReady = true;
  const [undoSnackbar, setUndoSnackbar] = useState<{
    message: string;
    onUndo: () => void;
    onConfirm?: () => void;
  } | null>(null);
  const pendingBlankSubRef = useRef(false);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const loadedProjects = await apiClient.listProjects();
        let loadedContacts: Contact[] = [];

        try {
          loadedContacts = await contactsClient.listContacts();
        } catch (err) {
          console.warn("[Projects] failed to load contacts", err);
          let msg = "Failed to load contacts";
          if (err instanceof TypeError && err.message === "Failed to fetch") {
            msg =
              "Unable to reach contacts service – make sure it is running";
          } else if (err instanceof Error) {
            msg = err.message;
          }
          setContactsError(msg);
        }

        let loadedTasks: TaskItem[] = [];
        let loadedFeedback: FeedbackItem[] = [];
        try {
          [loadedTasks, loadedFeedback] = await Promise.all([
            tasksClient.listTasks(),
            fetch('/api/feedback').then(r => r.ok ? r.json() : { feedback: [] }).then((d: { feedback: FeedbackItem[] }) => d.feedback),
          ]);
        } catch {
          // non-critical — search will still work with project tasks
        }

        if (active) {
          setProjects(loadedProjects);
          setPeople(loadedContacts);
          setGlobalTasks(loadedTasks);
          setFeedbackItems(loadedFeedback);
        }
      } catch (error) {
        if (active)
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load projects",
          );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [apiClient, contactsClient, tasksClient]);

  // re-pull contacts when the user returns to the tab (might have added contacts elsewhere)
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const updated = await contactsClient.listContacts();
        setPeople(updated);
        setContactsError(null);
      } catch (err) {
        console.warn("[Projects] refresh contacts failed", err);
        let msg = "Failed to load contacts";
        if (err instanceof TypeError && err.message === "Failed to fetch") {
          msg = "Unable to reach contacts service – make sure it is running";
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setContactsError(msg);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [contactsClient]);

  

  

  

  useEffect(() => {
    return () => {
      // cleanup not needed for pending delete
    };
  }, []);

  const closeUndoSnackbar = () => setUndoSnackbar(null);

  const openContacts = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'people');
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  // Flat task list for global search (global tasks + project tasks)
  const allTasksForSearch = useMemo(() => {
    const list: Array<TaskItem & { projectId?: string; projectName?: string; projectIcon?: string | null; source: 'global' | 'project' }> = globalTasks.map(t => ({ ...t, source: 'global' as const }));
    projects.forEach(p => {
      p.subprojects.forEach(sp => {
        sp.tasks.forEach(t => {
          list.push({
            id: t.id,
            text: t.text,
            done: t.done,
            dueDate: t.dueDate,
            favorite: t.favorite || (t as any).starred || false,
            description: t.description || '',
            people: t.people,
            priority: (t as any).priority,
            projectId: p.id,
            projectName: p.text,
            projectIcon: (p as any).avatarUrl || null,
            source: 'project' as const,
          });
        });
      });
    });
    return list;
  }, [globalTasks, projects]);

  const handleGlobalNavigate = useCallback((tab: string, query: string, projectId?: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    if (query) {
      nextParams.set('q', query);
    } else {
      nextParams.delete('q');
    }
    if (projectId) {
      nextParams.set('projectId', projectId);
    } else {
      nextParams.delete('projectId');
    }
    router.push(`${pathname}?${nextParams.toString()}`);
  }, [router, pathname, searchParams]);

  const showUndoSnackbar = (
    message: string,
    onUndo: () => void,
    onConfirm?: () => void,
  ) => {
    setUndoSnackbar({ message, onUndo, ...(onConfirm && { onConfirm }) });
    // If not dismissed within 5 seconds, treat as undo
    setTimeout(() => {
      if (undoSnackbar) {
        undoSnackbar.onUndo();
        setUndoSnackbar(null);
      }
    }, 5000);
  };

  const handleAddProject = async (text = "New Project") => {
    if (!canManage) return;
    if (!text || typeof text !== "string") text = "New Project";

    const len = projects.length;
    const idx = len % PROJECT_COLORS.length;
    const color = PROJECT_COLORS[idx];
    
    // Choose a random twemoji icon for the new project
    const RANDOM_ICONS = [
      'rocket', 'star', 'fire', 'wrapped-gift', 'briefcase', 'laptop', 'memo', 
      'clipboard', 'books', 'rainbow', 'target', 'art', 'bell', 'trophy', 
      'tangerine', 'pizza', 'hamburger', 'doughnut', 'cookie', 'strawberry'
    ];
    const randomIconName = RANDOM_ICONS[Math.floor(Math.random() * RANDOM_ICONS.length)];
    const avatarUrl = `https://api.iconify.design/twemoji/${randomIconName}.svg`;

    const baseName = text.trim() || "New Project";
    const tempId = generateId();
    const optimisticProject: ProjectItem = {
      id: tempId,
      text: baseName,
      color: color ?? "",
      avatarUrl,
      subprojects: [],
    };
    setProjects((prev) => [...prev, optimisticProject]);
    try {
      const created = await apiClient.createProject({
        text: baseName,
        avatarUrl,
        ...(color ? { color } : {}),
      });
      setProjects((prev) =>
        prev.map((item) => (item.id === tempId ? created : item)),
      );
    } catch (err) {
      setProjects((prev) => prev.filter((item) => item.id !== tempId));
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create project",
      );
    }
  };

  // Always persist project changes (including task edits) to backend
  const handleProjectApplyChange = async (
    projectId: string,
    updated: Partial<ProjectItem>,
  ) => {
    if (!canManage) return;
    // If subprojects changed, check for blank subprojects (for UI logic)
    if (updated.subprojects) {
      const hasBlank = updated.subprojects.some(
        (sub) => !sub.text || sub.text.trim() === "",
      );
      pendingBlankSubRef.current = hasBlank;
    }

    // Optimistic update — apply immediately so the UI reflects the change without waiting for the API
    setProjects((prev) =>
      prev.map((item) =>
        item.id === projectId ? { ...item, ...updated } : item,
      ),
    );
    try {
      await apiUpdateProject(projectId, updated);
    } catch (_) {
      // errorMessage already set by helper
    }
  };

  const handleProjectTitleChange = async (
    projectId: string,
    newText: string,
  ) => {
    if (!canManage) return;
    if (!newText || !newText.trim()) return;
    try {
      await apiUpdateProject(projectId, { text: newText.trim() });
    } catch (_) {}
  };

  const handleProjectColorChange = async (
    projectId: string,
    newColor: string,
  ) => {
    if (!canManage) return;
    // Optimistic update
    setProjects((prev) =>
      prev.map((item) =>
        item.id === projectId ? { ...item, color: newColor } : item,
      ),
    );
    try {
      await apiUpdateProject(projectId, { color: newColor });
    } catch (err) {
      console.error("Failed to update project color:", err);
    }
  };

  const handleReorderProjects = async (
    draggedProjectId: string,
    targetProjectId: string,
  ) => {
    if (!canManage) return;

    const draggedIndex = projects.findIndex(
      (project) => project.id === draggedProjectId,
    );
    const targetIndex = projects.findIndex(
      (project) => project.id === targetProjectId,
    );
    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...projects];
    const [removed] = reordered.splice(draggedIndex, 1);
    if (!removed) return;
    reordered.splice(targetIndex, 0, removed);
    setProjects(reordered);

    await Promise.all(
      reordered.map((project, index) =>
        apiUpdateProject(project.id, { order: index }),
      ),
    );
  };

  
  // 'Sort By Timeline' feature removed; reprioritize handler deleted

  const handleAddSubproject = async (projectId: string, name = "") => {
    if (!canManage) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    if (
      (project.subprojects || []).some(
        (sub) => !sub.text || sub.text.trim() === "",
      )
    ) {
      return;
    }

    if (!name.trim()) {
      // Generate automatic name: subproject (i) where i is incremented
      const existingSubs = project.subprojects || [];
      const subprojectRegex = /^subproject \((\d+)\)$/i;
      let maxNum = 0;
      for (const sub of existingSubs) {
        const match = sub.text?.match(subprojectRegex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      name = `subproject (${maxNum + 1})`;
    }

    const newSub: ProjectSubproject = {
      id: generateId(),
      text: name.trim(),
      tasks: [],
      collapsed: true,
      isProjectLevel: false,
    };
    const optimisticSubs = [...(project.subprojects || []), newSub];
    setProjects((prev) =>
      prev.map((item) =>
        item.id === projectId ? { ...item, subprojects: optimisticSubs } : item,
      ),
    );
    setNewlyAddedSubprojectId(newSub.id);
    try {
      await apiUpdateProject(projectId, { subprojects: optimisticSubs });
    } catch (err) {
      setProjects((prev) =>
        prev.map((item) =>
          item.id === projectId
            ? { ...item, subprojects: project.subprojects || [] }
            : item,
        ),
      );
      setNewlyAddedSubprojectId(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to add subproject",
      );
    }
  };

  const handleDeleteProject = (projectId: string) => {
    if (!canManage) return;
    if (pendingDeleteProjectId === projectId) {
      // Cancel pending delete
      setPendingDeleteProjectId(null);
    } else {
      // Start pending delete
      setPendingDeleteProjectId(projectId);
    }
  };

  const handleConfirmDeleteProject = async (projectId: string) => {
    if (!canManage) return;
    const snapshotProjects = projects;
    setProjects((prev) => prev.filter((item) => item.id !== projectId));
    if (editingProjectId === projectId) {
      setEditingProjectId(null);
    }
    setPendingDeleteProjectId(null);
    try {
      await apiClient.deleteProject(projectId);
    } catch (error) {
      setProjects(snapshotProjects);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete project",
      );
    }
  };

  const handleSubprojectDeleted = async (payload: {
    projectId: string;
    subproject: any;
    index: number;
  }) => {
    if (!canManage) return;
    const { projectId, subproject } = payload;
    // Directly remove the subproject
    setProjects((prev) => {
      const project = prev.find((item) => item.id === projectId);
      if (!project) return prev;
      const updatedSubprojects = (project.subprojects || []).filter(
        (sub) => sub.id !== subproject.id,
      );
      const updatedProject = { ...project, subprojects: updatedSubprojects };
      void apiClient.updateProject(projectId, {
        subprojects: updatedSubprojects,
      });
      return prev.map((item) =>
        item.id === projectId ? updatedProject : item,
      );
    });
  };

  const handleToggleFilter = (filterType: string | null) => {
    if (filterType === null) {
      setFilters([]);
      return;
    }
    setFilters((prev) =>
      prev.includes(filterType)
        ? prev.filter((item) => item !== filterType)
        : [...prev, filterType],
    );
  };

  const panelClassName = [
    "projects-content-panel",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div style={style}>
      <ContentHeader title="Projects" />
      <div className={panelClassName}>

          {!canManage ? (
              <div
                className={`${layoutStyles.message} ${layoutStyles.readOnlyMessage}`}
              >
                Read-only mode: sign in is required to manage projects.
              </div>
            ) : null}
            {loading ? (
              <div className={layoutStyles.message}>Loading projects…</div>
            ) : null}
            {errorMessage ? (
              <div
                className={`${layoutStyles.message} ${layoutStyles.errorMessage}`}
              >
                {errorMessage}
              </div>
            ) : null}
            {contactsError ? (
              <div
                className={`${layoutStyles.message} ${layoutStyles.errorMessage}`}
              >
                {contactsError}
              </div>
            ) : null}

            {projectSearch && !loading && !editingProjectId ? (
              <GlobalSearchResults
                searchQuery={projectSearch}
                allTasks={allTasksForSearch}
                projects={projects}
                contacts={people}
                feedbackItems={feedbackItems}
                onNavigate={handleGlobalNavigate}
              />
            ) : (
              <ProjectsDashboard
              projects={projects}
              people={people}
              selectedProjectId={editingProjectId}
              onSelectProject={(id: string | null) => {
                setEditingProjectId(id);
                if (id === null) {
                  const nextParams = new URLSearchParams(searchParams.toString());
                  nextParams.delete('q');
                  nextParams.delete('projectId');
                  router.replace(`${pathname}?${nextParams.toString()}`);
                }
              }}
              onApplyChange={handleProjectApplyChange}
              onAddSubproject={handleAddSubproject}
              newlyAddedSubprojectId={newlyAddedSubprojectId}
              onClearNewSubproject={() => setNewlyAddedSubprojectId(null)}
              onSubprojectDeleted={handleSubprojectDeleted}
              onColorChange={handleProjectColorChange}
              onReorder={handleReorderProjects}
              onDeleteProject={handleDeleteProject}
              pendingDeleteProjectId={pendingDeleteProjectId}
              onConfirmDeleteProject={handleConfirmDeleteProject}
              onAddProject={handleAddProject}
              onOpenColorPicker={handleOpenColorPicker}
              onOpenPeople={openContacts}
              onCreatePerson={handleCreatePerson}
              onTitleChange={handleProjectTitleChange}
              projectSearch={projectSearch}
              filters={filters}
              onToggleFilter={handleToggleFilter}
            />
            )}

          {colorPickerProjectId && (
            <ColorPickerOverlay
              open={!!colorPickerProjectId}
              colors={PROJECT_COLORS}
              selectedColor={
                projects.find((p) => p.id === colorPickerProjectId)?.color ||
                PROJECT_COLORS[0]
              }
              onClose={() => setColorPickerProjectId(null)}
              onSelect={(color: string) => {
                if (colorPickerProjectId)
                  handleProjectColorChange(colorPickerProjectId, color);
                setColorPickerProjectId(null);
              }}
            />
          )}
      </div>
    </div>
  );
}
