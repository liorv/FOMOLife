
// comprehensive API tests for the projects endpoints.  The store and auth
// helpers are mocked so we can exercise each handler's validation and
// response logic without touching external systems.

jest.mock('@/lib/server/projectsAuth', () => ({
  getProjectsSession: jest.fn(),
}));

jest.mock('@/lib/server/projectsStore', () => ({
  listProjects: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

import type { NextResponse } from 'next/server';

function makeRequest(method: string, body?: any) {
  const init: RequestInit = {
    method,
    headers: { 'content-type': 'application/json' },
    body: body != null ? JSON.stringify(body) : null,
  } as RequestInit;
  return new Request('http://localhost/api/projects', init);
}

describe('projects API route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('GET returns 401 when unauthenticated', async () => {
    (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
    const { GET } = require('@/app/api/projects/route');
    const res: NextResponse = await GET(makeRequest('GET'));
    expect(res.status).toBe(401);
  });

  it('GET returns list when authenticated', async () => {
    (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
    const store = require('@/lib/server/projectsStore');
    (store.listProjects as jest.Mock).mockResolvedValue([{ id: 'p1', text: 'X', color: '#fff', subprojects: [] }]);
    const { GET } = require('@/app/api/projects/route');
    const res: NextResponse = await GET(makeRequest('GET'));
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.projects).toHaveLength(1);
  });

  describe('POST', () => {
    it('requires auth', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
      const { POST } = require('@/app/api/projects/route');
      const res = await POST(makeRequest('POST', { text: 'foo' }));
      expect(res.status).toBe(401);
    });

    it('validates text', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const { POST } = require('@/app/api/projects/route');
      const res = await POST(makeRequest('POST', { text: '   ' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Project name is required');
    });

    it('creates project with optional fields', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('@/lib/server/projectsStore');
      (store.createProject as jest.Mock).mockResolvedValue({ id: 'new', text: 'foo', color: '#000', subprojects: [] });
      const { POST } = require('@/app/api/projects/route');
      const res = await POST(makeRequest('POST', { text: 'foo', color: '#000' }));
      expect(res.status).toBe(201);
      const created = await res.json();
      expect(created.id).toBe('new');
    });
  });

  describe('PATCH', () => {
    it('requires auth', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
      const { PATCH } = require('@/app/api/projects/route');
      const res = await PATCH(makeRequest('PATCH', { id: 'p1', patch: { text: 'Y' } }));
      expect(res.status).toBe(401);
    });

    it('validates id and patch', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const { PATCH } = require('@/app/api/projects/route');
      let res = await PATCH(makeRequest('PATCH', { patch: {} }));
      expect(res.status).toBe(400);
      res = await PATCH(makeRequest('PATCH', { id: 'p1' }));
      expect(res.status).toBe(400);
    });

    it('returns 404 when not found', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('@/lib/server/projectsStore');
      (store.updateProject as jest.Mock).mockResolvedValue(null);
      const { PATCH } = require('@/app/api/projects/route');
      const res = await PATCH(makeRequest('PATCH', { id: 'nope', patch: { text: 'Z' } }));
      expect(res.status).toBe(404);
    });

    it('updates a project', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('@/lib/server/projectsStore');
      (store.updateProject as jest.Mock).mockResolvedValue({ id: 'p1', text: 'Z', color: '#fff', subprojects: [] });
      const { PATCH } = require('@/app/api/projects/route');
      const res = await PATCH(makeRequest('PATCH', { id: 'p1', patch: { text: 'Z' } }));
      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.text).toBe('Z');
    });
  });

  describe('DELETE', () => {
    it('requires auth', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
      const { DELETE } = require('@/app/api/projects/route');
      const res = await DELETE(makeRequest('DELETE', { id: 'p1' }));
      expect(res.status).toBe(401);
    });

    it('validates id', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const { DELETE } = require('@/app/api/projects/route');
      const res = await DELETE(makeRequest('DELETE', {}));
      expect(res.status).toBe(400);
    });

    it('returns 404 when not found', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('@/lib/server/projectsStore');
      (store.deleteProject as jest.Mock).mockResolvedValue(false);
      const { DELETE } = require('@/app/api/projects/route');
      const res = await DELETE(makeRequest('DELETE', { id: 'nope' }));
      expect(res.status).toBe(404);
    });

    it('deletes project', async () => {
      (require('@/lib/server/projectsAuth').getProjectsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const store = require('@/lib/server/projectsStore');
      (store.deleteProject as jest.Mock).mockResolvedValue(true);
      const { DELETE } = require('@/app/api/projects/route');
      const res = await DELETE(makeRequest('DELETE', { id: 'p1' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });
});
