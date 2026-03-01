'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createTasksApiClient } from '@/lib/client/tasksApi';
import type { TaskItem } from '@/lib/server/tasksStore';
import TaskList from '../../projects/components/TaskList';
import AddBar from '../../projects/components/AddBar';
import { applyFilters } from '../../projects/utils/taskFilters';

const TaskListAny = TaskList as any;

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
    () => tasks.filter((task) => (task.favorite || (task as any).starred) && !task.done).length,
    [tasks],
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => !task.done && task.dueDate && new Date(task.dueDate) < today).length;
  }, [tasks]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(today.getDate() + 7);
    return tasks.filter((task) => {
      if (task.done || !task.dueDate) return false;
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
    if (!canManage) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
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

  const handleEditorUpdate = async (updatedTask: TaskItem) => {
    if (!canManage) return;
    if (!updatedTask?.id) return;
    if (deletingTaskIdsRef.current.has(updatedTask.id)) return;
    try {
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
      if (isTaskNotFoundError(error)) {
        return;
      }
      throw error;
    }
  };

  const handleEditorSave = async (updatedTask: TaskItem) => {
    await handleEditorUpdate(updatedTask);
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
      <div className="container" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!isEmbedded ? (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#fff' }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks…"
              style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 8, border: '1px solid #d0d7de', padding: '0 10px' }}
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
              <span className="dashboard-card__value">{completedCount} / {tasks.length}</span>
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

        {!canManage ? <div style={{ margin: '0 16px 8px', color: '#8a6d3b' }}>Read-only mode: sign in is required to manage tasks.</div> : null}
        {loading ? <div style={{ margin: '0 16px 8px' }}>Loading tasks…</div> : null}
        {errorMessage ? <div style={{ margin: '0 16px 8px', color: '#b3261e' }}>{errorMessage}</div> : null}

        <div className="filter-flat-view tasks-filter-view" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {filtered.length === 0 ? (
            <p className="filter-flat-empty">{emptyMessage()}</p>
          ) : (
            <div className="subproject-tasks">
              <ul className="item-list" style={{ margin: 0 }}>
                <TaskListAny
                  items={filtered as any[]}
                  type="tasks"
                  editorTaskId={editorTaskId}
                  setEditorTaskId={toggleEditorTaskId as any}
                  handleToggle={(id: string) => void toggleDone(id)}
                  handleStar={(id: string) => void toggleFavorite(id)}
                  handleDelete={(id: string) => void removeTask(id)}
                  onTitleChange={(id: string, value: string) => void handleTitleChange(id, value)}
                  onDragStart={(id: string) => handleDragStart(id)}
                  onDragOver={() => {}}
                  onDrop={(id: string) => handleDrop(id)}
                  onDragEnd={() => setDraggedTaskId(null)}
                  onEditorSave={(updated: TaskItem) => void handleEditorSave(updated)}
                  onEditorUpdate={(updated: TaskItem) => void handleEditorUpdate(updated)}
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
          className="add-bar-wrapper tasks-bottom-add"
          style={{
            background: '#fff',
            borderTop: '1px solid #d0d7de',
            padding: '10px 16px',
            position: 'sticky',
            bottom: 0,
            marginTop: 'auto',
            flexShrink: 0,
            zIndex: 15,
          }}
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