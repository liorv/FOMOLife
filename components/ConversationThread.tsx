'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './ConversationThread.module.css';

interface ThreadComment {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
}

export interface ConversationThreadProps {
  threadId: string;
  threadTitle: string;
  projectId: string;
  taskId?: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
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

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length < 2) return first;
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase() ?? '';
  return lastInitial ? `${first} ${lastInitial}` : first;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) return first[0]?.toUpperCase() ?? '?';
  return ((first[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() || '?';
}

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? '#6366f1';
}

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={shortName(name)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.37}px`,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '0.02em',
        background: avatarColor(name),
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

export default function ConversationThread({
  threadId,
  threadTitle,
  projectId,
  taskId,
  userId,
  userName,
  userAvatarUrl,
  onClose,
}: ConversationThreadProps) {
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/projects/comments?threadId=${encodeURIComponent(threadId)}`)
      .then((r) => r.json())
      .then((d) => { if (mounted) { setComments(d.comments ?? []); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

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
      const body: Record<string, string> = {
        threadId,
        threadTitle,
        projectId,
        text: trimmed,
      };
      if (taskId) body.taskId = taskId;
      if (userAvatarUrl) body.avatarUrl = userAvatarUrl;

      const res = await fetch('/api/projects/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setSendError(d.error ?? 'Failed to send');
        return;
      }
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setText('');
      // Signal notification bell to refresh its count
      window.dispatchEvent(new CustomEvent('project-notifs-updated'));
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

  const isTaskThread = Boolean(taskId);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerMeta}>
            <span className={`${styles.typePill} ${isTaskThread ? styles.pillTask : styles.pillProject}`}>
              <span className="material-icons" style={{ fontSize: 13 }}>
                {isTaskThread ? 'task_alt' : 'folder'}
              </span>
              {isTaskThread ? 'Task' : 'Project'}
            </span>
          </div>
          <h3 className={styles.title}>{threadTitle}</h3>
          <p className={styles.metaLine}>
            {isTaskThread ? 'Task conversation' : 'Project conversation'}
          </p>
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
              <span className="material-icons" style={{ animation: 'ct-spin 1s linear infinite', fontSize: 22, color: '#6366f1' }}>autorenew</span>
            </div>
          ) : comments.length === 0 ? (
            <div className={styles.emptyComments}>
              <span className="material-icons">chat_bubble_outline</span>
              <p>No messages yet — start the conversation!</p>
            </div>
          ) : (
            comments.map((c) => {
              const isMe = c.authorId === userId;
              return (
                <div key={c.id} className={`${styles.commentRow} ${isMe ? styles.commentRowMe : ''}`}>
                  {!isMe && (
                    <Avatar name={c.authorName} {...(c.authorAvatarUrl ? { avatarUrl: c.authorAvatarUrl } : {})} />
                  )}
                  <div className={styles.bubble}>
                    <p className={styles.commentText}>{c.text}</p>
                    <div className={styles.bubbleFooter}>
                      <span className={styles.commentAuthor}>{isMe ? shortName(userName) : shortName(c.authorName)}</span>
                      <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                  {isMe && (
                    <Avatar name={userName} {...(userAvatarUrl ? { avatarUrl: userAvatarUrl } : {})} />
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
          <Avatar name={userName} {...(userAvatarUrl ? { avatarUrl: userAvatarUrl } : {})} size={28} />
          <div className={styles.composeBox}>
            <textarea
              ref={textareaRef}
              className={styles.composeInput}
              placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
              value={text}
              onChange={(e) => { setText(e.target.value); if (sendError) setSendError(null); }}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={2000}
              aria-label="Write a message"
            />
            {sendError && <p className={styles.sendError}>{sendError}</p>}
            <div className={styles.composeActions}>
              <span className={styles.charCount}>{text.length}/2000</span>
              <button
                type="button"
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={sending || !text.trim()}
                aria-label="Send message"
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
