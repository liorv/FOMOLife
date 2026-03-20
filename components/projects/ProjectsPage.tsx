"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createProjectsApiClient } from "@myorg/api-client";
import { createContactsApiClient } from "@myorg/api-client";
import type { ProjectItem, ProjectSubproject, Contact } from "@myorg/types";
import { generateId } from "@myorg/utils";
import ProjectsDashboard from "./ProjectsDashboard";
import layoutStyles from "../../styles/projects/layout.module.css";
import { PROJECT_COLORS, ColorPickerOverlay } from "@myorg/ui";

// ProjectsDashboard is now a typed TSX component

export type Props = {
  canManage: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export default function ProjectsPage({ canManage, style, className }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const embeddedUid = searchParams.get("uid") ?? "";
  const apiClient = useMemo(
    () => createProjectsApiClient("", { uid: embeddedUid }),
    [embeddedUid],
  );
  // Contacts are served from the same origin in the monolith.
  const contactsClient = useMemo(() => createContactsApiClient(""), []);

  const handleCreatePerson = async (name: string) => {
    try {
      const created = await contactsClient.createContact({ name });
      setPeople((prev) =>
        prev.find((p) => p.name === created.name) ? prev : [...prev, created],
      );
      try {
        localStorage.setItem("fomo:contactsUpdated", Date.now().toString());
      } catch {}
      return created;
    } catch (err) {
      console.warn("[Projects] failed to create person", err);
      return null;
    }
  };

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [people, setPeople] = useState<Contact[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newlyAddedSubprojectId, setNewlyAddedSubprojectId] = useState<
    string | null
  >(null);

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
    (async () => {
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


        if (active) {
          setProjects(loadedProjects);
          setPeople(loadedContacts);
        }
      } catch (error) {
        if (active)
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load projects",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiClient, contactsClient]);

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

    const baseName = text.trim() || "New Project";
    const tempId = generateId();
    const optimisticProject: ProjectItem = {
      id: tempId,
      text: baseName,
      color: color ?? "",
      subprojects: [],
    };
    setProjects((prev) => [...prev, optimisticProject]);
    try {
      const created = await apiClient.createProject({
        text: baseName,
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

  const handleGenerateProject = async (data: any, formData: {goal: string, targetDate: string, context: string}) => {
    if (!canManage) return;

    try {
      const subprojects = Array.isArray(data.sub_projects) ? data.sub_projects.map((sp: any) => {
        return {
          id: generateId(),
          text: sp.title || sp.text || 'Untitled Subproject',
          tasks: Array.isArray(sp.tasks) ? sp.tasks.map((t: any) => {
            let dueDateVal: string | null = null;
            if (typeof t.deadline_offset_days === 'number') {
              const date = new Date();
              date.setDate(date.getDate() + t.deadline_offset_days);
              dueDateVal = date.toISOString().split('T')[0] ?? null;
            }
            return {
              id: generateId(),
              text: t.description,
              done: false,
              favorite: t.priority === 'High',
              priority: t.priority ? t.priority.toLowerCase() : null,
              effort: t.effort || null,
              dueDate: dueDateVal,
            };
          }) : []
        };
      }) : [];

      const createInput: any = {
        text: data.project_name?.trim() || 'Untitled AI Project',
        subprojects,
      };
      if (formData.goal) createInput.goal = formData.goal;
      if (formData.context) createInput.description = formData.context;
      if (formData.targetDate) createInput.dueDate = formData.targetDate;

      const created = await apiClient.createProject(createInput);
      setProjects(prev => [...prev, created]);
      setEditingProjectId(created.id);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate project",
      );
      throw err;
    }
  };

  const handleEnhanceProject = async (projectId: string, data: any, formData: {goal: string, targetDate: string, context: string}) => {
    if (!canManage) return;

    try {
      const subprojects = Array.isArray(data.sub_projects) ? data.sub_projects.map((sp: any) => {
        return {
          id: generateId(),
          text: sp.title || sp.text || 'Untitled Subproject',
          tasks: Array.isArray(sp.tasks) ? sp.tasks.map((t: any) => {
            let dueDateVal: string | null = null;
            if (typeof t.deadline_offset_days === 'number') {
              const date = new Date();
              date.setDate(date.getDate() + t.deadline_offset_days);
              dueDateVal = date.toISOString().split('T')[0] ?? null;
            }
            return {
              id: generateId(),
              text: t.description,
              done: t.done || false,
              favorite: t.priority === 'High',
              priority: t.priority ? t.priority.toLowerCase() : null,
              effort: t.effort || null,
              dueDate: dueDateVal,
            };
          }) : []
        };
      }) : [];

      const updateInput: any = {
        text: data.project_name?.trim() || 'Untitled AI Project',
        subprojects,
      };
      if (formData.goal) updateInput.goal = formData.goal;
      if (formData.context) updateInput.description = formData.context;
      if (formData.targetDate) updateInput.dueDate = formData.targetDate;

      const updated = await apiClient.updateProject(projectId, updateInput);
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to enhance project",
      );
      throw err;
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
      const next = await apiClient.updateProject(projectId, updated);
      setProjects((prev) =>
        prev.map((item) => (item.id === projectId ? next : item)),
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update project",
      );
    }
  };

  const handleProjectTitleChange = async (
    projectId: string,
    newText: string,
  ) => {
    if (!canManage) return;
    if (!newText || !newText.trim()) return;
    const updated = await apiClient.updateProject(projectId, {
      text: newText.trim(),
    });
    setProjects((prev) =>
      prev.map((item) => (item.id === projectId ? updated : item)),
    );
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
      const next = await apiClient.updateProject(projectId, {
        color: newColor,
      });
      setProjects((prev) =>
        prev.map((item) => (item.id === projectId ? next : item)),
      );
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
        apiClient.updateProject(project.id, { order: index }),
      ),
    );
  };

  
  const handleReprioritize = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.subprojects) return;

    // A better approach to "Re-prioritize" or "Sort Tasks"
    // We sort tasks WITHIN their subprojects primarily by Due Date, and secondarily by Priority.
    // This honors chronological dependencies but bubbles up the highest risk/importance items.

    const prioWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    
    const newSubprojects = JSON.parse(JSON.stringify(project.subprojects));

    newSubprojects.forEach((sub: any) => {
      if (sub.tasks) {
        sub.tasks.sort((a: any, b: any) => {
          // 1. Sort by Date first
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          
          if (dateA !== dateB) {
            return dateA - dateB;
          }

          // 2. If dates tie, sort by Priority
          const aWeight = (a.priority && prioWeight[a.priority]) || 0;
          const bWeight = (b.priority && prioWeight[b.priority]) || 0;
          
          return bWeight - aWeight; // Descending (High Priority first)
        });
      }
    });

    handleProjectApplyChange(projectId, { subprojects: newSubprojects });
  };

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
      const updatedProject = await apiClient.updateProject(projectId, {
        subprojects: optimisticSubs,
      });
      setProjects((prev) =>
        prev.map((item) => (item.id === projectId ? updatedProject : item)),
      );
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
    if (editingProjectId === projectId) setEditingProjectId(null);
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
    !displayReady || style?.display === "none" ? "content-panel-hidden" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
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

            <ProjectsDashboard
              projects={projects}
              people={people}
              selectedProjectId={editingProjectId}
              onSelectProject={setEditingProjectId}
              onReprioritize={handleReprioritize}
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
              onGenerateProject={handleGenerateProject}
              onEnhanceProject={handleEnhanceProject}
              onOpenColorPicker={handleOpenColorPicker}
              onOpenPeople={openContacts}
              onCreatePerson={handleCreatePerson}
              onTitleChange={handleProjectTitleChange}
              projectSearch={projectSearch}
              filters={filters}
              onToggleFilter={handleToggleFilter}
            />

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
  );
}
