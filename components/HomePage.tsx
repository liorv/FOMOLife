'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TaskModal } from '@myorg/ui';
import styles from './HomePage.module.css';
import { createTasksApiClient, createProjectsApiClient, createContactsApiClient } from '@myorg/api-client';
import { preloadImages } from '@myorg/utils';
import type { TaskItem, ProjectItem, Contact, ProjectTask } from '@myorg/types';
import GlobalSearchResults, { type FeedbackItem } from './GlobalSearchResults';
import ContentHeader from './ContentHeader';
import EntityIcon from './EntityIcon';
import { getCachedProjectsSync, setCachedProjects, areProjectsStale } from '@/lib/client/projectsCache';
import { getCachedTasksSync, setCachedTasks, areTasksStale } from '@/lib/client/tasksCache';
import { getCachedContactsSync } from '@/lib/client/contactsCache';
import { getProjectMemberContacts } from '@/lib/client/projectMembers';

// Module-level snapshot for feedback (survives React remounts)
let _feedbackSnap: FeedbackItem[] | null = null;

type Props = {
  style?: React.CSSProperties;
  searchQuery?: string;
  onReady?: () => void;
  isActive?: boolean;
};

type DashboardTask = TaskItem & {
  projectId?: string;
  projectName?: string;
  projectIcon?: string;
  subprojectId?: string;
  source: 'global' | 'project';
};

/** Width of the revealed action tray (three full-height tiles). */
const ACTIONS_WIDTH = 198;
/** Drag distance past which releasing opens the action tray (swipe left). */
const OPEN_THRESHOLD = 44;
/** Drag distance past which releasing completes the task (swipe right). */
const DONE_THRESHOLD = 88;
/** How far right the row can be dragged before it stops following the finger. */
const DONE_MAX = 132;
/** Movement needed before a gesture is locked to the horizontal or vertical axis. */
const AXIS_LOCK = 8;

/**
 * Dashboard task row, modelled on iOS Mail rows.
 * - Click/tap the row: default action, navigates to the task.
 * - Desktop hover (or keyboard focus): full-height action tiles slide in from the right.
 * - Touch swipe left: reveals the same action tray, which stays open until used or dismissed.
 * - Touch swipe right past the threshold: marks the task as done.
 */
function DashboardTaskItem({
  task,
  icon,
  iconClassName,
  meta,
  metaClassName,
  onOpen,
  onMarkDone,
  onUpdate,
  allPeople,
}: {
  task: DashboardTask;
  icon: string;
  iconClassName?: string | undefined;
  meta: React.ReactNode;
  metaClassName?: string | undefined;
  onOpen: (task: DashboardTask) => void;
  onMarkDone: (task: DashboardTask) => void;
  onUpdate: (task: DashboardTask, updated: ProjectTask) => void;
  allPeople: Contact[];
}) {
  const [editing, setEditing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const gesture = useRef<{ x: number; y: number; base: number; axis: 'none' | 'x' | 'y' } | null>(null);
  const offsetRef = useRef(0);
  const swipedRef = useRef(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const moveTo = (next: number) => {
    offsetRef.current = next;
    setOffset(next);
  };

  const close = React.useCallback(() => {
    setActionsOpen(false);
    moveTo(0);
  }, []);

  // An open tray behaves like iOS: tapping anywhere else dismisses it.
  useEffect(() => {
    if (!actionsOpen) return;
    const handlePointerDown = (e: Event) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [actionsOpen, close]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0]!;
    gesture.current = { x: touch.clientX, y: touch.clientY, base: actionsOpen ? -ACTIONS_WIDTH : 0, axis: 'none' };
    swipedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g) return;
    const touch = e.touches[0]!;
    const dx = touch.clientX - g.x;
    const dy = touch.clientY - g.y;
    if (g.axis === 'none') {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'x') setDragging(true);
    }
    if (g.axis !== 'x') return;
    swipedRef.current = true;
    moveTo(Math.max(-ACTIONS_WIDTH, Math.min(DONE_MAX, g.base + dx)));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!g || g.axis !== 'x') return;
    // The row owns horizontal gestures, so the app-level swipe-to-change-tab
    // handler on the page container must not also act on this swipe.
    e.stopPropagation();
    const current = offsetRef.current;
    if (current >= DONE_THRESHOLD) {
      close();
      onMarkDone(task);
    } else if (current <= -OPEN_THRESHOLD) {
      setActionsOpen(true);
      moveTo(-ACTIONS_WIDTH);
    } else {
      close();
    }
  };

  const activate = (action: (task: DashboardTask) => void) => {
    close();
    action(task);
  };

  const handleRowClick = () => {
    // Swallow the click that ends a swipe, and let a tap dismiss an open tray.
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    if (actionsOpen) {
      close();
      return;
    }
    setEditing(value => !value);
  };

  return (
    <li>
    <div
      ref={rowRef}
      className={`${styles.swipeItem} ${actionsOpen ? styles.swipeItemOpen : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={styles.swipeDoneHint}
        style={{ width: `${Math.max(0, offset)}px`, opacity: offset > 0 ? 1 : 0 }}
        aria-hidden="true"
      >
        <span className="material-icons" style={{ fontSize: '20px' }}>check</span>
      </div>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={`${styles.rowActionButton} ${styles.rowActionEdit}`}
          title="Edit task"
          aria-label={`Edit "${task.text}"`}
          onClick={e => { e.stopPropagation(); close(); setEditing(value => !value); }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>edit</span>
          <span className={styles.rowActionLabel}>Edit</span>
        </button>
        <button
          type="button"
          className={`${styles.rowActionButton} ${styles.rowActionDone}`}
          title="Mark as done"
          aria-label={`Mark "${task.text}" as done`}
          onClick={e => { e.stopPropagation(); activate(onMarkDone); }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>check_circle</span>
          <span className={styles.rowActionLabel}>Done</span>
        </button>
        <button
          type="button"
          className={`${styles.rowActionButton} ${styles.rowActionOpen}`}
          title="Open task"
          aria-label={`Open "${task.text}"`}
          onClick={e => { e.stopPropagation(); activate(onOpen); }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>arrow_forward</span>
          <span className={styles.rowActionLabel}>Open</span>
        </button>
      </div>
      <div
        className={`${styles.rowSurface} ${dragging ? styles.rowSurfaceDragging : ''}`}
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
          } else if (e.key === 'Escape' && actionsOpen) {
            close();
          }
        }}
      >
        <span className={`material-icons ${styles.itemIcon} ${iconClassName ?? ''}`}>{icon}</span>
        <div className={styles.itemContent}>
          <h3 className={styles.itemTitle}>{task.text}</h3>
          <p className={`${styles.itemMeta} ${metaClassName ?? ''}`}>{meta}</p>
        </div>
      </div>
    </div>
    {editing && (
      <div className={styles.taskEditor}>
        <TaskModal
          inline
          task={{
            id: task.id,
            text: task.text,
            done: task.done,
            favorite: task.favorite,
            dueDate: task.dueDate,
            description: task.description ?? '',
            people: task.people ?? [],
            ...(task.effort !== undefined ? { effort: task.effort } : {}),
          }}
          allPeople={allPeople}
          onUpdateTask={updated => onUpdate(task, updated)}
          onSave={() => setEditing(false)}
          onClose={() => setEditing(false)}
        />
      </div>
    )}
    </li>
  );
}

export default function HomePage({ style, searchQuery = '', onReady, isActive }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Always start with empty/loading state so SSR and client initial render match.
  // We sync from the module-level cache in useLayoutEffect (runs before paint on client
  // only, so there's no visual flash and no hydration mismatch).
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationTaskId, setNotificationTaskId] = useState<string | null>(null);
  const [notificationTaskError, setNotificationTaskError] = useState<string | null>(null);
  const targetTaskId = searchParams.get('tab') === 'tasks' ? searchParams.get('taskId') : null;
  useEffect(() => {
    setNotificationTaskId(targetTaskId);
    setNotificationTaskError(null);
  }, [targetTaskId]);
  const notificationTask = tasks.find(task => task.id === notificationTaskId);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showMoreFavorites, setShowMoreFavorites] = useState(false);
  const [showMoreOverdue, setShowMoreOverdue] = useState(false);
  const [showMoreDue, setShowMoreDue] = useState(false);
  const [showMoreFeed, setShowMoreFeed] = useState(false);
  const onReadyCalledRef = useRef(false);

  // Sync from module-level cache immediately after mount, before first paint.
  // This avoids a hydration mismatch (server always renders loading state)
  // while still giving instant content when cache is populated.
  useLayoutEffect(() => {
    const cachedTasks = getCachedTasksSync();
    if (cachedTasks !== null) {
      setTasks(cachedTasks);
      setProjects(getCachedProjectsSync() ?? []);
      setContacts(getCachedContactsSync<Contact>() ?? []);
      setFeedbackItems(_feedbackSnap ?? []);
      setLoading(false);
    }
  }, []);

  // Notify parent when initial data is available (cached or freshly loaded)
  useEffect(() => {
    if (!loading && !onReadyCalledRef.current) {
      onReadyCalledRef.current = true;
      onReady?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const tasksApi = useMemo(() => createTasksApiClient(''), []);
  const projectsApi = useMemo(() => createProjectsApiClient(''), []);
  const contactsApi = useMemo(() => createContactsApiClient(''), []);
  const projectPeople = useMemo(() => new Map(
    projects.map(project => [project.id, getProjectMemberContacts(project.members ?? [])])
  ), [projects]);

  const updateNotificationTask = (task: ProjectTask) => {
    void tasksApi.updateTask(task.id, task).then(updated => {
      setTasks(previous => {
        const next = previous.map(item => item.id === updated.id ? updated : item);
        setCachedTasks(next);
        return next;
      });
      window.dispatchEvent(new CustomEvent('fomo:taskUpdated', { detail: updated }));
    }).catch(error => {
      console.error('Failed to update notification task:', error);
      setNotificationTaskError('Failed to update task. Please try again.');
    });
  };

  // Fetches all home data. `silent` = true skips the loading spinner (background refresh).
  const fetchAllData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [t, p, c, f] = await Promise.all([
      tasksApi.listTasks().catch(() => [] as TaskItem[]),
      projectsApi.listProjects().catch(() => [] as ProjectItem[]),
      contactsApi.listContacts().catch(() => [] as Contact[]),
      fetch('/api/feedback').then(r => r.ok ? r.json() : { feedback: [] }).then((d: { feedback: FeedbackItem[] }) => d.feedback).catch(() => [] as FeedbackItem[])
    ]);
    setCachedTasks(t);
    _feedbackSnap = f;
    setCachedProjects(p);
    setTasks(t);
    setProjects(p);
    setContacts(c);
    setFeedbackItems(f);
    if (!silent) setLoading(false);
    // Preload all project avatar images so they are cached before the activity feed renders
    preloadImages(p.map((proj) => proj.avatarUrl).filter(Boolean) as string[]);
  }, [tasksApi, projectsApi, contactsApi]);

  // Initial data load on mount.
  // Use silent mode (no loading spinner) if we already have cached data to display.
  useEffect(() => {
    let mounted = true;
    const hasCache = getCachedTasksSync() !== null;
    // silent = true if we already have a cache, false if we don't
    fetchAllData(hasCache).catch(() => {}).finally(() => { if (!mounted) return; });
    return () => { mounted = false; };
  }, [fetchAllData]);

  // Stale-while-revalidate: silently refresh when the user switches back to this tab
  // and the tasks cache is older than 60 seconds, picking up changes from other users.
  useEffect(() => {
    if (!isActive) return;
    const projectsStale = areProjectsStale();
    if (areTasksStale() || projectsStale) {
      fetchAllData(true).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Listen for immediate task updates dispatched by task mutations.
  // so the Coming Due panel reflects due date changes without waiting for a re-fetch.
  useEffect(() => {
    const handleTaskUpdated = (e: Event) => {
      const updated = (e as CustomEvent<TaskItem>).detail;
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    };
    window.addEventListener('fomo:taskUpdated', handleTaskUpdated);
    return () => window.removeEventListener('fomo:taskUpdated', handleTaskUpdated);
  }, []);

  // Consolidate all tasks from global tasks and project tasks
  const allTasks = useMemo(() => {
    const list: Array<TaskItem & { projectId?: string, projectName?: string, projectIcon?: string, subprojectId?: string, source: 'global' | 'project' }> = tasks.map(t => ({
      ...t,
      source: 'global'
    }));

    projects.forEach(p => {
      if (p.archived) return;
      p.subprojects.forEach(sp => {
        sp.tasks.forEach(t => {
          list.push({
            ...t,
            id: t.id,
            text: t.text,
            done: t.done,
            dueDate: t.dueDate,
            favorite: t.favorite || t.starred || false,
            description: t.description || '',
            people: t.people,
            priority: (t as any).priority,
            projectId: p.id,
            projectName: p.text,
            projectIcon: (p as any).avatarUrl || null,
            subprojectId: sp.id,
            source: 'project'
          });
        });
      });
    });

    return list;
  }, [tasks, projects]);

  const favoriteTasks = useMemo(() => {
    return allTasks.filter(t => !t.done && t.favorite);
  }, [allTasks]);

  const overdueTasks = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return allTasks
      .filter(t => {
        if (t.done || !t.dueDate || Number.isNaN(new Date(t.dueDate).getTime())) return false;
        return t.dueDate.slice(0, 10) < today;
      })
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  }, [allTasks]);

  // "Coming Due" should only surface tasks due in the near future, not ones
  // that happen to be the earliest incomplete task but are a year+ away.
  // User can widen/narrow this window via the panel's filter control.
  const [dueWindow, setDueWindow] = useState<'30' | '90' | 'all'>('90');

  const comingDue = useMemo(() => {
    // Compare as Date objects (not raw strings) so date-only values like
    // "2026-09-15" sort/filter correctly against the current instant, and
    // so the year always takes precedence over month/day.
    const now = Date.now();
    const windowEndTime = dueWindow === 'all' ? Infinity : now + Number(dueWindow) * 24 * 60 * 60 * 1000;
    return allTasks
      .filter(t => {
        if (t.done || !t.dueDate) return false;
        const time = new Date(t.dueDate).getTime();
        return !Number.isNaN(time) && time >= now && time <= windowEndTime;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [allTasks, dueWindow]);

  const partnerActivity = useMemo(() => {
    return allTasks.filter(t => t.done && t.people && t.people.length > 0);
  }, [allTasks]);

  const handleNavigate = React.useCallback((tab: string, query: string, projectId?: string) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (query) {
      params.set('q', query);
    }
    if (projectId) {
      params.set('projectId', projectId);
    }
    router.push(`/?${params.toString()}`);
  }, [router]);

  const openTask = React.useCallback((task: DashboardTask) => {
    const params = new URLSearchParams({ tab: task.source === 'project' ? 'projects' : 'tasks', taskId: task.id });
    if (task.projectId) params.set('projectId', task.projectId);
    router.push(`/?${params.toString()}`);
  }, [router]);

  const updateDashboardTask = (task: DashboardTask, updated: ProjectTask) => {
    if (task.source === 'global') {
      updateNotificationTask(updated);
      return;
    }
    const project = projects.find(item => item.id === task.projectId);
    if (!project) {
      setNotificationTaskError('The project for this task is no longer available.');
      return;
    }
    void projectsApi.updateProject(project.id, {
      subprojects: project.subprojects.map(subproject => ({
        ...subproject,
        tasks: subproject.tasks.map(item => item.id === task.id ? { ...item, ...updated } : item),
      })),
    }).then(saved => {
      setProjects(previous => {
        const next = previous.map(item => item.id === saved.id ? saved : item);
        setCachedProjects(next);
        return next;
      });
    }).catch(error => {
      console.error('Failed to update project task:', error);
      setNotificationTaskError('Failed to update task. Please try again.');
    });
  };

  const markTaskDone = React.useCallback((task: DashboardTask) => {
    if (task.source === 'project') {
      const project = projects.find(p => p.id === task.projectId);
      if (!project) return;
      const updatedSubprojects = (project.subprojects || []).map(sp =>
        sp.id === task.subprojectId
          ? { ...sp, tasks: (sp.tasks || []).map(t => t.id === task.id ? { ...t, done: true } : t) }
          : sp
      );
      // Optimistically update so the task disappears from the panel immediately
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, subprojects: updatedSubprojects } : p));
      void projectsApi.updateProject(project.id, { subprojects: updatedSubprojects }).then(saved => {
        setProjects(prev => {
          const next = prev.map(p => p.id === saved.id ? saved : p);
          setCachedProjects(next);
          return next;
        });
      }).catch(error => {
        console.error('Failed to mark project task as done:', error);
        setProjects(prev => prev.map(p => p.id === project.id ? project : p));
      });
      return;
    }

    const previous = tasks.find(t => t.id === task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: true } : t));
    void tasksApi.updateTask(task.id, { done: true }).then(updated => {
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      window.dispatchEvent(new CustomEvent('fomo:taskUpdated', { detail: updated }));
    }).catch(error => {
      console.error('Failed to mark task as done:', error);
      if (previous) setTasks(prev => prev.map(t => t.id === previous.id ? previous : t));
    });
  }, [projects, projectsApi, tasks, tasksApi]);

  const activityFeed = useMemo(() => {
    const feed: any[] = [];
    
    const now = new Date();

    allTasks.forEach(t => {
      const events = [
        { action: 'created', time: t.createdAt, icon: 'add_circle', label: 'Created' },
        { action: 'completed', time: t.done ? t.completedAt : null, icon: 'check_circle', label: 'Completed' },
      ];
      events.forEach(event => {
        if (!event.time) return;
        feed.push({
          id: `task-${t.source}-${t.projectId ?? ''}-${t.id}-${event.action}`,
          type: 'task',
          title: t.text,
          meta: `${event.label}${t.projectName ? '' : ' · Global Task'}`,
          projectIcon: t.projectIcon,
          projectInitial: t.projectName ? t.projectName.charAt(0).toUpperCase() : undefined,
          icon: event.icon,
          iconColor: '#10b981',
          time: event.time,
          onClick: () => handleNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)
        });
      });
    });

    partnerActivity.forEach(t => {
      const timeStr = t.completedAt;
      if (!timeStr) return;
      feed.push({
        id: `partner-${t.id}`,
        type: 'partner',
        title: t.text,
        meta: `Completed by ${t.people!.map(p => p.name).join(', ')}`,
        projectIcon: t.projectIcon,
        projectInitial: t.projectName ? t.projectName.charAt(0).toUpperCase() : undefined,
        icon: 'contacts',
        iconColor: 'var(--color-primary, #6366f1)',
        avatarText: t.people?.[0]?.name.charAt(0).toUpperCase() || 'P',
        time: timeStr,
        onClick: () => handleNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)
      });
    });

    // New Connections
    contacts.forEach(c => {
      const timeStr = c.status === 'linked' ? c.linkedAt : c.createdAt;
      if (!timeStr) return;
      feed.push({
        id: `contact-${c.id}`,
        type: 'partner',
        title: c.name,
        meta: c.status === 'linked' ? 'Linked Connection' : 'New Contact',
        icon: 'contacts',
        iconColor: 'var(--color-secondary, #ec4899)',
        avatarText: c.name.charAt(0).toUpperCase(),
        time: timeStr,
        onClick: () => handleNavigate('people', c.name)
      });
    });

    // New Projects
    projects.forEach(p => {
       const timeStr = p.createdAt;
       if (!timeStr) return;
       feed.push({
        id: `project-${p.id}`,
        type: 'project',
        title: p.text,
        meta: `${p.subprojects.length} subprojects`,
        icon: p.avatarUrl || 'folder',
        isImageIcon: !!p.avatarUrl,
        projectInitial: p.text.charAt(0).toUpperCase(),
        iconColor: p.avatarUrl ? 'var(--color-text)' : 'var(--color-warning, #f59e0b)',
        time: timeStr,
        onClick: () => handleNavigate('projects', '', p.id)
       });
    });

    // Only show activity from the last 7 days
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = now.getTime() - ONE_WEEK_MS;
    return feed.filter(item => {
      const time = new Date(item.time).getTime();
      return time >= cutoff && time <= now.getTime();
    }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime() || a.id.localeCompare(b.id));
  }, [allTasks, partnerActivity, contacts, projects, handleNavigate]);

  const filteredFeed = useMemo(() => {
    if (activeFilters.length === 0) return activityFeed;
    return activityFeed.filter(item => activeFilters.includes(item.type));
  }, [activityFeed, activeFilters]);

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? new Date(`${dateStr}T00:00:00`)
        : new Date(dateStr);
      if (Number.isNaN(date.getTime())) return dateStr;
      // Always include the year so far-future/past dates aren't confused with
      // this year's dates that happen to share the same month/day.
      const includeYear = date.getFullYear() !== new Date().getFullYear();
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        ...(includeYear ? { year: 'numeric' } : {}),
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Global search results across all content types
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div style={style}>
      <ContentHeader title="Home" />
      {notificationTaskError && <p role="alert">{notificationTaskError}</p>}
      {!loading && notificationTaskId && !notificationTask && (
        <p role="alert">The task for this notification is no longer available.</p>
      )}
      {notificationTask && (
        <section className={`${styles.card} ${styles.openTask}`}>
          <h2>{notificationTask.text}</h2>
          <TaskModal
            key={notificationTask.id}
            inline
            task={{ ...notificationTask, people: notificationTask.people ?? [] }}
            allPeople={contacts}
            onUpdateTask={updateNotificationTask}
            onSave={() => setNotificationTaskId(null)}
            onClose={() => setNotificationTaskId(null)}
          />
        </section>
      )}
      <div className={styles.container}>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading dashboard...</div>
      ) : hasSearch ? (
        <GlobalSearchResults
          searchQuery={searchQuery}
          allTasks={allTasks}
          projects={projects}
          contacts={contacts}
          feedbackItems={feedbackItems}
          onNavigate={handleNavigate}
        />
      ) : (
      <div className={styles.dashboardGrid}>
        <div className={styles.dashboardColumn}>
          {/* Favorite Tasks */}
          <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={`material-icons ${styles.cardIcon}`}>star</span>
            <h2 className={styles.cardTitle}>Favorites</h2>
          </div>
          <ul className={styles.list}>
            {favoriteTasks.length === 0 && <li className={styles.listItem}><div className={styles.itemContent}><p className={styles.itemMeta}>No favorite tasks.</p></div></li>}
            {(showMoreFavorites ? favoriteTasks : favoriteTasks.slice(0, 5)).map(t => (
              <DashboardTaskItem
                key={t.id}
                task={t}
                icon="star"
                meta={t.projectName || 'Global Task'}
                onOpen={openTask}
                onMarkDone={markTaskDone}
                onUpdate={updateDashboardTask}
                allPeople={t.projectId ? projectPeople.get(t.projectId) ?? [] : contacts}
              />
            ))}
            {favoriteTasks.length > 5 && (
              <li className={styles.showMoreItem} onClick={() => setShowMoreFavorites(v => !v)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>{showMoreFavorites ? 'expand_less' : 'expand_more'}</span>
                {showMoreFavorites ? 'Show less' : `Show ${favoriteTasks.length - 5} more`}
              </li>
            )}
          </ul>
          </div>

          {/* Activity Feed */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`material-icons ${styles.cardIcon}`}>receipt_long</span>
              <h2 className={styles.cardTitle}>Recent Activity</h2>
              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', alignItems: 'center' }}>
                <button
                  onClick={() => toggleFilter('task')}
                  style={{ background: activeFilters.includes('task') ? 'var(--color-bg)' : 'transparent', border: '1px solid ' + (activeFilters.includes('task') ? 'var(--color-border)' : 'transparent'), borderRadius: '4px', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: activeFilters.includes('task') ? 1 : 0.6 }}
                  title="Tasks"
                >
                  <span className="material-icons" style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>check_circle</span>
                </button>
                <button
                  onClick={() => toggleFilter('partner')}
                  style={{ background: activeFilters.includes('partner') ? 'var(--color-bg)' : 'transparent', border: '1px solid ' + (activeFilters.includes('partner') ? 'var(--color-border)' : 'transparent'), borderRadius: '4px', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: activeFilters.includes('partner') ? 1 : 0.6 }}
                  title="Partner Activity & Connections"
                >
                  <span className="material-icons" style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>contacts</span>
                </button>
                <button
                  onClick={() => toggleFilter('project')}
                  style={{ background: activeFilters.includes('project') ? 'var(--color-bg)' : 'transparent', border: '1px solid ' + (activeFilters.includes('project') ? 'var(--color-border)' : 'transparent'), borderRadius: '4px', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: activeFilters.includes('project') ? 1 : 0.6 }}
                  title="New Projects"
                >
                  <span className="material-icons" style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>folder</span>
                </button>
              </div>
            </div>
            <ul className={styles.list}>
              {filteredFeed.length === 0 && <li className={styles.listItem}><div className={styles.itemContent}><p className={styles.itemMeta}>No activity in the last 7 days.</p></div></li>}
              {(showMoreFeed ? filteredFeed : filteredFeed.slice(0, 5)).map(item => (
                <li key={item.id} className={styles.listItem} onClick={item.onClick}>
                  {item.isImageIcon ? (
                    <EntityIcon size={20} src={item.icon} initial={item.projectInitial} iconColor={item.iconColor} />
                  ) : item.type === 'project' && item.projectInitial ? (
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: item.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: '2px' }}>
                      {item.projectInitial}
                    </div>
                  ) : (
                    <span className={`material-icons ${styles.itemIcon}`} style={{ color: item.iconColor }}>{item.icon}</span>
                  )}
                  <div className={styles.itemContent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className={styles.itemTitle}>{item.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.projectIcon ? (
                          <EntityIcon size={16} src={item.projectIcon} initial={item.projectInitial} title={item.meta || 'Project'} />
                        ) : item.projectInitial && item.type !== 'project' ? (
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--color-warning, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', flexShrink: 0 }} title={item.meta || 'Project'}>
                            {item.projectInitial}
                          </div>
                        ) : null}
                        {item.time && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{formatDate(item.time)}</span>}
                      </div>
                    </div>
                    {item.meta && <p className={styles.itemMeta}>{item.meta}</p>}
                  </div>
                </li>
              ))}
              {filteredFeed.length > 5 && (
                <li className={styles.showMoreItem} onClick={() => setShowMoreFeed(v => !v)}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>{showMoreFeed ? 'expand_less' : 'expand_more'}</span>
                  {showMoreFeed ? 'Show less' : `Show ${filteredFeed.length - 5} more`}
                </li>
              )}
            </ul>
          </div>
        </div>

        {overdueTasks.length > 0 && (
          <div className={styles.dashboardColumn}>
            {/* Overdue Tasks */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={`material-icons ${styles.overdueIcon}`}>warning</span>
                <h2 className={styles.cardTitle}>Overdue</h2>
              </div>
              <ul className={styles.list}>
                {(showMoreOverdue ? overdueTasks : overdueTasks.slice(0, 5)).map(t => (
                  <DashboardTaskItem
                    key={t.id}
                    task={t}
                    icon="error_outline"
                    iconClassName={styles.overdueIcon}
                    meta={`Overdue: ${formatDate(t.dueDate)}`}
                    metaClassName={styles.overdueText}
                    onOpen={openTask}
                    onMarkDone={markTaskDone}
                    onUpdate={updateDashboardTask}
                    allPeople={t.projectId ? projectPeople.get(t.projectId) ?? [] : contacts}
                  />
                ))}
                {overdueTasks.length > 5 && (
                  <li className={styles.showMoreItem} onClick={() => setShowMoreOverdue(v => !v)}>
                    <span className="material-icons" style={{ fontSize: '16px' }}>{showMoreOverdue ? 'expand_less' : 'expand_more'}</span>
                    {showMoreOverdue ? 'Show less' : `Show ${overdueTasks.length - 5} more`}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Coming Due */}
        <div className={styles.dashboardColumn}>
          <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={`material-icons ${styles.cardIcon}`}>schedule</span>
            <h2 className={styles.cardTitle}>Coming Due</h2>
            <div className={styles.dueFilterOptions} role="group" aria-label="Coming due time range">
              {(['30', '90', 'all'] as const).map(opt => (
                <span
                  key={opt}
                  className={`${styles.dueFilterOption} ${dueWindow === opt ? styles.dueFilterOptionActive : ''}`}
                  onClick={() => setDueWindow(opt)}
                >
                  {opt === 'all' ? 'All' : `${opt}d`}
                </span>
              ))}
            </div>
          </div>
          <ul className={styles.list}>
            {comingDue.length === 0 && <li className={styles.listItem}><div className={styles.itemContent}><p className={styles.itemMeta}>No upcoming tasks due shortly.</p></div></li>}
            {(showMoreDue ? comingDue : comingDue.slice(0, 5)).map(t => (
              <DashboardTaskItem
                key={t.id}
                task={t}
                icon="event"
                meta={`Due: ${formatDate(t.dueDate)}`}
                onOpen={openTask}
                onMarkDone={markTaskDone}
                onUpdate={updateDashboardTask}
                allPeople={t.projectId ? projectPeople.get(t.projectId) ?? [] : contacts}
              />
            ))}
            {comingDue.length > 5 && (
              <li className={styles.showMoreItem} onClick={() => setShowMoreDue(v => !v)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>{showMoreDue ? 'expand_less' : 'expand_more'}</span>
                {showMoreDue ? 'Show less' : `Show ${comingDue.length - 5} more`}
              </li>
            )}
          </ul>
        </div>
        </div>
      </div>
      )}
    </div>
    </div>
  );
}
