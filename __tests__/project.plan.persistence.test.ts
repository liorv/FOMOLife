import type { ProjectItem } from '@myorg/types';
import type { PersistedUserData } from '@myorg/storage';
import type { PlanLink } from '@/lib/projects/planning';

jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: () => mockLoad(),
    save: (_userId: string, data: PersistedUserData) => mockSave(data),
  }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getFrameworkSession: jest.fn().mockResolvedValue({ isAuthenticated: true, userId: 'plan-owner', authMode: 'none' }),
}));
jest.mock('@/lib/projects/server/projectCommentsStore', () => ({
  notifyTaskCompleted: jest.fn(), notifyTaskAssigned: jest.fn(),
}));

const mockLoad = jest.fn();
const mockSave = jest.fn();
const link: PlanLink = { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'task', id: 'b' } };

it('persists plans across cold loads and ignores stale plan fields in legacy editor snapshots', async () => {
  jest.resetModules();
  const project: ProjectItem = {
    id: 'p', text: 'Release', color: '#123',
    subprojects: [{ id: 's', text: 'Release Tasks', isProjectLevel: true, tasks: ['a', 'b'].map(id => ({
      id, text: id, done: false, dueDate: '2026-11-01', favorite: false, people: [],
    })) }],
  };
  let persisted: PersistedUserData = { tasks: [], people: [], projects: [project] };
  mockLoad.mockImplementation(async () => JSON.parse(JSON.stringify(persisted)));
  mockSave.mockImplementation(async (data: PersistedUserData) => { persisted = JSON.parse(JSON.stringify(data)); });
  const store = await import('@/lib/projects/server/projectsStore');
  await store.updateProject('plan-owner', 'p', { planningLinks: [link] });
  jest.resetModules();
  const reloaded = await import('@/lib/projects/server/projectsStore');
  expect((await reloaded.listProjects('plan-owner'))[0]?.planningLinks).toEqual([link]);
  const { PATCH } = await import('@/app/api/projects/route');
  const response = await PATCH(new Request('http://localhost/api/projects', {
    method: 'PATCH', body: JSON.stringify({ id: 'p', patch: { text: 'Renamed', planningLinks: [] } }),
  }));
  expect(response.status).toBe(200);
  const saved = await response.json();
  expect(saved.planningLinks).toEqual([link]);
  expect(saved.text).toBe('Renamed');
  expect(saved.subprojects[0].tasks).toEqual(project.subprojects[0]!.tasks);
});
