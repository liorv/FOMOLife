import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';
import type { PendingRequestsResponse } from '@myorg/types';

const mockPush = jest.fn();
const mockGetPendingRequests = jest.fn(async (): Promise<PendingRequestsResponse> => ({ requests: [] }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@myorg/api-client', () => ({
  createContactsApiClient: () => ({
    getPendingRequests: () => mockGetPendingRequests(),
  }),
}));
jest.mock('@/lib/client/pushNotifications', () => ({
  ensurePushSubscription: async () => undefined,
}));
jest.mock('@/lib/client/contactsCache', () => ({
  invalidateContactsCache: jest.fn(),
}));
jest.mock('@/lib/client/supabaseBrowser', () => ({
  getSupabaseBrowserClient: () => {
    const channel = {
      on: () => channel,
      subscribe: () => channel,
    };
    return { channel: () => channel, removeChannel: jest.fn() };
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

function response(unreadCount: number, ok = true): Response {
  const notifications = unreadCount ? [{
    id: 'notification',
    type: 'project_comment',
    projectId: 'project',
    threadId: 'thread',
    threadTitle: 'Project conversation',
    commentAuthorName: 'Person',
    commentText: 'Message',
    createdAt: new Date().toISOString(),
    read: false,
  }] : [];
  return { ok, status: ok ? 200 : 500, json: async () => ({ notifications, unreadCount }) } as Response;
}

describe('notification badge synchronization', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    mockPush.mockClear();
    mockGetPendingRequests.mockReset().mockResolvedValue({ requests: [] });
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it.each(['feedback', 'projects', 'tasks'])(
    'does not show caught up while the %s source is still loading',
    async (source) => {
      const slow = deferred<Response>();
      global.fetch = jest.fn((input: RequestInfo | URL) =>
        String(input).includes(`/${source}/`) ? slow.promise : Promise.resolve(response(0)));
      render(<NotificationBell userId="user" />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

      await waitFor(() => expect(mockGetPendingRequests).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('status')).toHaveTextContent('Loading...');
      expect(screen.queryByText(/all caught up/)).not.toBeInTheDocument();

      await act(async () => { slow.resolve(response(0)); });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText(/all caught up/)).toBeInTheDocument();
    },
  );

  it('waits for contact requests before showing the empty state', async () => {
    const contacts = deferred<PendingRequestsResponse>();
    mockGetPendingRequests.mockReturnValue(contacts.promise);
    global.fetch = jest.fn(async () => response(0));
    render(<NotificationBell userId="user" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await act(async () => {});
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryByText(/all caught up/)).not.toBeInTheDocument();
    await act(async () => { contacts.resolve({ requests: [] }); });
    expect(screen.getByText(/all caught up/)).toBeInTheDocument();
  });

  it('does not apply the previous user notification response after the user changes', async () => {
    const previousUser = deferred<Response>();
    let projectGets = 0;
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      if (String(input).includes('/projects/') && ++projectGets === 1) return previousUser.promise;
      return Promise.resolve(response(0));
    });
    const { container, rerender } = render(<NotificationBell userId="first" />);
    rerender(<NotificationBell userId="second" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findByText(/all caught up/);
    await act(async () => { previousUser.resolve(response(1)); });
    expect(container.querySelector('.framework-bell-badge')).toBeNull();
    expect(screen.queryByText('Message')).not.toBeInTheDocument();
  });

  it('shows prefetched items immediately and keeps them visible while reopening refreshes', async () => {
    const refresh = deferred<Response>();
    let projectGets = 0;
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      if (!String(input).includes('/projects/')) return Promise.resolve(response(0));
      projectGets += 1;
      return projectGets === 1 ? Promise.resolve(response(1)) : refresh.promise;
    });
    const { container } = render(<NotificationBell userId="user" />);
    await waitFor(() => expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Message')).toBeVisible();
    expect(screen.queryByText(/all caught up/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close notifications' }));
    expect(screen.getByText('Message')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Message')).toBeVisible();
    await act(async () => { refresh.resolve(response(0)); });
    expect(container.querySelector('.framework-bell-badge')).toBeNull();
    expect(screen.getByText(/all caught up/)).toBeInTheDocument();
  });

  it('refreshes the shared list and badge on events and when returning to the browser tab', async () => {
    let count = 0;
    global.fetch = jest.fn((input: RequestInfo | URL) =>
      Promise.resolve(response(String(input).includes('/projects/') ? count : 0)));
    const { container } = render(<NotificationBell userId="user" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findByText(/all caught up/);
    count = 1;
    await act(async () => { window.dispatchEvent(new Event('project-notifs-updated')); });
    expect(screen.getByText('Message')).toBeVisible();
    expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1');
    count = 0;
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(screen.queryByText('Message')).not.toBeInTheDocument();
    expect(container.querySelector('.framework-bell-badge')).toBeNull();
    count = 1;
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByText('Message')).toBeVisible();
    expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1');
  });

  it('reports failed loads instead of claiming the user is caught up and retries on reopening', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    let failed = true;
    global.fetch = jest.fn((input: RequestInfo | URL) =>
      Promise.resolve(response(0, !failed || !String(input).includes('/projects/'))));
    render(<NotificationBell userId="user" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load all notifications');
    expect(screen.queryByText(/all caught up/)).not.toBeInTheDocument();
    expect(errorLog).toHaveBeenCalled();
    failed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Close notifications' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findByText(/all caught up/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['project_comment', 'projects', '/?tab=projects&projectId=project&threadId=task%3Aproject%3Atask'],
    ['task_completed', 'projects', '/?tab=projects&projectId=project&taskId=task'],
    ['task_assigned', 'projects', '/?tab=projects&projectId=project&taskId=task'],
    ['feedback_comment', 'feedback', '/?tab=feedback&feedbackId=feedback'],
    ['task_due', 'tasks', '/?tab=projects&projectId=project&taskId=task'],
  ])('opens the specific context for a %s notification', async (type, source, url) => {
    const notification = {
      id: 'notification', type, projectId: 'project', taskId: 'task', feedbackId: 'feedback',
      threadId: 'task:project:task', threadTitle: 'Notification context',
      feedbackTitle: 'Notification context', taskTitle: 'Notification context',
      commentAuthorName: 'Person', commentText: 'Notification message',
      createdAt: new Date().toISOString(), dueDate: '2026-10-08', stage: 'day', read: false,
    };
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (init?.method === 'PATCH' || !String(input).includes(`/${source}/`)) return response(0);
      return { ok: true, json: async () => ({ notifications: [notification], unreadCount: 1 }) } as Response;
    });
    render(<NotificationBell userId="user" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(await screen.findByText(type === 'task_assigned' ? 'Notification message' : /Notification context/));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(url));
    expect(screen.queryByRole('button', { name: 'Close notifications' })).not.toBeInTheDocument();
  });

  it('clears the badge immediately and refreshes only after all dismiss requests finish', async () => {
    const patches = ['feedback', 'projects', 'tasks'].map(() => deferred<Response>());
    let cleared = false;
    const mockFetch = jest.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        const index = ['feedback', 'projects', 'tasks'].findIndex(source => url.includes(`/${source}/`));
        return patches[index]!.promise;
      }
      return Promise.resolve(response(url.includes('/projects/') && !cleared ? 1 : 0));
    });
    global.fetch = mockFetch;
    const { container } = render(<NotificationBell userId="user" />);
    await waitFor(() => expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all' }));

    const getsBeforeSave = mockFetch.mock.calls.filter(([, init]) => !init).length;
    expect(container.querySelector('.framework-bell-badge')).toBeNull();
    await act(async () => {
      window.dispatchEvent(new Event('feedback-notifs-updated'));
      window.dispatchEvent(new Event('project-notifs-updated'));
      window.dispatchEvent(new Event('task-notifs-updated'));
    });
    expect(container.querySelector('.framework-bell-badge')).toBeNull();
    expect(mockFetch.mock.calls.filter(([, init]) => !init)).toHaveLength(getsBeforeSave);
    await act(async () => {
      patches[0]!.resolve(response(0));
      patches[1]!.resolve(response(0));
    });
    expect(mockFetch.mock.calls.filter(([, init]) => !init)).toHaveLength(getsBeforeSave);
    expect(container.querySelector('.framework-bell-badge')).toBeNull();

    await act(async () => {
      cleared = true;
      patches[2]!.resolve(response(0));
    });
    expect(mockFetch.mock.calls.filter(([, init]) => !init)).toHaveLength(getsBeforeSave + 3);
    expect(container.querySelector('.framework-bell-badge')).toBeNull();
    expect(screen.getByText(/all caught up/)).toBeInTheDocument();
  });

  it('ignores a stale count response already in flight when clear all is clicked', async () => {
    const stale = deferred<Response>();
    let projectGets = 0;
    let cleared = false;
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        cleared = true;
        return Promise.resolve(response(0));
      }
      if (url.includes('/projects/')) {
        projectGets += 1;
        if (projectGets === 3) return stale.promise;
        return Promise.resolve(response(cleared ? 0 : 1));
      }
      return Promise.resolve(response(0));
    });
    const { container } = render(<NotificationBell userId="user" />);
    await waitFor(() => expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findByRole('button', { name: 'Clear all' });
    act(() => { window.dispatchEvent(new Event('project-notifs-updated')); });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(projectGets).toBe(4));
    await act(async () => { stale.resolve(response(1)); });
    expect(container.querySelector('.framework-bell-badge')).toBeNull();
  });

  it.each(['feedback', 'projects', 'tasks'])(
    'ignores a stale %s dropdown response after clear all without reopening the bell',
    async (source) => {
      const stale = deferred<Response>();
      const availableSource = source === 'projects' ? 'feedback' : 'projects';
      let sourceGets = 0;
      let cleared = false;
      global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = String(input);
        if (init?.method === 'PATCH') {
          cleared = true;
          return Promise.resolve(response(0));
        }
        if (url.includes(`/${source}/`)) {
          sourceGets += 1;
          if (sourceGets === 2) return stale.promise;
        }
        return Promise.resolve(response(url.includes(`/${availableSource}/`) && !cleared ? 1 : 0));
      });
      const { container } = render(<NotificationBell userId="user" />);
      await waitFor(() => expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1'));
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Clear all' }));
      await waitFor(() => expect(sourceGets).toBe(3));
      expect(container.querySelector('.framework-bell-badge')).toBeNull();

      await act(async () => { stale.resolve(response(1)); });

      expect(container.querySelector('.framework-bell-badge')).toBeNull();
      expect(screen.getByText(/all caught up/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
    },
  );

  it('restores the list and badge when a dismiss request returns an HTTP error', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (init?.method === 'PATCH') return Promise.resolve(response(0, !url.includes('/projects/')));
      return Promise.resolve(response(url.includes('/projects/') ? 1 : 0));
    });
    const { container } = render(<NotificationBell userId="user" />);
    await waitFor(() => expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(errorLog).toHaveBeenCalledWith('Failed to clear notifications:', expect.any(Error)));
    await waitFor(() => expect(container.querySelector('.framework-bell-badge')).toHaveTextContent('1'));
    expect(screen.getByText('Message')).toBeInTheDocument();
  });
});
