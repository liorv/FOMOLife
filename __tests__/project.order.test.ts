import type { ProjectItem } from '@myorg/types';

jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: (userId: string) => mockLoad(userId),
    save: (userId: string, data: unknown) => mockSave(userId, data),
  }),
}));

const mockLoad = jest.fn();
const mockSave = jest.fn();

function project(id: string, order?: number): ProjectItem {
  return { id, text: id, color: '#1976D2', subprojects: [], ...(order !== undefined ? { order } : {}) };
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

it('restores persisted positions after a cold load instead of using storage array order', async () => {
  let persisted = { tasks: [], people: [], projects: [project('a'), project('b'), project('c')] };
  mockLoad.mockImplementation(async () => JSON.parse(JSON.stringify(persisted)));
  mockSave.mockImplementation(async (_userId: string, data: typeof persisted) => {
    persisted = JSON.parse(JSON.stringify(data));
  });
  const store = await import('@/lib/projects/server/projectsStore');
  for (const [order, id] of ['c', 'a', 'b'].entries()) {
    await store.updateProject('owner', id, { order });
  }
  expect(persisted.projects.map(item => item.id)).toEqual(['a', 'b', 'c']);

  jest.resetModules();
  const reloaded = await import('@/lib/projects/server/projectsStore');
  expect((await reloaded.listProjects('owner')).map(item => item.id)).toEqual(['c', 'a', 'b']);
});

it('orders owned and shared projects together and preserves unordered projects at the end', async () => {
  mockLoad.mockImplementation(async (userId: string) => userId === 'owner'
    ? {
      tasks: [], people: [],
      projects: [project('legacy-a'), project('own', 2), project('legacy-b')],
      sharedProjectRefs: [{ ownerUserId: 'other', projectId: 'shared' }],
    }
    : { tasks: [], people: [], projects: [project('shared', 0)] });
  const store = await import('@/lib/projects/server/projectsStore');
  expect((await store.listProjects('owner')).map(item => item.id))
    .toEqual(['shared', 'own', 'legacy-a', 'legacy-b']);
});
