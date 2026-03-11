'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createProjectsApiClient } from '../lib/client/projectsApi';
import { createContactsApiClient } from '../../contacts/lib/client/contactsApi';
import type { ProjectItem, ProjectSubproject, Contact } from '@myorg/types';
import { generateId } from '@myorg/utils';
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
  // display ready state - only show content after framework acknowledges loading
  // If not embedded, immediately show content for standalone usage and tests
  const isEmbedded = searchParams.get('embedded') === '1';
  const [displayReady, setDisplayReady] = useState(!isEmbedded);
  const [undoSnackbar, setUndoSnackbar] = useState<{ message: string; onUndo: () => void; onConfirm?: () => void } | null>(null);
  const pendingBlankSubRef = useRef(false);


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

  // Listen for search query updates from framework
  useEffect(() => {
    if (!isEmbedded) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'search-query') {
        setProjectSearch(event.data.query || '');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isEmbedded]);

  // Send app-loaded message when loading completes
  useEffect(() => {
    if (!isEmbedded || loading) return;

    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 2000; // 2 seconds

    const sendLoadedMessage = () => {
      try {
        window.parent?.postMessage?.({ type: 'app-loaded', appId: 'projects' }, '*');
      } catch (err) {
        // ignore
      }
    };

    const checkAck = (event: MessageEvent) => {
      if (event.data?.type === 'app-loaded-ack' && event.data?.appId === 'projects') {
        // Acknowledged, stop retrying and show content
        setDisplayReady(true);
        window.removeEventListener('message', checkAck);
        clearInterval(intervalId);
      }
    };

    window.addEventListener('message', checkAck);

    // Send initial message
    sendLoadedMessage();

    // Set up retry interval
    const intervalId = setInterval(() => {
      retryCount++;
      if (retryCount >= maxRetries) {
        clearInterval(intervalId);
        window.removeEventListener('message', checkAck);
        return;
      }
      sendLoadedMessage();
    }, retryInterval);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('message', checkAck);
    };
  }, [isEmbedded, loading]);

  // Configure search placeholder based on editing state
  useEffect(() => {
    if (!isEmbedded) return;
    const placeholder = editingProjectId ? 'Search tasks' : null; // null resets to default
    try {
      window.parent?.postMessage?.({ type: 'search-config', placeholder }, '*');
    } catch (err) {
      // ignore
    }
  }, [isEmbedded, editingProjectId]);

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

    const baseName = text.trim() || 'New Project';
    const tempId = generateId();
    const optimisticProject: ProjectItem = { id: tempId, text: baseName, color: color ?? '', subprojects: [] };
    setProjects((prev) => [...prev, optimisticProject]);
    try {
      const created = await apiClient.createProject({ text: baseName, ...(color ? { color } : {}) });
      setProjects((prev) => prev.map((item) => (item.id === tempId ? created : item)));
    } catch (err) {
      setProjects((prev) => prev.filter((item) => item.id !== tempId));
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create project');
    }
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
    if (!canManage) {
      return;
    }
    try {
      const updated = await apiClient.updateProject(projectId, { color: newColor });
      setProjects((prev) => prev.map((item) => (item.id === projectId ? updated : item)));
    } catch (err) {
      console.error('Failed to update project color:', err);
    }
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
    setProjects((prev) => prev.map((item) => item.id === projectId ? { ...item, subprojects: optimisticSubs } : item));
    setNewlyAddedSubprojectId(newSub.id);
    try {
      const updatedProject = await apiClient.updateProject(projectId, { subprojects: optimisticSubs });
      setProjects((prev) => prev.map((item) => (item.id === projectId ? updatedProject : item)));
    } catch (err) {
      setProjects((prev) => prev.map((item) => item.id === projectId ? { ...item, subprojects: project.subprojects || [] } : item));
      setNewlyAddedSubprojectId(null);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add subproject');
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
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete project');
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
      {!displayReady ? (
        <div style={{ height: '100vh' }} />
      ) : (
        <div className="content-panel">
          <section className="content">
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
        </section>
        </div>
      )}
    </main>
  );
}
