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

  it('lists, updates, and deletes a project', async () => {
    mockGetProjectsSession.mockResolvedValue({ isAuthenticated: true, userId: 'test-user' });

    const createRes = await routes.POST(makeRequest({ text: 'PJ1' }));
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const id = created.id;

    const listRes = await routes.GET(makeRequest());
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.projects)).toBe(true);
    expect(listBody.projects.find((p: any) => p.id === id)).toBeTruthy();

    const patchRes = await routes.PATCH(makeRequest({ id, patch: { text: 'PJ1 Updated' } }));
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.text).toBe('PJ1 Updated');

    const delRes = await routes.DELETE(makeRequest({ id }));
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.ok).toBe(true);
  });

  it('updates project color end-to-end', async () => {
    mockGetProjectsSession.mockResolvedValue({ isAuthenticated: true, userId: 'test-user' });

    // create project without color
    const createRes = await routes.POST(makeRequest({ text: 'ColorTest' }));
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const id = created.id;

    // update color
    const color = '#123456';
    const patchRes = await routes.PATCH(makeRequest({ id, patch: { color } }));
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.color).toBe(color);

    // verify via list
    const listRes = await routes.GET(makeRequest());
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    const found = listBody.projects.find((p: any) => p.id === id);
    expect(found).toBeTruthy();
    expect(found.color).toBe(color);
  });
});
