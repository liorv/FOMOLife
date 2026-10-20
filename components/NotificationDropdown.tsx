'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getNotificationUrl } from '@/lib/notificationNavigation';
import type { ContactsApiClient } from '@myorg/api-client';
import type { PendingRequest, PendingRequestsResponse, TaskDueNotification } from '@myorg/types';

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
  type: 'project_comment' | 'task_completed' | 'task_assigned';
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
  onOpenSettings?: () => void;
  onRequestsUpdate: (count: number) => void;
  onContactsUpdate: () => void;
  userId?: string | undefined;
  isOpen?: boolean;
  onFeedbackNotifsUpdate?: (count: number) => void;
  onProjectNotifsUpdate?: (count: number) => void;
  onTaskNotifsUpdate?: (count: number) => void;
  onClearAllPendingChange?: (pending: boolean) => void;
};

type AnyItem =
  | { kind: 'contact'; date: string; data: PendingRequest }
  | { kind: 'feedback'; date: string; data: FeedbackNotification }
  | { kind: 'project'; date: string; data: ProjectNotification }
  | { kind: 'task_due'; date: string; data: TaskDueNotification };

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
  onOpenSettings,
  onRequestsUpdate,
  onContactsUpdate,
  onFeedbackNotifsUpdate,
  onProjectNotifsUpdate,
  onTaskNotifsUpdate,
  onClearAllPendingChange,
  isOpen = true,
}: NotificationDropdownProps) {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [feedbackNotifs, setFeedbackNotifs] = useState<FeedbackNotification[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [projectNotifs, setProjectNotifs] = useState<ProjectNotification[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [taskNotifs, setTaskNotifs] = useState<TaskDueNotification[]>([]);
  const [taskNotifsLoading, setTaskNotifsLoading] = useState(true);
  const [clearingAll, setClearingAll] = useState(false);
  const loadVersions = useRef({ contacts: 0, feedback: 0, project: 0, task: 0 });
  const clearAllPending = useRef(false);
  const mounted = useRef(false);
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});

  const setLoadError = (source: string, failed: boolean) => {
    setLoadErrors(previous => ({ ...previous, [source]: failed }));
  };

  useEffect(() => {
    mounted.current = true;
    loadPendingRequests();
    loadFeedbackNotifs();
    loadProjectNotifs();
    loadTaskNotifs();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'contacts-updated') {
        loadPendingRequests();
      }
    };
    const refreshFeedback = () => { if (!clearAllPending.current) void loadFeedbackNotifs(); };
    const refreshProjects = () => { if (!clearAllPending.current) void loadProjectNotifs(); };
    const refreshTasks = () => { if (!clearAllPending.current) void loadTaskNotifs(); };
    const refresh = () => {
      void loadPendingRequests();
      refreshFeedback();
      refreshProjects();
      refreshTasks();
    };
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('message', handleMessage);
    window.addEventListener('feedback-notifs-updated', refreshFeedback);
    window.addEventListener('project-notifs-updated', refreshProjects);
    window.addEventListener('task-notifs-updated', refreshTasks);
    window.addEventListener('notification-settings-updated', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mounted.current = false;
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('feedback-notifs-updated', refreshFeedback);
      window.removeEventListener('project-notifs-updated', refreshProjects);
      window.removeEventListener('task-notifs-updated', refreshTasks);
      window.removeEventListener('notification-settings-updated', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      ++loadVersions.current.contacts;
      ++loadVersions.current.feedback;
      ++loadVersions.current.project;
      ++loadVersions.current.task;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen || loading || feedbackLoading || projectsLoading || taskNotifsLoading || clearAllPending.current) return;
    void loadPendingRequests();
    void loadFeedbackNotifs();
    void loadProjectNotifs();
    void loadTaskNotifs();
  // Refresh on opening, not on completion of the refresh.
  }, [isOpen]);

  const loadPendingRequests = async () => {
    if (!mounted.current) return;
    const version = ++loadVersions.current.contacts;
    setLoading(true);
    try {
      const response: PendingRequestsResponse = await apiClient.getPendingRequests();
      if (version !== loadVersions.current.contacts) return;
      setPendingRequests(response.requests);
      onRequestsUpdate(response.requests.length);
      setLoadError('contacts', false);
    } catch (error) {
      if (version !== loadVersions.current.contacts) return;
      console.error('Failed to load pending requests:', error);
      setLoadError('contacts', true);
    } finally {
      if (version === loadVersions.current.contacts) setLoading(false);
    }
  };

  const loadFeedbackNotifs = async (showHistory = false) => {
    if (!mounted.current) return;
    const version = ++loadVersions.current.feedback;
    setFeedbackLoading(true);
    try {
      const url = showHistory ? '/api/feedback/notifications?dismissed=1' : '/api/feedback/notifications';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load feedback notifications: ${res.status}`);
      if (res.ok) {
        const d = await res.json();
        if (version !== loadVersions.current.feedback) return;
        setFeedbackNotifs(d.notifications ?? []);
        setLoadError('feedback', false);
        if (!showHistory) onFeedbackNotifsUpdate?.(d.unreadCount ?? 0);
      }
    } catch (error) {
      if (version !== loadVersions.current.feedback) return;
      console.error('Failed to load feedback notifications:', error);
      setLoadError('feedback', true);
    } finally {
      if (version === loadVersions.current.feedback) setFeedbackLoading(false);
    }
  };

  const loadProjectNotifs = async (showHistory = false) => {
    if (!mounted.current) return;
    const version = ++loadVersions.current.project;
    setProjectsLoading(true);
    try {
      const url = showHistory ? '/api/projects/notifications?dismissed=1' : '/api/projects/notifications';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load project notifications: ${res.status}`);
      if (res.ok) {
        const d = await res.json();
        if (version !== loadVersions.current.project) return;
        setProjectNotifs(d.notifications ?? []);
        setLoadError('project', false);
        if (!showHistory) onProjectNotifsUpdate?.(d.unreadCount ?? 0);
      }
    } catch (error) {
      if (version !== loadVersions.current.project) return;
      console.error('Failed to load project notifications:', error);
      setLoadError('project', true);
    } finally {
      if (version === loadVersions.current.project) setProjectsLoading(false);
    }
  };

  const loadTaskNotifs = async (showHistory = false) => {
    if (!mounted.current) return;
    const version = ++loadVersions.current.task;
    setTaskNotifsLoading(true);
    try {
      const url = showHistory ? '/api/tasks/notifications?dismissed=1' : '/api/tasks/notifications';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load task notifications: ${res.status}`);
      if (res.ok) {
        const d = await res.json();
        if (version !== loadVersions.current.task) return;
        setTaskNotifs(d.notifications ?? []);
        setLoadError('task', false);
        if (!showHistory) onTaskNotifsUpdate?.(d.unreadCount ?? 0);
      }
    } catch (error) {
      if (version !== loadVersions.current.task) return;
      console.error('Failed to load task notifications:', error);
      setLoadError('task', true);
    } finally {
      if (version === loadVersions.current.task) setTaskNotifsLoading(false);
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
    // Dismiss on server; if it fails, reload so the notification isn't lost
    // client-side while still un-dismissed on the server (which would make it
    // reappear unexpectedly on the next load).
    try {
      const res = await fetch('/api/feedback/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id], action: 'dismiss' }),
      });
      if (!res.ok) throw new Error(`Dismiss failed: ${res.status}`);
    } catch (error) {
      console.error('Failed to dismiss feedback notification:', error);
      await loadFeedbackNotifs();
    } finally {
      window.dispatchEvent(new Event('feedback-notifs-updated'));
    }
    // Navigate
    router.push(getNotificationUrl(notif));
    onClose();
  };

  // Navigate to project/task thread and auto-dismiss
  const handleClickProject = async (notif: ProjectNotification) => {
    // Optimistically remove from list
    setProjectNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    const remaining = projectNotifs.filter((n) => n.id !== notif.id);
    onProjectNotifsUpdate?.(remaining.filter((n) => !n.read).length);
    // Dismiss on server; if it fails, reload so the notification isn't lost
    // client-side while still un-dismissed on the server.
    try {
      const res = await fetch('/api/projects/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id], action: 'dismiss' }),
      });
      if (!res.ok) throw new Error(`Dismiss failed: ${res.status}`);
    } catch (error) {
      console.error('Failed to dismiss project notification:', error);
      await loadProjectNotifs();
    } finally {
      window.dispatchEvent(new Event('project-notifs-updated'));
    }
    // Navigate
    router.push(getNotificationUrl(notif));
    onClose();
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    clearAllPending.current = true;
    onClearAllPendingChange?.(true);
    // Ignore loads started before clearing so they cannot restore dismissed items or badge counts.
    ++loadVersions.current.feedback;
    ++loadVersions.current.project;
    ++loadVersions.current.task;
    setFeedbackLoading(false);
    setProjectsLoading(false);
    setTaskNotifsLoading(false);
    setFeedbackNotifs([]);
    setProjectNotifs([]);
    setTaskNotifs([]);
    onFeedbackNotifsUpdate?.(0);
    onProjectNotifsUpdate?.(0);
    onTaskNotifsUpdate?.(0);
    try {
      const results = await Promise.allSettled(['feedback', 'projects', 'tasks'].map(async (source) => {
        const res = await fetch(`/api/${source}/notifications`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: [], action: 'dismiss' }),
        });
        if (!res.ok) throw new Error(`Failed to clear ${source} notifications: ${res.status}`);
      }));
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      await Promise.all([loadFeedbackNotifs(), loadProjectNotifs(), loadTaskNotifs()]);
    } finally {
      clearAllPending.current = false;
      onClearAllPendingChange?.(false);
      window.dispatchEvent(new Event('feedback-notifs-updated'));
      window.dispatchEvent(new Event('project-notifs-updated'));
      window.dispatchEvent(new Event('task-notifs-updated'));
      setClearingAll(false);
    }
  };

  // Dismiss a task due-date reminder
  const handleDismissTaskNotif = async (notif: TaskDueNotification) => {
    setTaskNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    const remaining = taskNotifs.filter((n) => n.id !== notif.id);
    onTaskNotifsUpdate?.(remaining.filter((n) => !n.read).length);
    try {
      const res = await fetch('/api/tasks/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id], action: 'dismiss' }),
      });
      if (!res.ok) throw new Error(`Dismiss failed: ${res.status}`);
    } catch (error) {
      console.error('Failed to dismiss task notification:', error);
      await loadTaskNotifs();
    } finally {
      window.dispatchEvent(new Event('task-notifs-updated'));
    }
  };

  // Reschedule a task due-date reminder to fire a week or a day before the due date
  const handleRemindTaskNotif = async (notif: TaskDueNotification, remindStage: 'week' | 'day') => {
    setTaskNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    const remaining = taskNotifs.filter((n) => n.id !== notif.id);
    onTaskNotifsUpdate?.(remaining.filter((n) => !n.read).length);
    try {
      const res = await fetch('/api/tasks/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: notif.id, action: remindStage === 'week' ? 'remind_week' : 'remind_day' }),
      });
      if (!res.ok) throw new Error(`Reschedule failed: ${res.status}`);
    } catch (error) {
      console.error('Failed to reschedule task notification:', error);
      await loadTaskNotifs();
    } finally {
      window.dispatchEvent(new Event('task-notifs-updated'));
    }
  };

  // Build unified sorted list
  const allItems: AnyItem[] = [
    ...pendingRequests.map((r): AnyItem => ({ kind: 'contact', date: r.requestedAt, data: r })),
    ...feedbackNotifs.map((n): AnyItem => ({ kind: 'feedback', date: n.createdAt, data: n })),
    ...projectNotifs.map((n): AnyItem => ({ kind: 'project', date: n.createdAt, data: n })),
    ...taskNotifs.map((n): AnyItem => ({ kind: 'task_due', date: n.createdAt, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = loading || feedbackLoading || projectsLoading || taskNotifsLoading;
  const hasLoadError = Object.values(loadErrors).some(Boolean);

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="notification-header-actions">
          {(feedbackNotifs.length > 0 || projectNotifs.length > 0 || taskNotifs.length > 0) && (
            <button
              onClick={handleClearAll}
              className="notification-clear-all"
              disabled={clearingAll}
            >
              {clearingAll ? 'Clearing...' : 'Clear all'}
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              className="notification-settings-button"
              aria-label="Notification settings"
              title="Notification settings"
              onClick={onOpenSettings}
            >
              <span className="material-icons" aria-hidden="true">settings</span>
            </button>
          )}
          <button onClick={onClose} className="notification-close" aria-label="Close notifications">&times;</button>
        </div>
      </div>

      <div className="notification-content">
        {hasLoadError && (
          <p className="notification-empty" role="alert">
            Could not load all notifications. Close and reopen to retry.
          </p>
        )}
        {isLoading && <div className="notification-loading" role="status">Loading...</div>}
        {allItems.length === 0 ? (
          !isLoading && !hasLoadError && <p className="notification-empty">You&rsquo;re all caught up</p>
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

            if (item.kind === 'project') {
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
                      {notif.type === 'task_completed' ? 'Task completed' : notif.type === 'task_assigned' ? 'Task assigned' : 'Project'}
                    </span>
                    <span className="feedback-notif-time">{timeAgo(notif.createdAt)}</span>
                  </div>
                  <div className="feedback-notif-body">
                    <span className="feedback-notif-icon material-icons">
                      {notif.type === 'task_completed' ? 'check_circle' : notif.type === 'task_assigned' ? 'person_add' : 'chat_bubble_outline'}
                    </span>
                    <div className="feedback-notif-text">
                      <span className="feedback-notif-author">{notif.commentAuthorName}</span>
                      {notif.type === 'task_completed'
                        ? <>{' completed '}<span className="feedback-notif-title">&ldquo;{notif.threadTitle}&rdquo;</span></>
                        : notif.type === 'task_assigned'
                        ? <>{' '}{notif.commentText}</>
                        : <>{' commented on '}<span className="feedback-notif-title">&ldquo;{notif.threadTitle}&rdquo;</span><p className="feedback-notif-preview">{notif.commentText}</p></>}
                    </div>
                  </div>
                </div>
              );
            }

            // task due-date reminder
            const notif = item.data;
            const stageLabel = notif.stage === 'week' ? 'in a week' : notif.stage === 'day' ? 'tomorrow' : 'today';
            return (
              <div
                key={notif.id}
                className={`notification-item ${!notif.read ? 'feedback-notif-unread' : ''}`}
              >
                <div className="notif-type-row">
                  <span className="notif-type-badge notif-type-project">Task due {stageLabel}</span>
                  <span className="feedback-notif-time">{timeAgo(notif.createdAt)}</span>
                </div>
                <div className="feedback-notif-body notif-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    void handleDismissTaskNotif(notif);
                    router.push(getNotificationUrl(notif));
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                >
                  <span className="feedback-notif-icon material-icons">event</span>
                  <div className="feedback-notif-text">
                    <span className="feedback-notif-title">&ldquo;{notif.taskTitle}&rdquo;</span>
                    {' is due '}
                    {new Date(notif.dueDate).toLocaleDateString()}
                    {notif.projectTitle ? <> {'in '}<span className="feedback-notif-author">{notif.projectTitle}</span></> : null}
                  </div>
                </div>
                <div className="task-notif-actions">
                  <button onClick={() => handleRemindTaskNotif(notif, 'day')} className="btn-remind">
                    Remind 1 day before
                  </button>
                  <button onClick={() => handleRemindTaskNotif(notif, 'week')} className="btn-remind">
                    Remind 1 week before
                  </button>
                  <button onClick={() => handleDismissTaskNotif(notif)} className="btn-dismiss-text">
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}