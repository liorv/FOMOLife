jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: (...args: unknown[]) => mockLoad(...args),
    save: (...args: unknown[]) => mockSave(...args),
  }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getFrameworkSession: jest.fn().mockResolvedValue({ isAuthenticated: true, userId: 'link-owner', userName: 'Owner' }),
}));
jest.mock('@/lib/projects/server/projectCommentsStore', () => ({
  notifyTaskCompleted: jest.fn(),
  notifyTaskAssigned: jest.fn(),
}));

import { GET, POST, PATCH } from '@/app/api/projects/route';
import type { ProjectItem } from '@myorg/types';
import { isValidExternalUrl } from '@myorg/utils';

const mockLoad = jest.fn().mockResolvedValue({ tasks: [], people: [] });
const mockSave = jest.fn().mockResolvedValue(undefined);

function request(method: string, body: unknown) {
  return new Request('http://localhost/api/projects', { method, body: JSON.stringify(body) });
}

it('persists a link on creation, updates it, loads it, and allows removing it', async () => {
  const createdResponse = await POST(request('POST', { text: 'Linked project', externalUrl: '  https://example.com/project  ' }));
  expect(createdResponse.status).toBe(201);
  const created: ProjectItem = await createdResponse.json();
  expect(created.externalUrl).toBe('https://example.com/project');
  expect(mockSave).toHaveBeenLastCalledWith('link-owner', expect.objectContaining({
    projects: expect.arrayContaining([expect.objectContaining({ id: created.id, externalUrl: created.externalUrl })]),
  }));

  const updatedResponse = await PATCH(request('PATCH', { id: created.id, patch: { externalUrl: 'http://example.org/new' } }));
  expect(updatedResponse.status).toBe(200);
  const loaded = await GET(request('GET', undefined));
  expect((await loaded.json()).projects).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: created.id, externalUrl: 'http://example.org/new' }),
  ]));
  expect(mockSave).toHaveBeenLastCalledWith('link-owner', expect.objectContaining({
    projects: expect.arrayContaining([expect.objectContaining({ id: created.id, externalUrl: 'http://example.org/new' })]),
  }));

  const removed = await PATCH(request('PATCH', { id: created.id, patch: { externalUrl: '' } }));
  expect(removed.status).toBe(200);
  expect((await removed.json()).externalUrl).toBe('');
  expect(mockSave).toHaveBeenLastCalledWith('link-owner', expect.objectContaining({
    projects: expect.arrayContaining([expect.objectContaining({ id: created.id, externalUrl: '' })]),
  }));
});

it.each(['javascript:alert(1)', 'data:text/html,test', '/relative', 'ftp://example.com', 'https://', 42, null])(
  'rejects invalid links in both creation and update requests: %s',
  async (externalUrl) => {
    const savesBefore = mockSave.mock.calls.length;
    const created = await POST(request('POST', { text: 'Invalid project', externalUrl }));
    expect(created.status).toBe(400);
    expect(await created.json()).toEqual({ error: 'External link must be a valid HTTP/HTTPS URL' });
    const updated = await PATCH(request('PATCH', { id: 'project', patch: { externalUrl } }));
    expect(updated.status).toBe(400);
    expect(mockSave).toHaveBeenCalledTimes(savesBefore);
  },
);

it.each(['https://example.com/path?q=a#section', 'http://localhost:3001/', ' HTTPS://example.org '])(
  'accepts valid web links: %s',
  (url) => expect(isValidExternalUrl(url)).toBe(true),
);
