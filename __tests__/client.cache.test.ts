import { createCache } from '@/lib/client/createCache';
import { createProjectsApiClient } from '@myorg/api-client';

beforeEach(() => sessionStorage.clear());

it('preserves invalidation across a page reload', () => {
  const cache = createCache<{ id: string }>('test:reload');
  cache.set([{ id: 'project' }]);
  cache.invalidate();

  const reloaded = createCache<{ id: string }>('test:reload');
  expect(reloaded.getSync()).toEqual([{ id: 'project' }]);
  expect(reloaded.isStale()).toBe(true);
});

it('bypasses the HTTP cache when reloading projects after a mutation', async () => {
  const response = Response.json({ projects: [] });
  Object.defineProperty(response, 'ok', { value: true });
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    response,
  );
  try {
    expect(await createProjectsApiClient().listProjects()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', { method: 'GET', cache: 'no-store' });
  } finally {
    fetchMock.mockRestore();
  }
});
