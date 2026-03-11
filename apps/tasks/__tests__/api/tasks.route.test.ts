import { jest } from '@jest/globals';
import { sampleTasks, testUserId, createdTask } from '../../test/fixtures/tasks-fixtures';

const mockGetTasksSession = jest.fn();
const mockListTasks = jest.fn();
const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();

jest.mock('@/lib/server/tasksAuth', () => ({
  getTasksSession: () => mockGetTasksSession(),
}));

jest.mock('@/lib/server/tasksStore', () => ({
  listTasks: (...args: any[]) => mockListTasks(...args),
  createTask: (...args: any[]) => mockCreateTask(...args),
  updateTask: (...args: any[]) => mockUpdateTask(...args),
  deleteTask: (...args: any[]) => mockDeleteTask(...args),
}));

const routes = require('../../app/api/tasks/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/tasks',
    headers: { get: (name: string) => (opts?.headers?.[name.toLowerCase()] ?? (body ? 'application/json' : null)) },
    async json() { return body; },
  } as unknown as Request;
}

describe('tasks API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET returns tasks when authenticated', async () => {
    mockGetTasksSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    mockListTasks.mockResolvedValue(sampleTasks);

    const res = await routes.GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tasks: sampleTasks });
  });

  it('POST creates task', async () => {
    mockGetTasksSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const created = createdTask('Do something');
    mockCreateTask.mockResolvedValue(created);

    const res = await routes.POST(makeRequest({ text: 'Do something' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it('PATCH updates task', async () => {
    mockGetTasksSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const updated = { ...sampleTasks[0], text: 'Updated' };
    mockUpdateTask.mockResolvedValue(updated);

    const res = await routes.PATCH(makeRequest({ id: 't1', patch: { text: 'Updated' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it('DELETE removes task', async () => {
    mockGetTasksSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    mockDeleteTask.mockResolvedValue(true);

    const res = await routes.DELETE(makeRequest({ id: 't1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
