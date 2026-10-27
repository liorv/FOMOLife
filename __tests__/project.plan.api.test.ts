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

describe('atomic dependency additions', () => {
  const next: PlanLink = { prerequisite: { kind: 'task', id: 'b' }, dependent: { kind: 'task', id: 'c' } };

  beforeEach(() => {
    project.subprojects[0]!.tasks.push({
      id: 'c', text: 'Third', done: false, dueDate: null, favorite: false, people: [],
    });
  });

  it('saves a complete chain once, preserving existing links and skipping duplicates', async () => {
    project.planningLinks = [link];
    const response = await PATCH(request({ action: 'add-many', links: [link, next, next] }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).planningLinks).toEqual([link, next]);
    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(updateProject).toHaveBeenCalledWith('owner', 'p', { planningLinks: [link, next] });
  });

  it('rejects the entire batch when its combined links form a cycle', async () => {
    const reverse: PlanLink = { prerequisite: next.dependent, dependent: link.prerequisite };
    expect((await PATCH(request({ action: 'add-many', links: [link, next, reverse] }), context)).status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
    expect(project.planningLinks).toBeUndefined();
  });

  it('rejects cycles through existing dependencies without writing', async () => {
    project.planningLinks = [{ prerequisite: next.dependent, dependent: link.prerequisite }];
    expect((await PATCH(request({ action: 'add-many', links: [link, next] }), context)).status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it.each([null, [], [{}], [link, {}]])('rejects invalid batch %j without writing', async links => {
    expect((await PATCH(request({ action: 'add-many', links }), context)).status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it('rejects missing or recurring tasks for the entire batch', async () => {
    project.subprojects[0]!.tasks[2]!.recurrence = 'weekly';
    expect((await PATCH(request({ action: 'add-many', links: [link, next] }), context)).status).toBe(400);
    project.subprojects[0]!.tasks.pop();
    expect((await PATCH(request({ action: 'add-many', links: [link, next] }), context)).status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it('leaves the original plan unchanged on a failed write', async () => {
    project.planningLinks = [link];
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(updateProject).mockRejectedValue(new Error('Storage unavailable'));
    const response = await PATCH(request({ action: 'add-many', links: [next] }), context);
    expect(response.status).toBe(500);
    expect(project.planningLinks).toEqual([link]);
    expect(updateProject).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});

describe('creating a dependency task', () => {
  const task = { id: 'new', text: '  New prerequisite  ', done: false, dueDate: '2026-11-02', favorite: false, people: [{ name: 'Member' }], effort: 2 };
  const body = { action: 'create-task', dependentTaskId: 'b', task };
  const createdLink: PlanLink = { prerequisite: { kind: 'task', id: 'new' }, dependent: { kind: 'task', id: 'b' } };

  it('creates a prerequisite in the dependent task section and saves both changes once', async () => {
    project.planningLinks = [link];
    project.subprojects.push({ id: 'other', text: 'Other', tasks: [] });
    const response = await PATCH(request(body), context);
    expect(response.status).toBe(200);
    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(project.subprojects[0]!.tasks.at(-1)).toEqual(expect.objectContaining({
      ...task, text: 'New prerequisite', createdAt: expect.any(String),
    }));
    expect(project.subprojects[1]!.tasks).toEqual([]);
    expect(project.planningLinks).toEqual([link, createdLink]);
    expect(updateProject).toHaveBeenCalledWith('owner', 'p', {
      subprojects: project.subprojects, planningLinks: [link, createdLink],
    });
  });

  it.each([
    { ...body, task: null },
    { ...body, task: { ...task, text: '  ' } },
    { ...body, task: { ...task, id: 'a' } },
    { ...body, task: { ...task, people: [null] } },
    { ...body, task: { ...task, effort: -1 } },
    { ...body, task: { ...task, dueDate: 'invalid' } },
    { ...body, task: { ...task, recurrence: 'weekly' } },
    { ...body, dependentTaskId: 'missing' },
    { ...body, dependentTaskId: null },
  ])('rejects invalid creation without saving: %j', async invalid => {
    expect((await PATCH(request(invalid), context)).status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
    expect(project.subprojects[0]!.tasks).toHaveLength(2);
  });

  it('rejects recurring dependents and invalid existing plans before creating anything', async () => {
    project.subprojects[0]!.tasks[1]!.recurrence = 'weekly';
    expect((await PATCH(request(body), context)).status).toBe(400);
    delete project.subprojects[0]!.tasks[1]!.recurrence;
    project.planningLinks = [{ ...link, prerequisite: { kind: 'task', id: 'missing' } }];
    expect((await PATCH(request(body), context)).status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it('leaves both the task list and links unchanged on persistence failure', async () => {
    const before = JSON.stringify(project);
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(updateProject).mockRejectedValue(new Error('Offline'));
    expect((await PATCH(request(body), context)).status).toBe(500);
    expect(JSON.stringify(project)).toBe(before);
    log.mockRestore();
  });
});
