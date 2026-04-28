'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './FeedbackPage.module.css';
import ContentHeader from './ContentHeader';
import { ModalOverlay } from '@myorg/ui';

type FeedbackType = 'feature' | 'bug';

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  votes: Record<string, 1 | -1>;
  completions: Record<string, true>;
}

type Props = {
  userId: string;
  userName: string;
  style?: React.CSSProperties;
};

type FilterType = 'all' | 'feature' | 'bug';

function getScore(item: FeedbackItem): number {
  return Object.values(item.votes).reduce((s, v) => s + v, 0);
}

function formatAuthorName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first || !last || parts.length < 2) return fullName;
  return `${first} ${last[0]}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedbackPage({ userId, userName, style }: Props) {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Add panel state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addType, setAddType] = useState<FeedbackType>('feature');
  const [addTitle, setAddTitle] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const addInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/feedback');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.feedback ?? []);
    } catch {
      setError('Failed to load feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const openPanel = () => setShowAddPanel(true);
    window.addEventListener('framework-action-add-feedback', openPanel);
    return () => window.removeEventListener('framework-action-add-feedback', openPanel);
  }, []);

  const handleVote = async (id: string, direction: 1 | -1) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const current = item.votes[userId];
    const newVote = current === direction ? 0 : direction;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, votes: { ...i.votes } };
        if (newVote === 0) delete updated.votes[userId];
        else updated.votes[userId] = newVote as 1 | -1;
        return updated;
      }),
    );

    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, vote: newVote }),
      });
      if (!res.ok) throw new Error();
      const updated: FeedbackItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch {
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {

    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) fetchItems();
    } catch {
      fetchItems();
    }
  };

  const handleMarkComplete = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const completions = item.completions ?? {};
    const alreadyMarked = !!completions[userId];
    const newMark = !alreadyMarked;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, completions: { ...(i.completions ?? {}) } };
        if (newMark) updated.completions[userId] = true;
        else delete updated.completions[userId];
        return updated;
      }),
    );

    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, complete: newMark }),
      });
      if (!res.ok) { fetchItems(); return; }
      const data = await res.json();
      if (data.archived) {
        // Remove archived item from list
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
      }
    } catch {
      fetchItems();
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = addTitle.trim();
    if (!title) { setAddError('Enter a title.'); addInputRef.current?.focus(); return; }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: addType, title, description: '' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error ?? 'Submission failed.');
        return;
      }
      const created: FeedbackItem = await res.json();
      setItems((prev) => [created, ...prev]);
      setAddTitle('');
      setShowAddPanel(false);
    } catch {
      setAddError('Submission failed.');
    } finally {
      setAdding(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => (filter === 'all' ? true : i.type === filter))
      .filter((i) =>
        q ? i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => {
        const diff = getScore(b) - getScore(a);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [items, search, filter]);

  return (
    <div className={styles.page} style={style}>
      <ContentHeader title="Feedback" />
      <div className={styles.contentContainer}>
        {/* ── Filter chips ── */}
        <div className={styles.filterRow}>
          {(['all', 'feature', 'bug'] as FilterType[]).map((f) => (
            <button
              key={f}
              className={`${styles.filterChip} ${filter === f ? styles.filterChipActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'feature' ? 'Features' : 'Bugs'}
              {f !== 'all' && (
                <span className={styles.filterCount}>
                  {items.filter((i) => i.type === f).length}
                </span>
              )}
            </button>
          ))}
</div>

        {/* ── List ── */}
        {loading ? (
          <div className={styles.center}>
            <span className="material-icons" style={{ fontSize: 36, color: '#6366f1', animation: 'fb-spin 1s linear infinite' }}>autorenew</span>
          </div>
        ) : error ? (
          <div className={styles.center}>
            <span className="material-icons" style={{ color: '#ef4444', fontSize: 32 }}>error_outline</span>
            <p className={styles.centerText}>{error}</p>
            <button className={styles.retryBtn} onClick={fetchItems}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.center}>
            <span className="material-icons" style={{ fontSize: 44, color: '#cbd5e1' }}>{search ? 'search_off' : 'lightbulb'}</span>
            <p className={styles.centerText}>
              {search ? `No results for "${search}"` : 'No requests yet — press + to add the first one!'}
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {filtered.map((item) => {
              const score = getScore(item);
              const myVote = item.votes[userId];
              const isOwn = item.authorId === userId;
              return (
                <li key={item.id} className={styles.card}>
                  {/* Vote */}
                  <div className={styles.voteCol}>
                    <button
                      className={`${styles.voteBtn} ${myVote === 1 ? styles.upvoted : ''}`}
                      onClick={() => handleVote(item.id, 1)}
                      aria-label="Upvote"
                    >
                      <span className="material-icons">add</span>
                    </button>
                    <span className={`${styles.score} ${score > 0 ? styles.scorePos : score < 0 ? styles.scoreNeg : ''}`}>
                      {score}
                    </span>
                    <button
                      className={`${styles.voteBtn} ${myVote === -1 ? styles.downvoted : ''}`}
                      onClick={() => handleVote(item.id, -1)}
                      aria-label="Downvote"
                    >
                      <span className="material-icons">remove</span>
                    </button>
                  </div>

                  {/* Type chip */}
                  <span className={`${styles.typePill} ${item.type === 'feature' ? styles.pillFeature : styles.pillBug}`}>
                    <span className="material-icons" style={{ fontSize: 12 }}>
                      {item.type === 'feature' ? 'auto_awesome' : 'bug_report'}
                    </span>
                  </span>

                  {/* Title + meta */}
                  <div className={styles.cardBody}>
                    <span className={styles.cardTitle}>{item.title}</span>
                    <span className={styles.cardMeta}>{formatAuthorName(item.authorName)} · {timeAgo(item.createdAt)}</span>
                  </div>

                  {/* Actions column */}
                  <div className={styles.actionsCol}>
                    {/* Mark Complete */}
                    {(() => {
                      const completions = item.completions ?? {};
                      const count = Object.keys(completions).length;
                      const iMarked = !!completions[userId];
                      return (
                        <button
                          className={`${styles.completeBtn} ${iMarked ? styles.completeBtnActive : ''}`}
                          onClick={() => handleMarkComplete(item.id)}
                          aria-label={iMarked ? 'Unmark as completed' : 'Mark as completed'}
                          title={iMarked ? `You marked this done (${count}/3 confirmations)` : `Mark as done (${count}/3 confirmations)`}
                        >
                          <span className="material-icons">{iMarked ? 'check_circle' : 'check_circle_outline'}</span>
                          {count > 0 && <span className={styles.completionCount}>{count}/3</span>}
                        </button>
                      );
                    })()}

                    {/* Delete (own only) */}
                    {isOwn && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete"
                        title="Delete your request"
                      >
                        <span className="material-icons">close</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Bottom sheet: Add Feedback ── */}
      <ModalOverlay
        open={showAddPanel}
        onClose={() => { setShowAddPanel(false); setAddTitle(''); setAddError(null); }}
        className={styles.bottomSheetOverlay}
        contentClassName={styles.bottomSheetContent}
      >
        <div className={styles.bottomSheetHandle} />
        <div className={styles.bottomSheetHeader}>
          <span className={styles.bottomSheetTitle}>Add Feedback</span>
          <button
            type="button"
            className={styles.bottomSheetClose}
            onClick={() => { setShowAddPanel(false); setAddTitle(''); setAddError(null); }}
            aria-label="Close"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <form onSubmit={handleAdd} noValidate className={styles.bottomSheetForm}>
          <div className={styles.typeChips}>
            <button
              type="button"
              className={`${styles.chip} ${addType === 'feature' ? styles.chipFeature : ''}`}
              onClick={() => setAddType('feature')}
              aria-pressed={addType === 'feature'}
            >
              <span className="material-icons" style={{ fontSize: 14 }}>auto_awesome</span>
              Feature
            </button>
            <button
              type="button"
              className={`${styles.chip} ${addType === 'bug' ? styles.chipBug : ''}`}
              onClick={() => setAddType('bug')}
              aria-pressed={addType === 'bug'}
            >
              <span className="material-icons" style={{ fontSize: 14 }}>bug_report</span>
              Bug
            </button>
          </div>
          <textarea
            ref={addInputRef}
            className={`${styles.addInput} ${styles.addInputFull} ${addError ? styles.addInputError : ''}`}
            rows={2}
            placeholder={addType === 'feature' ? 'Describe the feature you want…' : 'Describe the bug…'}
            value={addTitle}
            onChange={(e) => { setAddTitle(e.target.value); if (addError) setAddError(null); }}
            maxLength={120}
            aria-label="Request title"
          />
          {addError && <p className={styles.addErr}>{addError}</p>}
          <button type="submit" className={styles.addBtnFull} disabled={adding}>
            <span className="material-icons">{adding ? 'hourglass_top' : 'send'}</span>
            {adding ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </ModalOverlay>
    </div>
  );
}
