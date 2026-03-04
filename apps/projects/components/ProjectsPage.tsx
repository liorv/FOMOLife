'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createProjectsApiClient } from '../lib/client/projectsApi';
import { createContactsApiClient } from '../../contacts/lib/client/contactsApi';
import type { ProjectItem, Contact } from '@myorg/types';
import ProjectsDashboard from './ProjectsDashboard';
import layoutStyles from '../styles/layout.module.css';
import { PROJECT_COLORS } from '@myorg/ui';

// ProjectsDashboard is now a typed TSX component

type Props = {
  canManage: boolean;
};

export default function ProjectsPage({ canManage }: Props) {
  const searchParams = useSearchParams();
  const embeddedUid = searchParams.get('uid') ?? '';
  const apiClient = useMemo(() => createProjectsApiClient('', { uid: embeddedUid }), [embeddedUid]);
  // contacts API may live on a different origin/port (separate Next app).
  // frameworkConfig already exposes NEXT_PUBLIC_CONTACTS_APP_URL for dev/prod links.
  // use explicit URL if configured, otherwise during local dev fall back to the default port
  const contactsBaseUrl =
    process.env.NEXT_PUBLIC_CONTACTS_APP_URL?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3002' : '');
  const contactsClient = useMemo(
    () => createContactsApiClient(contactsBaseUrl),
    [contactsBaseUrl],
  );

  const handleCreatePerson = async (name: string) => {
    if (!contactsBaseUrl) return null;
    try {
      const created = await contactsClient.createContact({ name });
      setPeople((prev) => (prev.find((p) => p.name === created.name) ? prev : [...prev, created]));
      try {
        window.postMessage({ type: 'contacts-updated' }, '*');
      } catch {}
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'contacts-updated' }, '*');
        }
      } catch {}
      try {
        localStorage.setItem('fomo:contactsUpdated', Date.now().toString());
      } catch {}
      return created;
    } catch (err) {
      console.warn('[Projects] failed to create person', err);
      return null;
    }
  };

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [people, setPeople] = useState<Contact[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newlyAddedSubprojectId, setNewlyAddedSubprojectId] = useState<string | null>(null);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [undoSnackbar, setUndoSnackbar] = useState<{ message: string; onUndo: () => void; onConfirm?: () => void } | null>(null);
  const pendingBlankSubRef = useRef(false);
  const isEmbedded = searchParams.get('embedded') === '1';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const loadedProjects = await apiClient.listProjects();
        let loadedContacts: Contact[] = [];

        if (contactsBaseUrl) {
          try {
            loadedContacts = await contactsClient.listContacts();
          } catch (err) {
            console.warn('[Projects] failed to load contacts', err);
            let msg = 'Failed to load contacts';
            if (err instanceof TypeError && err.message === 'Failed to fetch') {
              msg = 'Unable to reach contacts service – make sure it is running';
            } else if (err instanceof Error) {
              msg = err.message;
            }
            setContactsError(msg);
          }
        }

        if (active) {
          setProjects(loadedProjects);
          setPeople(loadedContacts);
        }
      } catch (error) {
        if (active)
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load projects');
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
    if (!contactsBaseUrl) return;
    const handleFocus = async () => {
      try {
        const updated = await contactsClient.listContacts();
        setPeople(updated);
        setContactsError(null);
      } catch (err) {
        console.warn('[Projects] refresh contacts failed', err);
        let msg = 'Failed to load contacts';
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          msg = 'Unable to reach contacts service – make sure it is running';
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setContactsError(msg);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [contactsBaseUrl, contactsClient]);

  useEffect(() => {
    if (!isEmbedded) return;
    setProjectSearch(searchParams.get('q') ?? '');
  }, [isEmbedded, searchParams]);

  useEffect(() => {
    return () => {
      // cleanup not needed for pending delete
    };
  }, []);

  const closeUndoSnackbar = () => setUndoSnackbar(null);

  const openContacts = () => {
    if (contactsBaseUrl) {
      window.open(contactsBaseUrl, '_blank');
    }
  };

  const showUndoSnackbar = (message: string, onUndo: () => void, onConfirm?: () => void) => {
    setUndoSnackbar({ message, onUndo, ...(onConfirm && { onConfirm }) });
    // If not dismissed within 5 seconds, treat as undo
    setTimeout(() => {
      if (undoSnackbar) {
        undoSnackbar.onUndo();
        setUndoSnackbar(null);
      }
    }, 5000);
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
  };

  // Always persist project changes (including task edits) to backend
  const handleProjectApplyChange = async (projectId: string, updated: Partial<ProjectItem>) => {
    if (!canManage) return;
    // If subprojects changed, check for blank subprojects (for UI logic)
    if (updated.subprojects) {
      const hasBlank = updated.subprojects.some((sub) => !sub.text || sub.text.trim() === '');
      pendingBlankSubRef.current = hasBlank;
    }

    // Use the updated project object from ProjectEditor as the source of truth
    try {
      const next = await apiClient.updateProject(projectId, updated);
      setProjects((prev) => prev.map((item) => (item.id === projectId ? next : item)));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update project');
    }
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

  const handleAddSubproject = async (projectId: string, name = '') => {
    if (!canManage) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    if ((project.subprojects || []).some((sub) => !sub.text || sub.text.trim() === '')) {
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
      const nextNum = maxNum + 1;
      name = `subproject (${nextNum})`;
    }

    const newSub = {
      id: crypto.randomUUID(),
      text: name.trim(),
      tasks: [],
      collapsed: true,
      isProjectLevel: false,
    };
    const updatedSubprojects = [...(project.subprojects || []), newSub];
    const updatedProject = await apiClient.updateProject(projectId, { subprojects: updatedSubprojects });
    setNewlyAddedSubprojectId(newSub.id);
    setProjects((prev) => prev.map((item) => (item.id === projectId ? updatedProject : item)));
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
    try {
      await apiClient.deleteProject(projectId);
      setProjects((prev) => prev.filter((item) => item.id !== projectId));
      if (editingProjectId === projectId) {
        setEditingProjectId(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete project');
    }
    setPendingDeleteProjectId(null);
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
      const updatedSubprojects = (project.subprojects || []).filter((sub) => sub.id !== subproject.id);
      const updatedProject = { ...project, subprojects: updatedSubprojects };
      void apiClient.updateProject(projectId, { subprojects: updatedSubprojects });
      return prev.map((item) => (item.id === projectId ? updatedProject : item));
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
      <div className={`container ${layoutStyles.container}`}>
        {!isEmbedded ? (
          <div className={layoutStyles.searchBar}>
            <input
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
              placeholder={editingProjectId ? 'Search tasks' : 'Search projects'}
              className={layoutStyles.searchInput}
            />
          </div>
        ) : null}

        {!canManage ? <div className={`${layoutStyles.message} ${layoutStyles.readOnlyMessage}`}>Read-only mode: sign in is required to manage projects.</div> : null}
        {loading ? <div className={layoutStyles.message}>Loading projects…</div> : null}
        {errorMessage ? <div className={`${layoutStyles.message} ${layoutStyles.errorMessage}`}>{errorMessage}</div> : null}
        {contactsError ? <div className={`${layoutStyles.message} ${layoutStyles.errorMessage}`}>{contactsError}</div> : null}

        <ProjectsDashboard
          projects={projects}
          people={people}
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
          pendingDeleteProjectId={pendingDeleteProjectId}
          onConfirmDeleteProject={handleConfirmDeleteProject}
          onAddProject={handleAddProject}
          onOpenPeople={openContacts}
          onCreatePerson={handleCreatePerson}
          onTitleChange={handleProjectTitleChange}
          projectSearch={projectSearch}
          filters={filters}
          onToggleFilter={handleToggleFilter}
        />
      </div>

      <div className="undo-snackbar" role="status" aria-live="polite" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxWidth: '90vw', visibility: undoSnackbar ? 'visible' : 'hidden' }}>
        <div className="snack-content">
          <span className="snack-message">{undoSnackbar?.message || ''}</span>
          <div className="snack-actions">
            <button
              type="button"
              className="snack-button undo-button"
              onClick={() => {
                undoSnackbar?.onUndo();
                setUndoSnackbar(null);
              }}
              disabled={!undoSnackbar}
            >
              Undo
            </button>
            <button
              type="button"
              className="snack-button dismiss-button"
              onClick={() => {
                if (undoSnackbar?.onConfirm) {
                  undoSnackbar.onConfirm();
                } else {
                  setUndoSnackbar(null);
                }
              }}
              disabled={!undoSnackbar}
            >
              {undoSnackbar?.onConfirm ? 'Confirm' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
