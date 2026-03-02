import { POST } from '../app/api/tasks/route';

// mocks for server dependencies
jest.mock('../lib/server/tasksAuth', () => ({
  getTasksSession: jest.fn().mockResolvedValue({ userId: 'u1', isAuthenticated: true }),
}));

jest.mock('../lib/server/tasksStore', () => ({
  createTask: jest.fn(async (userId: string, input: any) => ({
    id: 'generated-id',
    text: input.text,
    done: false,
    dueDate: input.dueDate ?? null,
    favorite: Boolean(input.favorite),
    description: input.description ?? '',
  })),
}));

describe('tasks API route', () => {
  it('allows creating a task with empty text', async () => {
    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ text: '' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      id: 'generated-id',
      text: '',
      done: false,
      dueDate: null,
      favorite: false,
      description: '',
    });
  });
});
