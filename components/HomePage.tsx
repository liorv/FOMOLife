'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './HomePage.module.css';
import ReleaseNotes from './ReleaseNotes';
import { createTasksApiClient, createProjectsApiClient, createContactsApiClient } from '@myorg/api-client';
import type { TaskItem, ProjectItem, Contact, ProjectTask } from '@myorg/types';
import GlobalSearchResults, { type FeedbackItem } from './GlobalSearchResults';

type Props = {
  style?: React.CSSProperties;
  searchQuery?: string;
};

export default function HomePage({ style, searchQuery = '' }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const tasksApi = useMemo(() => createTasksApiClient(''), []);
  const projectsApi = useMemo(() => createProjectsApiClient(''), []);
  const contactsApi = useMemo(() => createContactsApiClient(''), []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      tasksApi.listTasks().catch(() => []),
      projectsApi.listProjects().catch(() => []),
      contactsApi.listContacts().catch(() => []),
      fetch('/api/feedback').then(r => r.ok ? r.json() : { feedback: [] }).then((d: { feedback: FeedbackItem[] }) => d.feedback).catch(() => [] as FeedbackItem[])
    ]).then(([t, p, c, f]) => {
      if (mounted) {
        setTasks(t);
        setProjects(p);
        setContacts(c);
        setFeedbackItems(f);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [tasksApi, projectsApi, contactsApi]);

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
    return allTasks.filter(t => !t.done && t.favorite).slice(0, 3);
  }, [allTasks]);

  const comingDue = useMemo(() => {
    const now = new Date().toISOString();
    return allTasks
      .filter(t => !t.done && t.dueDate && t.dueDate >= now)
      .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
      .slice(0, 3);
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
      // simulate completed time based on ID or fallback
      const timeStr = t.dueDate || new Date(now.getTime() - Math.random() * 86400000).toISOString();
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
      const timeStr = t.dueDate || new Date(now.getTime() - Math.random() * 86400000 * 2).toISOString();
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

    return feed;
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
    <div className={styles.container} style={style}>
      <div className={styles.header}>
        <h1 className={styles.title}>Home</h1>
        <div className={styles.headerActions}>
          <a
            href="https://paypal.me/lior441"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.paypalLink}
          >
            <svg className={styles.paypalIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.824l-1.338 8.49h3.607c.524 0 .969-.382 1.051-.9l.944-5.983c.083-.518.527-.9 1.051-.9h.663c4.296 0 7.662-1.747 8.647-6.797.35-1.798.073-3.062-.827-3.705z"/>
            </svg>
            <span className={styles.buttonText}>Support this project</span>
          </a>

          <a
            href="https://www.buymeacoffee.com/liorv"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.bmcLink}
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
              alt=""
              className={styles.bmcIcon}
            />
            <span className={styles.buttonText}>Buy me a coffee</span>
          </a>
          
          <ReleaseNotes />
        </div>
      </div>

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
            {favoriteTasks.map(t => (
              <li key={t.id} className={styles.listItem} onClick={() => handleNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)}>
                <span className={`material-icons ${styles.itemIcon}`}>star</span>
                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle}>{t.text}</h3>
                  <p className={styles.itemMeta}>{t.projectName || 'Global Task'}</p>
                </div>
              </li>
            ))}
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
            {comingDue.map(t => (
              <li key={t.id} className={styles.listItem} onClick={() => handleNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)}>
                <span className={`material-icons ${styles.itemIcon}`}>event</span>
                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle}>{t.text}</h3>
                  <p className={styles.itemMeta}>Due: {formatDate(t.dueDate)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Activity Feed */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={`material-icons ${styles.cardIcon}`}>receipt_long</span>
            <h2 className={styles.cardTitle}>Activities</h2>
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
            {filteredFeed.length === 0 && <li className={styles.listItem}><div className={styles.itemContent}><p className={styles.itemMeta}>No recent activity.</p></div></li>}
            {filteredFeed.map(item => (
              <li key={item.id} className={styles.listItem} onClick={item.onClick}>
                {item.isImageIcon ? (
                  <img src={item.icon} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', marginTop: '2px' }} />
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
                        <img src={item.projectIcon} alt="Project" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }} title={item.meta || 'Project'} />
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
          </ul>
        </div>
      </div>
      )}
    </div>
  );
}
