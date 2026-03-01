'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createProjectsApiClient } from '@/lib/client/projectsApi';
import type { ProjectItem } from '@/lib/server/projectsStore';
import ProjectsDashboard from './ProjectsDashboard';
import { PROJECT_COLORS } from './ProjectTile';

const ProjectsDashboardAny = ProjectsDashboard as any;

type Props = {
  canManage: boolean;
};

export default function ProjectsPage({ canManage }: Props) {
  const searchParams = useSearchParams();
  const embeddedUid = searchParams.get('uid') ?? '';
  const apiClient = useMemo(() => createProjectsApiClient('', { uid: embeddedUid }), [embeddedUid]);

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newlyAddedSubprojectId, setNewlyAddedSubprojectId] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [undoSnackbar, setUndoSnackbar] = useState<{ message: string; onUndo: () => void } | null>(null);
  const pendingBlankSubRef = useRef(false);
  const pendingProjectDeleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProjectDeleteIdRef = useRef<string | null>(null);
  const isEmbedded = searchParams.get('embedded') === '1';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const loaded = await apiClient.listProjects();
        if (active) setProjects(loaded);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Failed to load projects');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiClient]);

  useEffect(() => {
    if (!isEmbedded) return;
    setProjectSearch(searchParams.get('q') ?? '');
  }, [isEmbedded, searchParams]);

  useEffect(() => {
    return () => {
      if (pendingProjectDeleteTimeoutRef.current) {
        clearTimeout(pendingProjectDeleteTimeoutRef.current);
      }
    };
  }, []);

  const closeUndoSnackbar = () => setUndoSnackbar(null);

  const showUndoSnackbar = (message: string, onUndo: () => void) => {
    setUndoSnackbar({ message, onUndo });
  };

  const handleAddProject = async (text = 'New Project') => {
    if (!canManage) return;
    if (!text || typeof text !== 'string') text = 'New Project';

    const len = projects.length;
    const idx = len % PROJECT_COLORS.length;
    const color = PROJECT_COLORS[idx];

    const baseName = text.trim();
    const created = await apiClient.createProject({
      text: baseName || 'New Project',
      ...(color ? { color } : {}),
    });
    setProjects((prev) => [...prev, created]);
    setEditingProjectId(created.id);
  };

  const handleProjectApplyChange = async (projectId: string, updated: Partial<ProjectItem>) => {
    if (!canManage) return;
    if (updated.subprojects) {
      const hasBlank = updated.subprojects.some((sub) => !sub.text || sub.text.trim() === '');
      pendingBlankSubRef.current = hasBlank;
    }

    const next = await apiClient.updateProject(projectId, updated);
    setProjects((prev) => prev.map((item) => (item.id === projectId ? next : item)));
  };

  const handleProjectTitleChange = async (projectId: string, newText: string) => {
    if (!canManage) return;
    if (!newText || !newText.trim()) return;
    const updated = await apiClient.updateProject(projectId, { text: newText.trim() });
    setProjects((prev) => prev.map((item) => (item.id === projectId ? updated : item)));
  };

  const handleProjectColorChange = async (projectId: string, newColor: string) => {
    if (!canManage) return;
    const updated = await apiClient.updateProject(projectId, { color: newColor });
    setProjects((prev) => prev.map((item) => (item.id === projectId ? updated : item)));
  };

  const handleReorderProjects = async (draggedProjectId: string, targetProjectId: string) => {
    if (!canManage) return;

    const draggedIndex = projects.findIndex((project) => project.id === draggedProjectId);
    const targetIndex = projects.findIndex((project) => project.id === targetProjectId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...projects];
    const [removed] = reordered.splice(draggedIndex, 1);
    if (!removed) return;
    reordered.splice(targetIndex, 0, removed);
    setProjects(reordered);

    await Promise.all(
      reordered.map((project, index) => apiClient.updateProject(project.id, { order: index })),
    );
  };

  const handleAddSubproject = async (name = '') => {
    if (!canManage || !editingProjectId) return;
    const project = projects.find((item) => item.id === editingProjectId);
    if (!project) return;

    if ((project.subprojects || []).some((sub) => !sub.text || sub.text.trim() === '')) {
      return;
    }

    if (!name.trim()) {
      pendingBlankSubRef.current = true;
    }

    const newSub = {
      id: crypto.randomUUID(),
      text: (name || '').trim(),
      tasks: [],
      collapsed: false,
      isProjectLevel: false,
    };
    const updatedSubprojects = [...(project.subprojects || []), newSub];
    const updatedProject = await apiClient.updateProject(editingProjectId, { subprojects: updatedSubprojects });
    setNewlyAddedSubprojectId(newSub.id);
    setProjects((prev) => prev.map((item) => (item.id === editingProjectId ? updatedProject : item)));
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!canManage) return;

    const currentProjects = [...projects];
    const deletedIndex = currentProjects.findIndex((item) => item.id === projectId);
    if (deletedIndex === -1) return;
    const deletedProject = currentProjects[deletedIndex];
    if (!deletedProject) return;

    if (pendingProjectDeleteTimeoutRef.current) {
      clearTimeout(pendingProjectDeleteTimeoutRef.current);
      pendingProjectDeleteTimeoutRef.current = null;
      pendingProjectDeleteIdRef.current = null;
    }

    const deletedWasEditing = editingProjectId === projectId;
    setProjects((prev) => prev.filter((item) => item.id !== projectId));
    if (deletedWasEditing) {
      setEditingProjectId(null);
    }

    pendingProjectDeleteIdRef.current = projectId;
    pendingProjectDeleteTimeoutRef.current = setTimeout(() => {
      void apiClient.deleteProject(projectId);
      if (pendingProjectDeleteIdRef.current === projectId) {
        pendingProjectDeleteIdRef.current = null;
      }
      setUndoSnackbar((current) =>
        current?.message === 'Project deleted'
          ? null
          : current,
      );
    }, 5000);

    showUndoSnackbar('Project deleted', () => {
      if (pendingProjectDeleteIdRef.current !== projectId) return;
      if (pendingProjectDeleteTimeoutRef.current) {
        clearTimeout(pendingProjectDeleteTimeoutRef.current);
        pendingProjectDeleteTimeoutRef.current = null;
      }
      pendingProjectDeleteIdRef.current = null;
      setProjects((prev) => {
        const restored = [...prev];
        const targetIndex = Math.min(Math.max(deletedIndex, 0), restored.length);
        restored.splice(targetIndex, 0, deletedProject);
        return restored;
      });
      if (deletedWasEditing) {
        setEditingProjectId(projectId);
      }
      closeUndoSnackbar();
    });
  };

  const handleSubprojectDeleted = async (payload: {
    projectId: string;
    subproject: any;
    index: number;
  }) => {
    if (!canManage) return;
    const { projectId, subproject, index } = payload;
    showUndoSnackbar('Sub-project deleted', () => {
      setProjects((prev) => {
        const project = prev.find((item) => item.id === projectId);
        if (!project) return prev;
        const existingSubprojects = [...(project.subprojects || [])];
        const nextSubprojects = [...existingSubprojects];
        const targetIndex = Math.min(Math.max(index, 0), nextSubprojects.length);
        nextSubprojects.splice(targetIndex, 0, subproject);

        const updatedProject = { ...project, subprojects: nextSubprojects };
        void apiClient.updateProject(projectId, { subprojects: nextSubprojects });
        return prev.map((item) => (item.id === projectId ? updatedProject : item));
      });
      closeUndoSnackbar();
    });
  };

  const handleToggleFilter = (filterType: string | null) => {
    if (filterType === null) {
      setFilters([]);
      return;
    }
    setFilters((prev) =>
      prev.includes(filterType) ? prev.filter((item) => item !== filterType) : [...prev, filterType],
    );
  };

  return (
    <main className="main-layout">
      <div className="container" style={{ overflow: 'auto' }}>
        {!isEmbedded ? (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#fff' }}>
            <input
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
              placeholder={editingProjectId ? 'Search tasks…' : 'Search projects…'}
              style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 8, border: '1px solid #d0d7de', padding: '0 10px' }}
            />
          </div>
        ) : null}

        {!canManage ? <div style={{ margin: '0 16px 8px', color: '#8a6d3b' }}>Read-only mode: sign in is required to manage projects.</div> : null}
        {loading ? <div style={{ margin: '0 16px 8px' }}>Loading projects…</div> : null}
        {errorMessage ? <div style={{ margin: '0 16px 8px', color: '#b3261e' }}>{errorMessage}</div> : null}

        <ProjectsDashboardAny
          projects={projects}
          people={[]}
          selectedProjectId={editingProjectId}
          onSelectProject={setEditingProjectId}
          onApplyChange={handleProjectApplyChange}
          onAddSubproject={handleAddSubproject}
          newlyAddedSubprojectId={newlyAddedSubprojectId}
          onClearNewSubproject={() => setNewlyAddedSubprojectId(null)}
          onSubprojectDeleted={handleSubprojectDeleted}
          onColorChange={handleProjectColorChange}
          onReorder={handleReorderProjects}
          onDeleteProject={handleDeleteProject}
          onAddProject={handleAddProject}
          onOpenPeople={() => {}}
          onCreatePerson={async () => null}
          onTitleChange={handleProjectTitleChange}
          projectSearch={projectSearch}
          filters={filters}
          onToggleFilter={handleToggleFilter}
        />

        {undoSnackbar ? (
          <div className="undo-snackbar" role="status" aria-live="polite">
            <div className="snack-content">
              <span className="snack-message">{undoSnackbar.message}</span>
              <div className="snack-actions">
                <button
                  type="button"
                  className="snack-button undo-button"
                  onClick={() => undoSnackbar.onUndo()}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="snack-button dismiss-button"
                  onClick={closeUndoSnackbar}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
