'use client';

import { useEffect, useMemo, useState } from 'react';
import { createTasksApiClient } from '@/lib/client/tasksApi';
import { getTasksClientEnv } from '@/lib/tasksEnv.client';
import type { TaskItem } from '@/lib/server/tasksStore';
import styles from './TasksPage.module.css';

type Props = {
  canManage: boolean;
};

type TaskFilter = 'completed' | 'overdue' | 'starred';

function isOverdue(task: TaskItem): boolean {
  if (!task.dueDate || task.done) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  return due < now;
}

export default function TasksPage({ canManage }: Props) {
  const env = useMemo(() => getTasksClientEnv(), []);
  const api = useMemo(() => createTasksApiClient(''), []);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TaskFilter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!filters.includes('completed') && task.done) return false;
      if (filters.includes('completed') && !task.done) return false;
      if (filters.includes('overdue') && !isOverdue(task)) return false;
      if (filters.includes('starred') && !task.favorite) return false;
      if (q && !task.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filters, search, tasks]);

  const toggleFilter = (type: TaskFilter) => {
    setFilters((prev) => (prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]));
  };

  const addTask = async () => {
    if (!canManage) return;
    if (!input.trim()) return;
    const created = await api.createTask({
      text: input.trim(),
      dueDate: dueDate || null,
      favorite: false,
      description: '',
    });
    setTasks((prev) => [...prev, created]);
    setInput('');
    setDueDate('');
  };

  const toggleDone = async (task: TaskItem) => {
    if (!canManage) return;
    const updated = await api.updateTask(task.id, { done: !task.done });
    setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
  };

  const toggleFavorite = async (task: TaskItem) => {
    if (!canManage) return;
    const updated = await api.updateTask(task.id, { favorite: !task.favorite });
    setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
  };

  const removeTask = async (taskId: string) => {
    if (!canManage) return;
    await api.deleteTask(taskId);
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    if (editingId === taskId) {
      setEditingId(null);
    }
  };

  const startEdit = (task: TaskItem) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditDescription(task.description ?? '');
    setEditDueDate(task.dueDate ?? '');
  };

  const saveEdit = async () => {
    if (!canManage || !editingId) return;
    if (!editText.trim()) return;
    const updated = await api.updateTask(editingId, {
      text: editText.trim(),
      description: editDescription,
      dueDate: editDueDate || null,
    });
    setTasks((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
    setEditingId(null);
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Tasks</h1>
            <p className={styles.subtitle}>in {env.appName}</p>
          </div>
        </header>

        <section className={styles.addCard}>
          <div className={styles.row}>
            <input
              className={styles.input}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Add a new task"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void addTask();
                }
              }}
            />
            <input
              className={styles.dateInput}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <button className={styles.btn} type="button" onClick={() => void addTask()} disabled={!canManage}>
              Add
            </button>
          </div>
        </section>

        <section className={styles.toolbar}>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
          />
          <div className={styles.filters}>
            <button className={filters.includes('completed') ? styles.filterActive : styles.filter} type="button" onClick={() => toggleFilter('completed')}>
              Completed
            </button>
            <button className={filters.includes('overdue') ? styles.filterActive : styles.filter} type="button" onClick={() => toggleFilter('overdue')}>
              Overdue
            </button>
            <button className={filters.includes('starred') ? styles.filterActive : styles.filter} type="button" onClick={() => toggleFilter('starred')}>
              Starred
            </button>
          </div>
        </section>

        {!canManage ? <div className={styles.notice}>Read-only mode: sign in is required to manage tasks.</div> : null}
        {loading ? <div className={styles.notice}>Loading tasks…</div> : null}
        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        <ul className={styles.list}>
          {filtered.map((task) => {
            const editing = editingId === task.id;
            return (
              <li key={task.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <label className={styles.taskLabel}>
                    <input type="checkbox" checked={task.done} onChange={() => void toggleDone(task)} disabled={!canManage} />
                    <span className={task.done ? styles.taskDone : styles.taskText}>{task.text}</span>
                  </label>
                  <div className={styles.actions}>
                    <button type="button" className={task.favorite ? styles.starred : styles.star} onClick={() => void toggleFavorite(task)} disabled={!canManage}>
                      ★
                    </button>
                    <button type="button" className={styles.smallBtn} onClick={() => startEdit(task)} disabled={!canManage}>
                      Edit
                    </button>
                    <button type="button" className={styles.smallBtnDanger} onClick={() => void removeTask(task.id)} disabled={!canManage}>
                      Delete
                    </button>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.meta}>{task.dueDate ? `Due: ${task.dueDate}` : 'No due date'}</span>
                  {isOverdue(task) ? <span className={styles.overdue}>Overdue</span> : null}
                </div>

                {task.description ? <p className={styles.description}>{task.description}</p> : null}

                {editing ? (
                  <div className={styles.editor}>
                    <input className={styles.input} value={editText} onChange={(event) => setEditText(event.target.value)} />
                    <textarea
                      className={styles.textarea}
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="Task notes"
                    />
                    <input
                      className={styles.dateInput}
                      type="date"
                      value={editDueDate}
                      onChange={(event) => setEditDueDate(event.target.value)}
                    />
                    <div className={styles.editorActions}>
                      <button className={styles.btn} type="button" onClick={() => void saveEdit()}>
                        Save
                      </button>
                      <button className={styles.btnSecondary} type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}