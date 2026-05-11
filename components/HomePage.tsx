'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './HomePage.module.css';
import { createTasksApiClient, createProjectsApiClient, createContactsApiClient } from '@myorg/api-client';
import { preloadImages } from '@myorg/utils';
import type { TaskItem, ProjectItem, Contact, ProjectTask } from '@myorg/types';
import GlobalSearchResults, { type FeedbackItem } from './GlobalSearchResults';
import ContentHeader from './ContentHeader';
import { getCachedProjectsSync, setCachedProjects, areProjectsStale } from '@/lib/client/projectsCache';
import { getCachedContactsSync } from '@/lib/client/contactsCache';

// Module-level snapshot for tasks and feedback (survives React remounts)
// Initialized from sessionStorage so data is available immediately on page reload.
const TASKS_SESSION_KEY = 'fomo:tasksCache';

function tryLoadTasksSession(): { data: TaskItem[]; fetchedAt: number } | null {
  try {
    const raw = sessionStorage.getItem(TASKS_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const _initialTasksCache =
  typeof sessionStorage !== 'undefined' ? tryLoadTasksSession() : null;

let _tasksSnap: TaskItem[] | null = _initialTasksCache?.data ?? null;
let _tasksFetchedAt: number | null = _initialTasksCache?.fetchedAt ?? null;
let _feedbackSnap: FeedbackItem[] | null = null;

const TASKS_STALE_AFTER_MS = 60_000;

type Props = {
  style?: React.CSSProperties;
  searchQuery?: string;
  onReady?: () => void;
  isActive?: boolean;
};

// Renders a project icon image with a letter-initial fallback when the image fails to load
function ActivityIconImg({ src, initial, iconColor }: { src: string; initial?: string; iconColor?: string }) {
  const [err, setErr] = React.useState(false);
  if (err) {
    return (
      <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: iconColor || 'var(--color-warning, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: '2px' }}>
        {initial}
      </div>
    );
  }
  return <img src={src} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', marginTop: '2px' }} onError={() => setErr(true)} />;
}

// Renders a small project badge image with a letter-initial fallback when the image fails to load
function ProjectBadgeImg({ src, initial, title }: { src: string; initial?: string; title?: string }) {
  const [err, setErr] = React.useState(false);
  if (err) {
    return (
      <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--color-warning, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', flexShrink: 0 }} title={title}>
        {initial}
      </div>
    );
  }
  return <img src={src} alt="Project" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }} title={title} onError={() => setErr(true)} />;
}

export default function HomePage({ style, searchQuery = '', onReady, isActive }: Props) {
  const router = useRouter();
  // Always start with empty/loading state so SSR and client initial render match.
  // We sync from the module-level cache in useLayoutEffect (runs before paint on client
  // only, so there's no visual flash and no hydration mismatch).
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showMoreFavorites, setShowMoreFavorites] = useState(false);
  const [showMoreDue, setShowMoreDue] = useState(false);
  const [showMoreFeed, setShowMoreFeed] = useState(false);
  const onReadyCalledRef = useRef(false);

  // Sync from module-level cache immediately after mount, before first paint.
  // This avoids a hydration mismatch (server always renders loading state)
  // while still giving instant content when cache is populated.
  useLayoutEffect(() => {
    if (_tasksSnap !== null) {
      setTasks(_tasksSnap);
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

  // Fetches all home data. `silent` = true skips the loading spinner (background refresh).
  const fetchAllData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [t, p, c, f] = await Promise.all([
      tasksApi.listTasks().catch(() => [] as TaskItem[]),
      projectsApi.listProjects().catch(() => [] as ProjectItem[]),
      contactsApi.listContacts().catch(() => [] as Contact[]),
      fetch('/api/feedback').then(r => r.ok ? r.json() : { feedback: [] }).then((d: { feedback: FeedbackItem[] }) => d.feedback).catch(() => [] as FeedbackItem[])
    ]);
    _tasksSnap = t;
    _tasksFetchedAt = Date.now();
    _feedbackSnap = f;
    setCachedProjects(p);
    try {
      sessionStorage.setItem(TASKS_SESSION_KEY, JSON.stringify({ data: t, fetchedAt: _tasksFetchedAt }));
    } catch { /* ignore */ }
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
    const hasCache = _tasksSnap !== null;
    // silent = true if we already have a cache, false if we don't
    fetchAllData(hasCache).catch(() => {}).finally(() => { if (!mounted) return; });
    return () => { mounted = false; };
  }, [fetchAllData]);

  // Stale-while-revalidate: silently refresh when the user switches back to this tab
  // and the tasks cache is older than 60 seconds, picking up changes from other users.
  useEffect(() => {
    if (!isActive) return;
    const taskAge = _tasksFetchedAt !== null ? Date.now() - _tasksFetchedAt : Infinity;
    const projectsStale = areProjectsStale();
    if (taskAge > TASKS_STALE_AFTER_MS || projectsStale) {
      fetchAllData(true).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Consolidate all tasks from global tasks and project tasks
  const allTasks = useMemo(() => {
    const list: Array<TaskItem & { projectId?: string, projectName?: string, projectIcon?: string, source: 'global' | 'project' }> = tasks.map(t => ({
      ...t,
      source: 'global'
    }));

    projects.forEach(p => {
      p.subprojects.forEach(sp => {
        sp.tasks.forEach(t => {
          list.push({
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

  const comingDue = useMemo(() => {
    const now = new Date().toISOString();
    return allTasks
      .filter(t => !t.done && t.dueDate && t.dueDate >= now)
      .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1));
  }, [allTasks]);

  const recentlyCompleted = useMemo(() => {
    // We don't have completedAt, so we just take some done tasks
    return allTasks.filter(t => t.done);
  }, [allTasks]);

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

  const activityFeed = useMemo(() => {
    const feed: any[] = [];
    
    // Add realistic timestamps since we don't have them in data
    // We mock sortable timestamps by using dueDate or current time
    const now = new Date();

    recentlyCompleted.forEach(t => {
      // Use the real completedAt timestamp; fall back to dueDate if not yet populated
      const timeStr = (t as any).completedAt || t.dueDate;
      if (!timeStr) return; // skip if no timestamp at all — won't pass the 7-day cutoff anyway
      feed.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.text,
        meta: t.projectName ? '' : 'Global Task',
        projectIcon: t.projectIcon,
        projectInitial: t.projectName ? t.projectName.charAt(0).toUpperCase() : undefined,
        icon: 'check_circle',
        iconColor: '#10b981',
        time: timeStr,
        onClick: () => handleNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)
      });
    });

    partnerActivity.forEach(t => {
      const timeStr = (t as any).completedAt || t.dueDate;
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
      const timeStr = new Date(now.getTime() - Math.random() * 86400000 * 5).toISOString();
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
       const timeStr = new Date(now.getTime() - Math.random() * 86400000 * 3).toISOString();
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

    // Sort showing more recent on top
    feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Only show activity from the last 7 days
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = now.getTime() - ONE_WEEK_MS;
    return feed.filter(item => new Date(item.time).getTime() >= cutoff);
  }, [recentlyCompleted, partnerActivity, contacts, projects, handleNavigate]);

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
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Global search results across all content types
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div style={style}>
      <ContentHeader title="Home" />
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
        {/* Favorite Tasks */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={`material-icons ${styles.cardIcon}`}>star</span>
            <h2 className={styles.cardTitle}>Favorites</h2>
          </div>
          <ul className={styles.list}>
            {favoriteTasks.length === 0 && <li className={styles.listItem}><div className={styles.itemContent}><p className={styles.itemMeta}>No favorite tasks.</p></div></li>}
            {(showMoreFavorites ? favoriteTasks : favoriteTasks.slice(0, 5)).map(t => (
              <li key={t.id} className={styles.listItem} onClick={() => handleNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)}>
                <span className={`material-icons ${styles.itemIcon}`}>star</span>
                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle}>{t.text}</h3>
                  <p className={styles.itemMeta}>{t.projectName || 'Global Task'}</p>
                </div>
              </li>
            ))}
            {favoriteTasks.length > 5 && (
              <li className={styles.showMoreItem} onClick={() => setShowMoreFavorites(v => !v)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>{showMoreFavorites ? 'expand_less' : 'expand_more'}</span>
                {showMoreFavorites ? 'Show less' : `Show ${favoriteTasks.length - 5} more`}
              </li>
            )}
          </ul>
        </div>

        {/* Coming Due */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={`material-icons ${styles.cardIcon}`}>schedule</span>
            <h2 className={styles.cardTitle}>Coming Due</h2>
          </div>
          <ul className={styles.list}>
            {comingDue.length === 0 && <li className={styles.listItem}><div className={styles.itemContent}><p className={styles.itemMeta}>No upcoming tasks due shortly.</p></div></li>}
            {(showMoreDue ? comingDue : comingDue.slice(0, 5)).map(t => (
              <li key={t.id} className={styles.listItem} onClick={() => handleNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)}>
                <span className={`material-icons ${styles.itemIcon}`}>event</span>
                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle}>{t.text}</h3>
                  <p className={styles.itemMeta}>Due: {formatDate(t.dueDate)}</p>
                </div>
              </li>
            ))}
            {comingDue.length > 5 && (
              <li className={styles.showMoreItem} onClick={() => setShowMoreDue(v => !v)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>{showMoreDue ? 'expand_less' : 'expand_more'}</span>
                {showMoreDue ? 'Show less' : `Show ${comingDue.length - 5} more`}
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
                  <ActivityIconImg src={item.icon} initial={item.projectInitial} iconColor={item.iconColor} />
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
                        <ProjectBadgeImg src={item.projectIcon} initial={item.projectInitial} title={item.meta || 'Project'} />
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
      )}
    </div>
    </div>
  );
}
