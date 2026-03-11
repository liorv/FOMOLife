import { jest } from '@jest/globals';
import { sampleProjects, testUserId, createdProject } from '../../test/fixtures/projects-fixtures';

const mockGetProjectsSession = jest.fn();
const mockListProjects = jest.fn();
const mockCreateProject = jest.fn();
const mockUpdateProject = jest.fn();
const mockDeleteProject = jest.fn();

jest.mock('@/lib/server/projectsAuth', () => ({
  getProjectsSession: (req?: any) => mockGetProjectsSession(req),
}));

jest.mock('@/lib/server/projectsStore', () => ({
  listProjects: (...args: any[]) => mockListProjects(...args),
  createProject: (...args: any[]) => mockCreateProject(...args),
  updateProject: (...args: any[]) => mockUpdateProject(...args),
  deleteProject: (...args: any[]) => mockDeleteProject(...args),
}));

const routes = require('../../app/api/projects/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/projects',
    headers: { get: (name: string) => (opts?.headers?.[name.toLowerCase()] ?? (body ? 'application/json' : null)) },
    async json() { return body; },
  } as unknown as Request;
}

describe('projects API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET returns projects when authenticated', async () => {
    mockGetProjectsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    mockListProjects.mockResolvedValue(sampleProjects);

    const res = await routes.GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ projects: sampleProjects });
  });

  it('POST creates a project', async () => {
    mockGetProjectsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const created = createdProject('New');
    mockCreateProject.mockResolvedValue(created);

    const res = await routes.POST(makeRequest({ text: 'New' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it('PATCH updates a project', async () => {
    mockGetProjectsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const updated = { ...sampleProjects[0], text: 'Updated' };
    mockUpdateProject.mockResolvedValue(updated);

    const res = await routes.PATCH(makeRequest({ id: 'p1', patch: { text: 'Updated' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it('DELETE removes a project', async () => {
    mockGetProjectsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    mockDeleteProject.mockResolvedValue(true);

    const res = await routes.DELETE(makeRequest({ id: 'p1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
