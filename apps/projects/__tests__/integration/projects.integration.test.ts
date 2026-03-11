import { jest } from '@jest/globals';

// Mock server-only (Next runtime helper) and auth session to simulate an authenticated user; use the real store.
jest.mock('server-only', () => ({}));
const mockGetProjectsSession = jest.fn();
jest.mock('@/lib/server/projectsAuth', () => ({
  getProjectsSession: () => mockGetProjectsSession(),
}));

// Import route handlers after mocking auth
const routes = require('../../app/api/projects/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/projects',
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase();
        if (opts?.headers && opts.headers[key]) return opts.headers[key];
        if (key === 'content-type' && body) return 'application/json';
        return null;
      },
    },
    async json() {
      return body;
    },
  } as unknown as Request;
}

describe('projects integration (in-memory store)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a project end-to-end using the in-memory store', async () => {
    mockGetProjectsSession.mockResolvedValue({ isAuthenticated: true, userId: 'test-user' });

    const req = makeRequest({ text: 'New Project' });
    const res = await routes.POST(req);

    if (res.status !== 201) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Expected 201 created; got ${res.status}: ${JSON.stringify(body)}`);
    }

    const created = await res.json();
    expect(created).toHaveProperty('id');
    expect(created.text).toBe('New Project');
  });
});
