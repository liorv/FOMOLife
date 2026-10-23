jest.mock('server-only', () => ({}));
jest.mock('@/lib/server/frameworkAuth', () => ({ getFrameworkSession: jest.fn() }));
jest.mock('@/lib/projects/server/projectsStore', () => ({
  listProjects: jest.fn(), resolveProjectOwner: jest.fn(), updateProject: jest.fn(),
}));

import { PATCH } from '@/app/api/projects/[id]/plan/route';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { listProjects, updateProject, resolveProjectOwner } from '@/lib/projects/server/projectsStore';
import type { ProjectItem } from '@myorg/types';
import type { PlanLink } from '@/lib/projects/planning';

const link: PlanLink = { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'task', id: 'b' } };
const context = { params: Promise.resolve({ id: 'p' }) };
const request = (body: unknown) => new Request('http://localhost/api/projects/p/plan', { method: 'PATCH', body: JSON.stringify(body) });
let project: ProjectItem;

beforeEach(() => {
  jest.resetAllMocks();
  project = {
    id: 'p', text: 'Shared plan', color: '#123', members: [{ userId: 'member', name: 'Member' }],
    subprojects: [{ id: 's', text: 'Section', tasks: ['a', 'b'].map(id => ({
      id, text: id, done: false, dueDate: null, favorite: false, people: [],
    })) }],
  };
  jest.mocked(getFrameworkSession).mockResolvedValue({ isAuthenticated: true, userId: 'member', authMode: 'none' });
  jest.mocked(listProjects).mockImplementation(async () => [project]);
  jest.mocked(resolveProjectOwner).mockResolvedValue('owner');
  jest.mocked(updateProject).mockImplementation(async (_owner, _id, patch) => {
    project = { ...project, ...patch };
    return project;
  });
});

it('persists only links under the owner and preserves tasks, then removes the link', async () => {
  const tasks = JSON.stringify(project.subprojects);
  const response = await PATCH(request({ action: 'add', link }), context);
  expect(response.status).toBe(200);
  expect((await response.json()).planningLinks).toEqual([link]);
  expect(updateProject).toHaveBeenCalledWith('owner', 'p', { planningLinks: [link] });
  expect(JSON.stringify(project.subprojects)).toBe(tasks);
  await PATCH(request({ action: 'remove', link }), context);
  expect(project.planningLinks).toEqual([]);
});

it('allows removing stale links after deletion without changing the remaining project', async () => {
  project.planningLinks = [link];
  project.subprojects[0]!.tasks = [];
  const response = await PATCH(request({ action: 'remove', link }), context);
  expect(response.status).toBe(200);
  expect(project.planningLinks).toEqual([]);
});

it('rejects malformed input and cycles without writing', async () => {
  expect((await PATCH(request({ action: 'add', link: {} }), context)).status).toBe(400);
  project.planningLinks = [link];
  expect((await PATCH(request({ action: 'add', link: { prerequisite: link.dependent, dependent: link.prerequisite } }), context)).status).toBe(400);
  expect(updateProject).not.toHaveBeenCalled();
});

it('rejects inaccessible and revoked memberships', async () => {
  project.members = [{ userId: 'someone-else', name: 'Other' }];
  expect((await PATCH(request({ action: 'add', link }), context)).status).toBe(404);
  jest.mocked(listProjects).mockResolvedValue([]);
  expect((await PATCH(request({ action: 'add', link }), context)).status).toBe(404);
  expect(updateProject).not.toHaveBeenCalled();
});

it('requires authentication', async () => {
  jest.mocked(getFrameworkSession).mockResolvedValue({ isAuthenticated: false, userId: '', authMode: 'none' });
  expect((await PATCH(request({ action: 'add', link }), context)).status).toBe(401);
  expect(updateProject).not.toHaveBeenCalled();
});

it('surfaces persistence failures rather than returning success', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.mocked(updateProject).mockRejectedValue(new Error('Storage unavailable'));
  const response = await PATCH(request({ action: 'add', link }), context);
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: 'Unable to save the project plan. Please retry.' });
  log.mockRestore();
});
