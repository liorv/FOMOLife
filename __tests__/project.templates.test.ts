jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: (...args: unknown[]) => mockLoad(...args),
    save: (...args: unknown[]) => mockSave(...args),
  }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getFrameworkSession: jest.fn(),
}));
jest.mock('@/lib/projects/server/projectCommentsStore', () => ({
  notifyTaskCompleted: jest.fn(),
  notifyTaskAssigned: jest.fn(),
}));

import { GET, POST, PATCH } from '@/app/api/projects/route';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { notifyTaskAssigned, notifyTaskCompleted } from '@/lib/projects/server/projectCommentsStore';
import { getOrInitUserProjects } from '@/lib/projects/server/projectsStore';
import { instantiateTemplate } from '@/lib/projects/instantiateTemplate';
import type { ProjectItem } from '@myorg/types';

const mockLoad = jest.fn().mockResolvedValue({ tasks: [], people: [] });
const mockSave = jest.fn().mockResolvedValue(undefined);
let userNumber = 0;
let userId: string;

function request(method: string, body?: unknown) {
  return new Request('http://localhost/api/projects', { method, ...(body ? { body: JSON.stringify(body) } : {}) });
}

const definition = {
  text: 'Launch workflow',
  color: '#7B1FA2',
  description: 'A repeatable launch plan',
  goal: 'Ship something great',
  externalUrl: 'https://example.com/guide',
  dueDate: '2026-11-01',
  aiInstructions: 'Be concise',
  avatarUrl: '/launch.svg',
  progress: 100,
  subprojects: [{
    id: 'original-sub', text: 'Preparation', color: '#1976D2', description: 'Plan ahead',
    owners: [{ name: 'Original owner' }],
    tasks: [{
      id: 'original-task', text: 'Write a brief', description: 'Include the audience',
      done: true, dueDate: '2026-10-01', recurrence: 'monthly', recurrenceAnchorDate: '2026-10-01',
      favorite: true, effort: 3, people: [{ name: 'Original owner' }],
      createdAt: '2026-09-01T12:00:00Z', completedAt: '2026-09-02T12:00:00Z',
    }],
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  userId = `template-owner-${++userNumber}`;
  mockLoad.mockResolvedValue({ tasks: [], people: [] });
  mockSave.mockResolvedValue(undefined);
  jest.mocked(getFrameworkSession).mockResolvedValue({
    isAuthenticated: true, userId, userName: 'Current user', authMode: 'none',
  });
});

it('creates templates, reloads them from storage, and converts projects in both directions without losing content', async () => {
  const response = await POST(request('POST', { ...definition, isTemplate: true }));
  expect(response.status).toBe(201);
  const template: ProjectItem = await response.json();
  expect(template.isTemplate).toBe(true);
  const saved = mockSave.mock.calls.at(-1)?.[1];
  expect(saved.projects).toEqual([template]);

  // A separate user cache reads the persisted data rather than a cached response.
  mockLoad.mockResolvedValue(saved);
  expect((await getOrInitUserProjects('template-reload'))[0]).toEqual(template);

  const restored = await PATCH(request('PATCH', { id: template.id, patch: { isTemplate: false } }));
  expect((await restored.json()).isTemplate).toBe(false);
  await PATCH(request('PATCH', { id: template.id, patch: { archived: true } }));
  const converted = await PATCH(request('PATCH', { id: template.id, patch: { isTemplate: true } }));
  expect(await converted.json()).toEqual({ ...template, isTemplate: true, archived: false, archivedAt: null });
  const loaded = await GET(request('GET'));
  expect((await loaded.json()).projects[0].isTemplate).toBe(true);
});

it('instantiates independent projects with fresh identities and clean execution state', async () => {
  const template: ProjectItem = await (await POST(request('POST', { ...definition, isTemplate: true }))).json();
  const create = async (text: string) => {
    const response = await POST(request('POST', { text, templateId: template.id }));
    expect(response.status).toBe(201);
    return response.json() as Promise<ProjectItem>;
  };
  const first = await create('First launch');
  const second = await create('Second launch');
  expect(first).toMatchObject({
    text: 'First launch', isTemplate: false, progress: 0, dueDate: null,
    description: definition.description, goal: definition.goal, externalUrl: definition.externalUrl,
    aiInstructions: definition.aiInstructions, avatarUrl: definition.avatarUrl,
    creatorId: userId, members: [{ userId, name: 'Current user' }],
  });
  expect(first.id).not.toBe(template.id);
  expect(second.id).not.toBe(first.id);
  const originalSub = template.subprojects.find(sub => sub.id === 'original-sub')!;
  const firstSub = first.subprojects.find(sub => !sub.isProjectLevel)!;
  const secondSub = second.subprojects.find(sub => !sub.isProjectLevel)!;
  expect(firstSub).toMatchObject({ text: originalSub.text, description: originalSub.description, owners: [] });
  expect(new Set([originalSub.id, firstSub.id, secondSub.id]).size).toBe(3);
  expect(new Set([originalSub.tasks[0]!.id, firstSub.tasks[0]!.id, secondSub.tasks[0]!.id]).size).toBe(3);
  expect(firstSub.tasks[0]).toMatchObject({
    text: 'Write a brief', description: 'Include the audience', done: false, dueDate: null,
    recurrence: 'monthly', recurrenceAnchorDate: null, favorite: true, effort: 3, people: [],
    completedAt: null,
  });
  expect(firstSub.tasks[0]!.createdAt).not.toBe(originalSub.tasks[0]!.createdAt);
  expect(first.subprojects[0]!.isProjectLevel).toBe(true);
  await PATCH(request('PATCH', { id: first.id, patch: { text: 'Changed copy', subprojects: [] } }));
  const loaded = (await (await GET(request('GET'))).json()).projects as ProjectItem[];
  expect(loaded.find(project => project.id === template.id)).toEqual(template);
});

it('copies project-level tasks and never mutates the input template', async () => {
  const template: ProjectItem = await (await POST(request('POST', { ...definition, isTemplate: true }))).json();
  template.subprojects[0]!.tasks = [{ ...template.subprojects[1]!.tasks[0]!, id: 'direct-task' }];
  const before = JSON.stringify(template);
  const copy = instantiateTemplate(template, 'Copy');
  expect(copy.subprojects?.[0]?.tasks[0]?.id).not.toBe('direct-task');
  expect(copy.subprojects?.[0]?.isProjectLevel).toBe(true);
  expect(JSON.stringify(template)).toBe(before);
});

it('rejects missing, inaccessible, and non-template source IDs', async () => {
  const ordinary: ProjectItem = await (await POST(request('POST', { text: 'Ordinary project' }))).json();
  for (const templateId of ['missing', ordinary.id]) {
    expect((await POST(request('POST', { text: 'Copy', templateId }))).status).toBe(404);
  }
  const template: ProjectItem = await (await POST(request('POST', { text: 'Private template', isTemplate: true }))).json();
  jest.mocked(getFrameworkSession).mockResolvedValue({
    isAuthenticated: true, userId: 'another-template-user', authMode: 'none',
  });
  expect((await POST(request('POST', { text: 'Copy', templateId: template.id }))).status).toBe(404);
});

it('allows a member to use a shared template without copying its membership', async () => {
  const template: ProjectItem = await (await POST(request('POST', { text: 'Shared template', isTemplate: true }))).json();
  await PATCH(request('PATCH', {
    id: template.id,
    patch: { members: [{ userId, name: 'Owner' }, { userId: 'template-member', name: 'Member' }] },
  }));
  mockLoad.mockImplementation(async (id: string) => id === 'template-member'
    ? { tasks: [], people: [], sharedProjectRefs: [{ ownerUserId: userId, projectId: template.id }] }
    : { tasks: [], people: [] });
  jest.mocked(getFrameworkSession).mockResolvedValue({
    isAuthenticated: true, userId: 'template-member', userName: 'Member', authMode: 'none',
  });
  const response = await POST(request('POST', { text: 'My copy', templateId: template.id }));
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    creatorId: 'template-member', members: [{ userId: 'template-member', name: 'Member' }], isTemplate: false,
  });
});

it.each(['yes', 1, null])('rejects invalid template flags: %s', async isTemplate => {
  expect((await POST(request('POST', { text: 'Invalid', isTemplate }))).status).toBe(400);
  expect((await PATCH(request('PATCH', { id: 'invalid', patch: { isTemplate } }))).status).toBe(400);
  expect(mockSave).not.toHaveBeenCalled();
});

it('rejects blank names and ambiguous template creation requests', async () => {
  expect((await POST(request('POST', { text: ' ', isTemplate: true }))).status).toBe(400);
  expect((await POST(request('POST', { text: 'Copy', templateId: '', isTemplate: false }))).status).toBe(400);
  expect((await POST(request('POST', { text: 'Copy', templateId: 'source', isTemplate: true }))).status).toBe(400);
});

it('requires authentication for template creation and conversion', async () => {
  jest.mocked(getFrameworkSession).mockResolvedValue({ isAuthenticated: false, userId: '', authMode: 'none' });
  expect((await POST(request('POST', { text: 'Template', isTemplate: true }))).status).toBe(401);
  expect((await PATCH(request('PATCH', { id: 'source', patch: { isTemplate: true } }))).status).toBe(401);
});

it('does not send completion or assignment notifications for template edits', async () => {
  const template: ProjectItem = await (await POST(request('POST', { text: 'Template', isTemplate: true }))).json();
  const response = await PATCH(request('PATCH', { id: template.id, patch: { subprojects: definition.subprojects } }));
  expect(response.status).toBe(200);
  expect(notifyTaskAssigned).not.toHaveBeenCalled();
  expect(notifyTaskCompleted).not.toHaveBeenCalled();
});

it('does not publish failed creates or conversions to the project cache', async () => {
  mockSave.mockRejectedValueOnce(new Error('Storage unavailable'));
  await expect(POST(request('POST', { text: 'Unsaved', isTemplate: true }))).rejects.toThrow('Storage unavailable');
  expect(await getOrInitUserProjects(userId)).toEqual([]);
  const ordinary: ProjectItem = await (await POST(request('POST', { text: 'Original' }))).json();
  mockSave.mockRejectedValueOnce(new Error('Cannot convert'));
  await expect(PATCH(request('PATCH', { id: ordinary.id, patch: { isTemplate: true } }))).rejects.toThrow('Cannot convert');
  expect((await getOrInitUserProjects(userId))[0]?.isTemplate).toBeUndefined();
});
