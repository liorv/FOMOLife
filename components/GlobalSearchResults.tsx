'use client';

import React from 'react';
import type { ProjectItem, Contact } from '@myorg/types';

export interface FlatTask {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string | null;
  description?: string;
  projectId?: string;
  projectName?: string;
  projectIcon?: string | null;
}

export interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  description: string;
  authorName: string;
  createdAt: string;
}

type Props = {
  searchQuery: string;
  allTasks: FlatTask[];
  projects: ProjectItem[];
  contacts: Contact[];
  feedbackItems: FeedbackItem[];
  onNavigate: (tab: string, query: string, projectId?: string) => void;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

type SearchResult =
  | { kind: 'task'; item: FlatTask }
  | { kind: 'project'; item: ProjectItem }
  | { kind: 'contact'; item: Contact }
  | { kind: 'feedback'; item: FeedbackItem };

function buildResults(
  searchQuery: string,
  allTasks: FlatTask[],
  projects: ProjectItem[],
  contacts: Contact[],
  feedbackItems: FeedbackItem[],
): SearchResult[] {
  const ql = searchQuery.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (const t of allTasks) {
    if ((t.text || '').toLowerCase().includes(ql) || (t.description || '').toLowerCase().includes(ql)) {
      results.push({ kind: 'task', item: t });
    }
  }
  for (const p of projects) {
    if ((p.text || '').toLowerCase().includes(ql)) {
      results.push({ kind: 'project', item: p });
    }
  }
  for (const c of contacts) {
    if ((c.name || '').toLowerCase().includes(ql)) {
      results.push({ kind: 'contact', item: c });
    }
  }
  for (const f of feedbackItems) {
    if ((f.title || '').toLowerCase().includes(ql) || (f.description || '').toLowerCase().includes(ql)) {
      results.push({ kind: 'feedback', item: f });
    }
  }
  return results;
}

export default function GlobalSearchResults({
  searchQuery,
  allTasks,
  projects,
  contacts,
  feedbackItems,
  onNavigate,
}: Props) {
  const results = React.useMemo(
    () => buildResults(searchQuery, allTasks, projects, contacts, feedbackItems),
    [searchQuery, allTasks, projects, contacts, feedbackItems],
  );

  return (
    <div style={{ width: 'min(800px, 100%)', margin: '0 auto', boxSizing: 'border-box' }}>
      <div className="search-results-list">
        {results.length === 0 ? (
          <p className="sidebar-no-results">No matches for &ldquo;{searchQuery}&rdquo;</p>
        ) : results.map((result, idx) => {
          if (result.kind === 'project') {
            const p = result.item;
            return (
              <div
                key={`proj-${p.id}`}
                className="search-result-row search-result-row--project"
                onClick={() => onNavigate('projects', '', p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate('projects', '', p.id)}
              >
                <span className="search-result-dot" style={{ background: p.color || '#1a73e8' }} />
                <span className="search-result-text">{p.text}</span>
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: p.color || '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {p.text.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="search-result-badge">Project</span>
                <span className="material-icons search-result-chevron">chevron_right</span>
              </div>
            );
          }

          if (result.kind === 'task') {
            const t = result.item;
            return (
              <div
                key={`task-${t.id}-${idx}`}
                className={`search-result-row${t.done ? ' search-result-row--done' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate(t.projectName ? 'projects' : 'tasks', t.text, t.projectId)}
              >
                <span
                  className="material-icons search-result-check"
                  style={{ color: t.done ? 'var(--color-success, #22c55e)' : 'var(--color-text-muted, #94a3b8)', fontSize: '20px', flexShrink: 0 }}
                >
                  {t.done ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <div className="search-result-body">
                  <span className="search-result-task-text">{t.text}</span>
                  <span className="search-result-meta">
                    {t.projectName ? (
                      <>
                        {t.projectIcon ? (
                          <img src={t.projectIcon} alt="" style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <span className="search-result-dot search-result-dot--sm" style={{ background: 'var(--color-warning, #f59e0b)' }} />
                        )}
                        {t.projectName}
                      </>
                    ) : 'Global Task'}
                    {t.dueDate && <span className="search-result-due"> · Due {formatDate(t.dueDate)}</span>}
                  </span>
                </div>
                <span className="search-result-badge search-result-badge--task">Task</span>
                <span className="material-icons search-result-chevron">chevron_right</span>
              </div>
            );
          }

          if (result.kind === 'contact') {
            const c = result.item;
            return (
              <div
                key={`contact-${c.id}`}
                className="search-result-row search-result-row--project"
                onClick={() => onNavigate('people', c.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate('people', c.name)}
              >
                <span className="material-icons" style={{ fontSize: '18px', color: 'var(--color-secondary, #ec4899)', flexShrink: 0 }}>contacts</span>
                <span className="search-result-text">{c.name}</span>
                <span className="search-result-badge search-result-badge--contact">Contact</span>
                <span className="material-icons search-result-chevron">chevron_right</span>
              </div>
            );
          }

          if (result.kind === 'feedback') {
            const f = result.item;
            return (
              <div
                key={`feedback-${f.id}`}
                className="search-result-row search-result-row--project"
                onClick={() => onNavigate('feedback', f.title)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate('feedback', f.title)}
              >
                <span className="material-icons" style={{ fontSize: '18px', color: 'var(--color-primary, #6366f1)', flexShrink: 0 }}>forum</span>
                <span className="search-result-text">{f.title}</span>
                <span className="search-result-badge search-result-badge--feedback">{f.type === 'bug' ? 'Bug' : 'Feature'}</span>
                <span className="material-icons search-result-chevron">chevron_right</span>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
