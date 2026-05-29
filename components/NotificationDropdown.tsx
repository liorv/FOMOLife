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
  type: 'project_comment';
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

type TabType = 'contacts' | 'feedback' | 'projects';

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
  const [activeTab, setActiveTab] = useState<TabType>('feedback');
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

  const loadFeedbackNotifs = async () => {
    try {
      const res = await fetch('/api/feedback/notifications');
      if (res.ok) {
        const d = await res.json();
        setFeedbackNotifs(d.notifications ?? []);
        onFeedbackNotifsUpdate?.(d.unreadCount ?? 0);
      }
    } catch { /* silent */ } finally {
      setFeedbackLoading(false);
    }
  };

  const loadProjectNotifs = async () => {
    try {
      const res = await fetch('/api/projects/notifications');
      if (res.ok) {
        const d = await res.json();
        setProjectNotifs(d.notifications ?? []);
        onProjectNotifsUpdate?.(d.unreadCount ?? 0);
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

  const handleJumpToThread = async (notif: FeedbackNotification) => {
    // Mark this notification as read
    try {
      await fetch('/api/feedback/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id] }),
      });
      setFeedbackNotifs((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
      const unread = feedbackNotifs.filter((n) => !n.read && n.id !== notif.id).length;
      onFeedbackNotifsUpdate?.(unread);
      window.dispatchEvent(new Event('feedback-notifs-updated'));
    } catch { /* silent */ }

    // Navigate to Feedback tab and open the thread
    window.dispatchEvent(new CustomEvent('framework-navigate-tab', { detail: { tab: 'feedback' } }));
    // Small delay to let the tab switch happen before opening the thread
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('framework-open-feedback-thread', {
          detail: { feedbackId: notif.feedbackId },
        }),
      );
    }, 120);

    onClose();
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/feedback/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
      });
      setFeedbackNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      onFeedbackNotifsUpdate?.(0);
      window.dispatchEvent(new Event('feedback-notifs-updated'));
    } catch { /* silent */ }
  };

  const handleJumpToProjectThread = async (notif: ProjectNotification) => {
    // Mark as read
    try {
      await fetch('/api/projects/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id] }),
      });
      setProjectNotifs((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
      const unread = projectNotifs.filter((n) => !n.read && n.id !== notif.id).length;
      onProjectNotifsUpdate?.(unread);
      window.dispatchEvent(new Event('project-notifs-updated'));
    } catch { /* silent */ }

    // Navigate to Projects tab and open the thread
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

  const handleMarkAllProjectRead = async () => {
    try {
      await fetch('/api/projects/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
      });
      setProjectNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      onProjectNotifsUpdate?.(0);
      window.dispatchEvent(new Event('project-notifs-updated'));
    } catch { /* silent */ }
  };

  const unreadFeedback = feedbackNotifs.filter((n) => !n.read).length;
  const unreadProjects = projectNotifs.filter((n) => !n.read).length;
  const contactsTabLabel = `Contacts${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`;
  const feedbackTabLabel = `Feedback${unreadFeedback > 0 ? ` (${unreadFeedback})` : ''}`;
  const projectsTabLabel = `Projects${unreadProjects > 0 ? ` (${unreadProjects})` : ''}`;

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <button onClick={onClose} className="notification-close">&times;</button>
      </div>

      {/* Tabs */}
      <div className="notif-tabs">
        <button
          className={`notif-tab ${activeTab === 'feedback' ? 'notif-tab-active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          {feedbackTabLabel}
        </button>
        <button
          className={`notif-tab ${activeTab === 'projects' ? 'notif-tab-active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          {projectsTabLabel}
        </button>
        <button
          className={`notif-tab ${activeTab === 'contacts' ? 'notif-tab-active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          {contactsTabLabel}
        </button>
      </div>

      <div className="notification-content">
        {activeTab === 'contacts' ? (
          loading ? (
            <div className="notification-loading">Loading...</div>
          ) : pendingRequests.length === 0 ? (
            <p className="notification-empty">No pending requests</p>
          ) : (
            pendingRequests.map((request) => (
              <div key={request.id} className="notification-item">
                <div className="requester-info">
                  <img
                    src={request.requesterProfile.avatarUrl}
                    alt={request.requesterProfile.fullName}
                    className="requester-avatar"
                  />
                  <div className="requester-details">
                    <div className="requester-name">{request.requesterProfile.fullName}</div>
                    <div className="requester-email">{request.requesterProfile.email}</div>
                    <div className="requester-provider">
                      Connected via {request.requesterProfile.oauthProvider}
                    </div>
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
            ))
          )
        ) : activeTab === 'projects' ? (
          projectsLoading ? (
            <div className="notification-loading">Loading...</div>
          ) : projectNotifs.length === 0 ? (
            <p className="notification-empty">No project notifications</p>
          ) : (
            <>
              {unreadProjects > 0 && (
                <div className="notif-mark-all-row">
                  <button className="notif-mark-all-btn" onClick={handleMarkAllProjectRead}>
                    Mark all as read
                  </button>
                </div>
              )}
              {projectNotifs.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item feedback-notif-item ${!notif.read ? 'feedback-notif-unread' : ''}`}
                >
                  <div className="feedback-notif-body">
                    <span className="feedback-notif-icon material-icons">chat_bubble_outline</span>
                    <div className="feedback-notif-text">
                      <span className="feedback-notif-author">{notif.commentAuthorName}</span>
                      {' commented on '}
                      <span className="feedback-notif-title">&ldquo;{notif.threadTitle}&rdquo;</span>
                      <p className="feedback-notif-preview">{notif.commentText}</p>
                      <span className="feedback-notif-time">{timeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    className="btn-jump-thread"
                    onClick={() => handleJumpToProjectThread(notif)}
                    title="Go to thread"
                  >
                    <span className="material-icons" style={{ fontSize: 16 }}>open_in_new</span>
                    View
                  </button>
                </div>
              ))}
            </>
          )
        ) : feedbackLoading ? (
          <div className="notification-loading">Loading...</div>
        ) : feedbackNotifs.length === 0 ? (
          <p className="notification-empty">No feedback notifications</p>
        ) : (
          <>
            {unreadFeedback > 0 && (
              <div className="notif-mark-all-row">
                <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                  Mark all as read
                </button>
              </div>
            )}
            {feedbackNotifs.map((notif) => (
              <div
                key={notif.id}
                className={`notification-item feedback-notif-item ${!notif.read ? 'feedback-notif-unread' : ''}`}
              >
                <div className="feedback-notif-body">
                  <span className="feedback-notif-icon material-icons">
                    {notif.type === 'feedback_status' ? 'check_circle' : 'forum'}
                  </span>
                  <div className="feedback-notif-text">
                    <span className="feedback-notif-author">{notif.commentAuthorName}</span>
                    {notif.type === 'feedback_status'
                      ? <>{' completed '}<span className="feedback-notif-title">&ldquo;{notif.feedbackTitle}&rdquo;</span></>
                      : <>{' commented on '}<span className="feedback-notif-title">&ldquo;{notif.feedbackTitle}&rdquo;</span><p className="feedback-notif-preview">{notif.commentText}</p></>}
                    <span className="feedback-notif-time">{timeAgo(notif.createdAt)}</span>
                  </div>
                </div>
                <button
                  className="btn-jump-thread"
                  onClick={() => handleJumpToThread(notif)}
                  title="Go to thread"
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>open_in_new</span>
                  View
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}