'use client';

import { useEffect, useState } from 'react';
import type { ContactsApiClient } from '@myorg/api-client';
import type { PendingRequest, PendingRequestsResponse } from '@myorg/types';

interface FeedbackNotification {
  id: string;
  type: 'feedback_comment' | 'feedback_status';
  feedbackId: string;
  feedbackTitle: string;
  commentId: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentText: string;
  createdAt: string;
  read: boolean;
}

interface ProjectNotification {
  id: string;
  type: 'project_comment' | 'task_completed';
  threadId: string;
  projectId: string;
  taskId?: string;
  threadTitle: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentText: string;
  createdAt: string;
  read: boolean;
}

type NotificationDropdownProps = {
  apiClient: ContactsApiClient;
  onClose: () => void;
  onRequestsUpdate: (count: number) => void;
  onContactsUpdate: () => void;
  userId?: string | undefined;
  onFeedbackNotifsUpdate?: (count: number) => void;
  onProjectNotifsUpdate?: (count: number) => void;
};

type AnyItem =
  | { kind: 'contact'; date: string; data: PendingRequest }
  | { kind: 'feedback'; date: string; data: FeedbackNotification }
  | { kind: 'project'; date: string; data: ProjectNotification };

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

export function NotificationDropdown({
  apiClient,
  onClose,
  onRequestsUpdate,
  onContactsUpdate,
  onFeedbackNotifsUpdate,
  onProjectNotifsUpdate,
}: NotificationDropdownProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [feedbackNotifs, setFeedbackNotifs] = useState<FeedbackNotification[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [projectNotifs, setProjectNotifs] = useState<ProjectNotification[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    loadPendingRequests();
    loadFeedbackNotifs();
    loadProjectNotifs();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'contacts-updated') {
        loadPendingRequests();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPendingRequests = async () => {
    try {
      const response: PendingRequestsResponse = await apiClient.getPendingRequests();
      setPendingRequests(response.requests);
      onRequestsUpdate(response.requests.length);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeedbackNotifs = async (showHistory = false) => {
    try {
      const url = showHistory ? '/api/feedback/notifications?dismissed=1' : '/api/feedback/notifications';
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setFeedbackNotifs(d.notifications ?? []);
        if (!showHistory) onFeedbackNotifsUpdate?.(d.unreadCount ?? 0);
      }
    } catch { /* silent */ } finally {
      setFeedbackLoading(false);
    }
  };

  const loadProjectNotifs = async (showHistory = false) => {
    try {
      const url = showHistory ? '/api/projects/notifications?dismissed=1' : '/api/projects/notifications';
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setProjectNotifs(d.notifications ?? []);
        if (!showHistory) onProjectNotifsUpdate?.(d.unreadCount ?? 0);
      }
    } catch { /* silent */ } finally {
      setProjectsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await apiClient.approveRequest(requestId);
      await loadPendingRequests();
      onContactsUpdate();
    } catch (error) {
      console.error('Failed to approve request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await apiClient.rejectRequest(requestId);
      await loadPendingRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setProcessing(null);
    }
  };

  // Navigate to feedback thread and auto-dismiss
  const handleClickFeedback = async (notif: FeedbackNotification) => {
    // Optimistically remove from list
    setFeedbackNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    const remaining = feedbackNotifs.filter((n) => n.id !== notif.id);
    onFeedbackNotifsUpdate?.(remaining.filter((n) => !n.read).length);
    window.dispatchEvent(new Event('feedback-notifs-updated'));
    // Dismiss on server (fire-and-forget)
    fetch('/api/feedback/notifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: [notif.id], action: 'dismiss' }),
    }).catch(() => {});
    // Navigate
    window.dispatchEvent(new CustomEvent('framework-navigate-tab', { detail: { tab: 'feedback' } }));
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('framework-open-feedback-thread', {
          detail: { feedbackId: notif.feedbackId },
        }),
      );
    }, 120);
    onClose();
  };

  // Navigate to project/task thread and auto-dismiss
  const handleClickProject = async (notif: ProjectNotification) => {
    // Optimistically remove from list
    setProjectNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    const remaining = projectNotifs.filter((n) => n.id !== notif.id);
    onProjectNotifsUpdate?.(remaining.filter((n) => !n.read).length);
    window.dispatchEvent(new Event('project-notifs-updated'));
    // Dismiss on server (fire-and-forget)
    fetch('/api/projects/notifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: [notif.id], action: 'dismiss' }),
    }).catch(() => {});
    // Navigate
    window.dispatchEvent(new CustomEvent('framework-navigate-tab', { detail: { tab: 'projects' } }));
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('framework-open-project-thread', {
          detail: {
            threadId: notif.threadId,
            projectId: notif.projectId,
            threadTitle: notif.threadTitle,
            ...(notif.taskId ? { taskId: notif.taskId } : {}),
          },
        }),
      );
    }, 120);
    onClose();
  };

  // Build unified sorted list
  const allItems: AnyItem[] = [
    ...pendingRequests.map((r): AnyItem => ({ kind: 'contact', date: r.requestedAt, data: r })),
    ...feedbackNotifs.map((n): AnyItem => ({ kind: 'feedback', date: n.createdAt, data: n })),
    ...projectNotifs.map((n): AnyItem => ({ kind: 'project', date: n.createdAt, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = loading && feedbackLoading && projectsLoading;

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <button onClick={onClose} className="notification-close">&times;</button>
      </div>

      <div className="notification-content">
        {isLoading ? (
          <div className="notification-loading">Loading...</div>
        ) : allItems.length === 0 ? (
          <p className="notification-empty">You&rsquo;re all caught up</p>
        ) : (
          allItems.map((item) => {
            if (item.kind === 'contact') {
              const request = item.data;
              return (
                <div key={request.id} className="notification-item">
                  <div className="notif-type-row">
                    <span className="notif-type-badge notif-type-contact">Connection request</span>
                    <span className="feedback-notif-time">{timeAgo(request.requestedAt)}</span>
                  </div>
                  <div className="requester-info">
                    {request.requesterProfile.avatarUrl ? (
                      <img
                        src={request.requesterProfile.avatarUrl}
                        alt={request.requesterProfile.fullName}
                        className="requester-avatar"
                      />
                    ) : (
                      <div className="requester-avatar requester-avatar-fallback">
                        {request.requesterProfile.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="requester-details">
                      <div className="requester-name">{request.requesterProfile.fullName}</div>
                      <div className="requester-email">{request.requesterProfile.email}</div>
                    </div>
                  </div>
                  <div className="notification-actions">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="btn-approve"
                    >
                      {processing === request.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processing === request.id}
                      className="btn-reject"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            }

            if (item.kind === 'feedback') {
              const notif = item.data;
              return (
                <div
                  key={notif.id}
                  className={`notification-item notif-clickable ${!notif.read ? 'feedback-notif-unread' : ''}`}
                  onClick={() => handleClickFeedback(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleClickFeedback(notif)}
                >
                  <div className="notif-type-row">
                    <span className="notif-type-badge notif-type-feedback">
                      {notif.type === 'feedback_status' ? 'Feedback resolved' : 'Feedback'}
                    </span>
                    <span className="feedback-notif-time">{timeAgo(notif.createdAt)}</span>
                  </div>
                  <div className="feedback-notif-body">
                    <span className="feedback-notif-icon material-icons">
                      {notif.type === 'feedback_status' ? 'check_circle' : 'forum'}
                    </span>
                    <div className="feedback-notif-text">
                      <span className="feedback-notif-author">{notif.commentAuthorName}</span>
                      {notif.type === 'feedback_status'
                        ? <>{' resolved '}<span className="feedback-notif-title">&ldquo;{notif.feedbackTitle}&rdquo;</span></>
                        : <>{' commented on '}<span className="feedback-notif-title">&ldquo;{notif.feedbackTitle}&rdquo;</span><p className="feedback-notif-preview">{notif.commentText}</p></>}
                    </div>
                  </div>
                </div>
              );
            }

            // project
            const notif = item.data;
            return (
              <div
                key={notif.id}
                className={`notification-item notif-clickable ${!notif.read ? 'feedback-notif-unread' : ''}`}
                onClick={() => handleClickProject(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClickProject(notif)}
              >
                <div className="notif-type-row">
                  <span className="notif-type-badge notif-type-project">
                    {notif.type === 'task_completed' ? 'Task completed' : 'Project'}
                  </span>
                  <span className="feedback-notif-time">{timeAgo(notif.createdAt)}</span>
                </div>
                <div className="feedback-notif-body">
                  <span className="feedback-notif-icon material-icons">
                    {notif.type === 'task_completed' ? 'check_circle' : 'chat_bubble_outline'}
                  </span>
                  <div className="feedback-notif-text">
                    <span className="feedback-notif-author">{notif.commentAuthorName}</span>
                    {notif.type === 'task_completed'
                      ? <>{' completed '}<span className="feedback-notif-title">&ldquo;{notif.threadTitle}&rdquo;</span></>
                      : <>{' commented on '}<span className="feedback-notif-title">&ldquo;{notif.threadTitle}&rdquo;</span><p className="feedback-notif-preview">{notif.commentText}</p></>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}