'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './FeedbackThread.module.css';

interface FeedbackComment {
  id: string;
  feedbackId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface FeedbackItem {
  id: string;
  type: 'feature' | 'bug';
  title: string;
  description: string;
  authorName: string;
  createdAt: string;
}

interface Props {
  item: FeedbackItem;
  userId: string;
  userName: string;
  onClose: () => void;
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function FeedbackThread({ item, userId, userName, onClose }: Props) {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/feedback/comments?feedbackId=${encodeURIComponent(item.id)}`)
      .then((r) => r.json())
      .then((d) => { if (mounted) { setComments(d.comments ?? []); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [item.id]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/feedback/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ feedbackId: item.id, text: trimmed }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSendError(d.error ?? 'Failed to send');
        return;
      }
      const comment: FeedbackComment = await res.json();
      setComments((prev) => [...prev, comment]);
      setText('');
    } catch {
      setSendError('Network error — please try again');
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerMeta}>
            <span className={`${styles.typePill} ${item.type === 'feature' ? styles.pillFeature : styles.pillBug}`}>
              <span className="material-icons" style={{ fontSize: 13 }}>
                {item.type === 'feature' ? 'auto_awesome' : 'bug_report'}
              </span>
              {item.type === 'feature' ? 'Feature' : 'Bug'}
            </span>
          </div>
          <h3 className={styles.title}>{item.title}</h3>
          {item.description ? <p className={styles.description}>{item.description}</p> : null}
          <p className={styles.metaLine}>Posted by {item.authorName} · {timeAgo(item.createdAt)}</p>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Comments */}
        <div className={styles.commentList}>
          {loading ? (
            <div className={styles.loadingRow}>
              <span className="material-icons" style={{ animation: 'fb-spin 1s linear infinite', fontSize: 22, color: '#6366f1' }}>autorenew</span>
            </div>
          ) : comments.length === 0 ? (
            <div className={styles.emptyComments}>
              <span className="material-icons">forum</span>
              <p>No comments yet — be the first!</p>
            </div>
          ) : (
            comments.map((c) => {
              const isMe = c.authorId === userId;
              return (
                <div key={c.id} className={`${styles.commentRow} ${isMe ? styles.commentRowMe : ''}`}>
                  {!isMe && (
                    <div
                      className={styles.avatar}
                      style={{ background: avatarColor(c.authorName) }}
                      aria-hidden="true"
                    >
                      {initials(c.authorName)}
                    </div>
                  )}
                  <div className={styles.bubble}>
                    {!isMe && <span className={styles.commentAuthor}>{c.authorName}</span>}
                    <p className={styles.commentText}>{c.text}</p>
                    <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                  </div>
                  {isMe && (
                    <div
                      className={styles.avatar}
                      style={{ background: avatarColor(userName) }}
                      aria-hidden="true"
                    >
                      {initials(userName)}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Compose */}
        <div className={styles.compose}>
          <div
            className={styles.composeAvatar}
            style={{ background: avatarColor(userName) }}
            aria-hidden="true"
          >
            {initials(userName)}
          </div>
          <div className={styles.composeBox}>
            <textarea
              ref={textareaRef}
              className={styles.composeInput}
              placeholder="Add a comment… (Enter to send, Shift+Enter for newline)"
              value={text}
              onChange={(e) => { setText(e.target.value); if (sendError) setSendError(null); }}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={2000}
              aria-label="Write a comment"
            />
            {sendError && <p className={styles.sendError}>{sendError}</p>}
            <div className={styles.composeActions}>
              <span className={styles.charCount}>{text.length}/2000</span>
              <button
                type="button"
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={sending || !text.trim()}
                aria-label="Send comment"
              >
                <span className="material-icons">{sending ? 'hourglass_top' : 'send'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
