import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';

jest.mock('@myorg/api-client', () => ({
  createContactsApiClient: () => ({
    getPendingRequests: async () => ({ requests: [] }),
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
    global.fetch = originalFetch;
    jest.restoreAllMocks();
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
