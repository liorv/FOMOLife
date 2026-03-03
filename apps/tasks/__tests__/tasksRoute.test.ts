// comprehensive tests for the tasks API route handlers; mocks
// replace the real store so that tests remain fast and don't touch disk.

// stub session provider so each test controls authenticated state
jest.mock('../lib/server/tasksAuth', () => ({
  getTasksSession: jest.fn(),
}));

// stub store methods; individual tests will configure return values as needed
jest.mock('../lib/server/tasksStore', () => ({
  listTasks: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

import type { NextResponse } from 'next/server';

function makeRequest(method: string, body?: any) {
  const init: RequestInit = {
    method,
    headers: { 'content-type': 'application/json' },
    body: body != null ? JSON.stringify(body) : null,
  } as RequestInit;
  return new Request('http://localhost/api/tasks', init);
}

describe('tasks API route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('GET returns 401 when unauthenticated', async () => {
    (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
    const { GET } = require('../app/api/tasks/route');

    const res: NextResponse = await GET(makeRequest('GET'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('GET returns seeded tasks when authenticated', async () => {
    (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
    const store = require('../lib/server/tasksStore');
    (store.listTasks as jest.Mock).mockResolvedValue([
      { id: 't1', text: 'foo', done: false, dueDate: null, favorite: false, description: '' },
    ]);
    const { GET } = require('../app/api/tasks/route');

    const res: NextResponse = await GET(makeRequest('GET'));
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(Array.isArray(payload.tasks)).toBe(true);
    expect(payload.tasks.length).toBe(1);
  });

  describe('POST', () => {
    it('requires auth', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
      const { POST } = require('../app/api/tasks/route');
      const res = await POST(makeRequest('POST', { text: 'hi' }));
      expect(res.status).toBe(401);
    });

    it('validates text presence (not undefined)', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const { POST } = require('../app/api/tasks/route');
      const res = await POST(makeRequest('POST', {}));
      expect(res.status).toBe(400);
      const b = await res.json();
      expect(b.error).toBe('Task text is required');
    });

    it('creates a task with provided fields', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('../lib/server/tasksStore');
      (store.createTask as jest.Mock).mockResolvedValue({
        id: 'new',
        text: 'hello',
        done: false,
        dueDate: null,
        favorite: false,
        description: '',
      });
      const { POST } = require('../app/api/tasks/route');

      const res = await POST(makeRequest('POST', { text: 'hello' }));
      expect(res.status).toBe(201);
      const created = await res.json();
      expect(created.id).toBe('new');
      expect(created.text).toBe('hello');
    });
  });

  describe('PATCH', () => {
    it('requires auth', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
      const { PATCH } = require('../app/api/tasks/route');
      const res = await PATCH(makeRequest('PATCH', { id: 'x', patch: { text: 'a' } }));
      expect(res.status).toBe(401);
    });

    it('validates id and patch', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const { PATCH } = require('../app/api/tasks/route');
      let res = await PATCH(makeRequest('PATCH', { patch: {} }));
      expect(res.status).toBe(400);
      res = await PATCH(makeRequest('PATCH', { id: 'x' }));
      expect(res.status).toBe(400);
    });

    it('returns 404 if update returns null', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('../lib/server/tasksStore');
      (store.updateTask as jest.Mock).mockResolvedValue(null);
      const { PATCH } = require('../app/api/tasks/route');
      const res = await PATCH(makeRequest('PATCH', { id: 'nope', patch: { text: 'a' } }));
      expect(res.status).toBe(404);
    });

    it('updates an existing task', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('../lib/server/tasksStore');
      (store.updateTask as jest.Mock).mockResolvedValue({ id: 'x', text: 'updated' });
      const { PATCH } = require('../app/api/tasks/route');
      const res = await PATCH(makeRequest('PATCH', { id: 'x', patch: { text: 'updated' } }));
      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.text).toBe('updated');
    });
  });

  describe('DELETE', () => {
    it('requires auth', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
      const { DELETE } = require('../app/api/tasks/route');
      const res = await DELETE(makeRequest('DELETE', { id: 'x' }));
      expect(res.status).toBe(401);
    });

    it('validates id', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const { DELETE } = require('../app/api/tasks/route');
      const res = await DELETE(makeRequest('DELETE', {}));
      expect(res.status).toBe(400);
    });

    it('returns 404 when task not found', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('../lib/server/tasksStore');
      (store.deleteTask as jest.Mock).mockResolvedValue(false);
      const { DELETE } = require('../app/api/tasks/route');
      const res = await DELETE(makeRequest('DELETE', { id: 'nope' }));
      expect(res.status).toBe(404);
    });

    it('deletes existing task', async () => {
      (require('../lib/server/tasksAuth').getTasksSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('../lib/server/tasksStore');
      (store.deleteTask as jest.Mock).mockResolvedValue(true);
      const { DELETE } = require('../app/api/tasks/route');
      const res = await DELETE(makeRequest('DELETE', { id: 'x' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });
});