'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TasksPage.module.css';
import { useSearchParams } from 'next/navigation';
import { createTasksApiClient } from '../lib/client/tasksApi';
import { createContactsApiClient } from '../lib/client/contactsApi';
import type { TaskItem, ProjectTask, Contact } from '@myorg/types';
import { TaskList, AddBar } from '@myorg/ui';
import { applyFilters } from '@myorg/utils';

// using shared TaskList from ui package; it is fully typed

type Props = {
  canManage: boolean;
};

type TaskFilter = 'completed' | 'overdue' | 'upcoming' | 'starred';

function isTaskNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Task not found';
}

export default function TasksPage({ canManage }: Props) {
  const searchParams = useSearchParams();
  const api = useMemo(() => createTasksApiClient(''), []);
  const contactsBaseUrl =
    process.env.NEXT_PUBLIC_CONTACTS_APP_URL?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3002' : '');
  const contactsApi = useMemo(
    () => createContactsApiClient(contactsBaseUrl),
    [contactsBaseUrl],
  );

  const handleCreatePerson = async (name: string) => {
    if (!contactsBaseUrl) return null;
    try {
      // debug: log when create person is invoked in tests
      // eslint-disable-next-line no-console
      console.log('[TEST DEBUG] handleCreatePerson called with', name, 'contactsBaseUrl=', contactsBaseUrl);
      const created = await contactsApi.createContact({ name });
      // eslint-disable-next-line no-console
      console.log('[TEST DEBUG] contactsApi.createContact returned', created);
      setPeople((prev) => (prev.find((p) => p.name === created.name) ? prev : [...prev, created]));
      // notify other frames or tabs that contacts changed
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
      console.warn('[Tasks] failed to create person', err);
      return null;
    }
  };

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [people, setPeople] = useState<Contact[]>([]);
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TaskFilter[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);
  const [newlyAddedTaskId, setNewlyAddedTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // display ready state - show content by default when not embedded. When
  // embedded, we wait for the framework ack before displaying content.
  const [displayReady, setDisplayReady] = useState(true);
  const deletingTaskIdsRef = useRef<Set<string>>(new Set());
  const isEmbedded = searchParams.get('embedded') === '1';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const loadedTasks = await api.listTasks();
        let loadedContacts: Contact[] = [];

        if (contactsBaseUrl) {
          try {
            loadedContacts = await contactsApi.listContacts();
          } catch (err) {
            console.warn('[Tasks] failed to load contacts', err);
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
          setTasks(loadedTasks);
          setPeople(loadedContacts);
        }
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Failed to load tasks');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [api, contactsApi]);

  // update contact list when returning to page
  useEffect(() => {
    if (!contactsBaseUrl) return;
    const onFocus = async () => {
      try {
        const refreshed = await contactsApi.listContacts();
        setPeople(refreshed);
        setContactsError(null);
      } catch (err) {
        console.warn('[Tasks] refresh contacts failed', err);
        let msg = 'Failed to load contacts';
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          msg = 'Unable to reach contacts service – make sure it is running';
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setContactsError(msg);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [contactsBaseUrl, contactsApi]);

  // helper functions that describe this app's thumb button behaviour
  const getThumbIcon = () => 'add';
  // using a custom action value so the host doesn't accidentally trigger
  // the old behaviour of creating a task.
  const getThumbAction = () => 'focus-add';

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (!event?.data) return;
      if (event.data.type === 'focus-add' || event.data.type === 'thumb-fab') {
        // thumb-fab is the legacy action; treat it the same as focus-add so the
        // button works even if the host hasn't yet received a config reply.
        requestAnimationFrame(() => {
          const el = document.getElementById('add-tasks-input') as HTMLInputElement | null;
          if (el) el.focus();
        });
      } else if (event.data.type === 'get-thumb-config') {
        // host is asking what icon/action to use
        try {
          window.parent?.postMessage?.(
            { type: 'thumb-config', icon: getThumbIcon(), action: getThumbAction() },
            '*',
          );
        } catch (err) {
          // ignore
        }
        // also mirror to `window` asynchronously so tests and same-window hosts receive it
        try {
          setTimeout(() => {
            try {
              window.postMessage({ type: 'thumb-config', icon: getThumbIcon(), action: getThumbAction() }, '*');
            } catch {}
          }, 0);
        } catch (err) {
          try {
            window.postMessage({ type: 'thumb-config', icon: getThumbIcon(), action: getThumbAction() }, '*');
          } catch {}
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [api, canManage]);

  // Send app-loaded message when loading completes
  useEffect(() => {
    if (!isEmbedded || loading) return;

    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 2000; // 2 seconds

    const sendLoadedMessage = () => {
      try {
        window.parent?.postMessage?.({ type: 'app-loaded', appId: 'tasks' }, '*');
      } catch (err) {
        // ignore
      }
    };

    const checkAck = (event: MessageEvent) => {
      if (event.data?.type === 'app-loaded-ack' && event.data?.appId === 'tasks') {
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

  // Listen for search query updates from framework
  useEffect(() => {
    if (!isEmbedded) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'search-query') {
        setSearch(event.data.query || '');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isEmbedded]);

  const openContacts = () => {
    if (contactsBaseUrl) {
      window.open(contactsBaseUrl, '_blank');
    }
  };

  const filtered = useMemo(
    () => applyFilters(tasks as any[], filters as string[], search) as TaskItem[],
    [tasks, filters, search],
  );

  const completedCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);

  const starredCount = useMemo(
    () => tasks.filter((task) => task.favorite || (task as any).starred).length,
    [tasks],
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => task.dueDate && new Date(task.dueDate) < today).length;
  }, [tasks]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(today.getDate() + 7);
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const date = new Date(task.dueDate);
      return date >= today && date <= inSeven;
    }).length;
  }, [tasks]);

  const toggleFilter = (type: TaskFilter) => {
    setFilters((prev) => (prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]));
  };

  const toggleEditorTaskId = (taskId: string | null) => {
    setEditorTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const addTask = async () => {
    if (!canManage) return;
    if (!input.trim()) return;
    const created = await api.createTask({
      text: input.trim(),
      favorite: false,
      description: '',
    });
    setTasks((prev) => [...prev, created]);
    setNewlyAddedTaskId(created.id);
    setEditorTaskId(created.id);
    setInput('');
  };

  const handleDragStart = (taskId: string) => {
    if (!canManage) return;
    setDraggedTaskId(taskId);
  };

  const handleDrop = (targetTaskId: string) => {
    if (!canManage) return;
    setTasks((prev) => {
      if (!draggedTaskId || draggedTaskId === targetTaskId) return prev;
      const draggedIndex = prev.findIndex((item) => item.id === draggedTaskId);
      const targetIndex = prev.findIndex((item) => item.id === targetTaskId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const reordered = [...prev];
      const [dragged] = reordered.splice(draggedIndex, 1);
      if (!dragged) return prev;
      reordered.splice(targetIndex, 0, dragged);
      return reordered;
    });
    setDraggedTaskId(null);
  };

  const toggleDone = async (taskId: string) => {
    if (!canManage) {
      return;
    }
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }
    const updated = await api.updateTask(task.id, { done: !task.done });
    if (!updated) return;
    setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
  };

  const toggleFavorite = async (taskId: string) => {
    if (!canManage) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const updated = await api.updateTask(task.id, { favorite: !task.favorite });
    if (!updated) return;
    setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
  };

  const removeTask = async (taskId: string) => {
    if (!canManage) return;
    deletingTaskIdsRef.current.add(taskId);
    await api.deleteTask(taskId);
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    if (editorTaskId === taskId) {
      setEditorTaskId(null);
    }
  };

  const handleTitleChange = async (taskId: string, newText: string) => {
    if (!canManage || !newText.trim()) return;
    const updated = await api.updateTask(taskId, { text: newText.trim() });
    if (!updated) return;
    setTasks((prev) => prev.map((item) => (item.id === taskId ? updated : item)));
  };

  // called by TaskList when the inline editor or other subcomponent
  // has produced a new task object.  `updates` may be partial but usually
  // contains the full task record.
  const handleEditorUpdate = async (taskId: string, updates: Partial<TaskItem>) => {
    if (!canManage) {
      return;
    }
    if (!updates || !updates.id) {
      console.warn('TasksPage.handleEditorUpdate called without id', updates);
      return;
    }
    const updatedTask = updates as TaskItem;

    if (deletingTaskIdsRef.current.has(updatedTask.id)) {
      return;
    }
    try {
      // patch being sent to API; include only changed fields if desired
      const updated = await api.updateTask(updatedTask.id, {
        text: updatedTask.text,
        description: updatedTask.description,
        dueDate: updatedTask.dueDate,
        favorite: updatedTask.favorite,
        done: updatedTask.done,
        ...(updatedTask.people ? { people: updatedTask.people } : {}),
      });
      if (!updated) return;
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      console.error('  update error', error);
      if (isTaskNotFoundError(error)) {
        return;
      }
      throw error;
    }
  };

  const handleEditorSave = async (updatedTask: ProjectTask) => {
    if (!updatedTask?.id) {
      console.warn('TasksPage.handleEditorSave called without id', updatedTask);
    }
    // convert ProjectTask to TaskItem (description may be undefined)
    const taskItem: TaskItem = {
      id: updatedTask.id,
      text: updatedTask.text,
      done: updatedTask.done,
      dueDate: updatedTask.dueDate,
      favorite: updatedTask.favorite,
      description: updatedTask.description || "",
      ...(updatedTask.people ? { people: updatedTask.people } : {}),
    };
    await handleEditorUpdate(taskItem.id, taskItem);
    setEditorTaskId(null);
  };

  const emptyMessage = () => {
    if (search && search.trim() !== '') {
      return `No tasks match "${search}".`;
    }
    if (filters.length === 1) {
      return `No ${filters[0]} tasks found.`;
    }
    if (filters.length > 1) {
      return 'No tasks match those filters.';
    }
    return 'No tasks yet. Add one to get started.';
  };

  return (
    <main className="main-layout">
      {!displayReady ? (
        <div style={{ height: '100vh' }} />
      ) : (
        <div className="content-panel">
          <div className={`container ${styles.inlineContainer}`}>
        {!isEmbedded ? (
          <div className={styles.searchBar}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks"
              className={styles.searchInput}
            />
          </div>
        ) : null}

        <div className="dashboard-summary">
          <div
            className={[
              'dashboard-card',
              'dashboard-card--success',
              'dashboard-card--clickable',
              filters.includes('completed') ? 'dashboard-card--active dashboard-card--success' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => toggleFilter('completed')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleFilter('completed');
              }
            }}
          >
            <span className="material-icons dashboard-card__icon">check_circle</span>
            <div className="dashboard-card__body">
              <span className="dashboard-card__value">{completedCount}</span>
              <span className="dashboard-card__label">Completed</span>
            </div>
            {filters.includes('completed') ? <span className="dashboard-card__active-dot" /> : null}
          </div>

          <div
            className={[
              'dashboard-card',
              'dashboard-card--star',
              'dashboard-card--clickable',
              filters.includes('starred') ? 'dashboard-card--active dashboard-card--star' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => toggleFilter('starred')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleFilter('starred');
              }
            }}
          >
            <span className="material-icons dashboard-card__icon">star</span>
            <div className="dashboard-card__body">
              <span className="dashboard-card__value">{starredCount}</span>
              <span className="dashboard-card__label">Starred</span>
            </div>
            {filters.includes('starred') ? <span className="dashboard-card__active-dot" /> : null}
          </div>

          <div
            className={[
              'dashboard-card',
              'dashboard-card--danger',
              'dashboard-card--clickable',
              filters.includes('overdue') ? 'dashboard-card--active dashboard-card--danger' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => toggleFilter('overdue')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleFilter('overdue');
              }
            }}
          >
            <span className="material-icons dashboard-card__icon">warning</span>
            <div className="dashboard-card__body">
              <span className="dashboard-card__value">{overdueCount}</span>
              <span className="dashboard-card__label">Overdue</span>
            </div>
            {filters.includes('overdue') ? <span className="dashboard-card__active-dot" /> : null}
          </div>

          <div
            className={[
              'dashboard-card',
              'dashboard-card--info',
              'dashboard-card--clickable',
              filters.includes('upcoming') ? 'dashboard-card--active dashboard-card--info' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => toggleFilter('upcoming')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleFilter('upcoming');
              }
            }}
          >
            <span className="material-icons dashboard-card__icon">upcoming</span>
            <div className="dashboard-card__body">
              <span className="dashboard-card__value">{upcomingCount}</span>
              <span className="dashboard-card__label">Upcoming</span>
            </div>
            {filters.includes('upcoming') ? <span className="dashboard-card__active-dot" /> : null}
          </div>
        </div>

        {!canManage ? <div className={`${styles.message} ${styles.messageReadOnly}`}>Read-only mode: sign in is required to manage tasks.</div> : null}
        {loading ? <div className={styles.message}>Loading tasks…</div> : null}
        {errorMessage ? <div className={`${styles.message} ${styles.messageError}`}>{errorMessage}</div> : null}
        {contactsError ? <div className={`${styles.message} ${styles.messageError}`}>{contactsError}</div> : null}

        <div className={`filter-flat-view tasks-filter-view ${styles.filterView}`}>
          {filtered.length === 0 ? (
            <p className="filter-flat-empty">{emptyMessage()}</p>
          ) : (
            <div className="subproject-tasks">
              <ul className={`item-list ${styles.itemList}`}>
                <TaskList
                  items={filtered}
                  type="tasks"
                  editorTaskId={editorTaskId}
                  setEditorTaskId={toggleEditorTaskId}
                  handleToggle={toggleDone}
                  handleStar={toggleFavorite}
                  handleDelete={removeTask}
                  onTitleChange={handleTitleChange}
                  onDragStart={handleDragStart}
                  onDragOver={() => {}}
                  onDrop={handleDrop}
                  onDragEnd={() => setDraggedTaskId(null)}
                  onEditorSave={handleEditorSave}
                  onEditorUpdate={handleEditorUpdate}
                  onEditorClose={() => setEditorTaskId(null)}
                  allPeople={people}
                  onOpenPeople={openContacts}
                  onCreatePerson={handleCreatePerson}
                  newlyAddedTaskId={newlyAddedTaskId}
                  onClearNewTask={() => setNewlyAddedTaskId(null)}
                />
              </ul>
            </div>
          )}
        </div>

        <div
          className={`add-bar-wrapper tasks-bottom-add ${styles.addBarWrapper}`}
        >
          <AddBar
            type="tasks"
            input={input}
            dueDate={dueDate}
            onInputChange={setInput}
            onDueDateChange={setDueDate}
            onAdd={() => void addTask()}
            focusStyle={{ background: '#e6f7ff' }}
          />
        </div>
        </div>
        </div>
      )}
    </main>
  );
}