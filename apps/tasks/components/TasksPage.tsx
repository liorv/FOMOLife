'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TasksPage.module.css';
import { useSearchParams } from 'next/navigation';
import { createTasksApiClient } from '../lib/client/tasksApi';
import type { TaskItem, ProjectTask } from '@myorg/types';
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

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TaskFilter[]>([]);
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);
  const [newlyAddedTaskId, setNewlyAddedTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deletingTaskIdsRef = useRef<Set<string>>(new Set());
  const isEmbedded = searchParams.get('embedded') === '1';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const loaded = await api.listTasks();
        if (active) setTasks(loaded);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Failed to load tasks');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    if (!isEmbedded) return;
    setSearch(searchParams.get('q') ?? '');
  }, [isEmbedded, searchParams]);

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
      <div className={`container ${styles.inlineContainer}`}>
        {!isEmbedded ? (
          <div className={styles.searchBar}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks…"
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
                  allPeople={[]}
                  onOpenPeople={() => {}}
                  onCreatePerson={async () => null}
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
          />
        </div>
      </div>
    </main>
  );
}