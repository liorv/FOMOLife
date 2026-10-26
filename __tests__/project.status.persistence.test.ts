import type { ProjectItem } from '@myorg/types';
import type { PersistedUserData } from '@myorg/storage';

jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: (userId: string) => mockLoad(userId),
    save: (userId: string, data: PersistedUserData) => mockSave(userId, data),
  }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getFrameworkSession: () => mockSession(),
}));
jest.mock('@/lib/projects/server/projectCommentsStore', () => ({
  notifyTaskCompleted: jest.fn().mockResolvedValue(undefined),
  notifyTaskAssigned: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/projects/server/roadmapNotifications', () => ({
  notifyRoadmapMembers: jest.fn().mockResolvedValue(undefined),
}));

const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockSession = jest.fn();
let persisted: Omit<PersistedUserData, 'projects'> & { projects: ProjectItem[] };
const request = (patch: unknown) => new Request('http://localhost/api/projects', {
  method: 'PATCH', body: JSON.stringify({ id: 'p', patch }),
});
function tasks(project: ProjectItem) { return project.subprojects.flatMap(section => section.tasks); }

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  const project: ProjectItem = {
    id: 'p', text: 'Release', color: '#123456',
    members: [{ userId: 'owner', name: 'Owner' }, { userId: 'member', name: 'Member' }],
    subprojects: [{ id: 's', text: 'Release Tasks', isProjectLevel: true, tasks: ['a', 'b'].map(id => ({
      id, text: id, done: false, favorite: false, people: [], dueDate: null,
    })) }],
    planningLinks: [{ prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'task', id: 'b' } }],
  };
  persisted = { tasks: [], people: [], projects: [project] };
  mockLoad.mockImplementation(async (userId: string) => userId === 'owner'
    ? JSON.parse(JSON.stringify(persisted))
    : { tasks: [], people: [], projects: [], sharedProjectRefs: [{ ownerUserId: 'owner', projectId: 'p' }] });
  mockSave.mockImplementation(async (userId: string, data: PersistedUserData) => {
    if (userId === 'owner') persisted = JSON.parse(JSON.stringify(data));
  });
  mockSession.mockResolvedValue({ isAuthenticated: true, userId: 'member', authMode: 'none' });
});

afterEach(() => jest.useRealTimers());

it('saves targeted member status updates under the owner, replacing only today and surviving cold reloads', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  let response = await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }));
  expect(response.status).toBe(200);
  let saved: ProjectItem = await response.json();
  expect(tasks(saved)[0]).toMatchObject({ status: 'blocked', done: false });
  expect(saved.statusHistory).toHaveLength(1);
  expect(saved.statusHistory![0]).toMatchObject({ date: '2026-10-25', status: 'blocked', updatedBy: 'member' });
  expect(saved.statusHistory![0]!.impact.downstreamTasks).toEqual([{ id: 'b', text: 'b' }]);
  expect(mockSave).toHaveBeenLastCalledWith('owner', expect.objectContaining({ projects: expect.any(Array) }));

  response = await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'complete' } }));
  saved = await response.json();
  expect(tasks(saved)[0]).toMatchObject({ done: true, status: 'complete', completedAt: '2026-10-25T12:00:00.000Z' });
  expect(saved.statusHistory).toHaveLength(1);
  expect(saved.statusHistory![0]!.tasks.find(task => task.id === 'b')?.eligible).toBe(true);
  const yesterday = JSON.stringify(saved.statusHistory![0]);
  jest.setSystemTime(new Date('2026-10-26T01:00:00Z'));
  response = await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'in_progress' } }));
  saved = await response.json();
  expect(tasks(saved)[0]).toMatchObject({ done: false, status: 'in_progress', completedAt: null });
  expect(saved.statusHistory).toHaveLength(2);
  expect(JSON.stringify(saved.statusHistory![0])).toBe(yesterday);
  expect(saved.statusHistory![1]!.tasks.find(task => task.id === 'b')?.eligible).toBe(false);
  expect(saved).not.toHaveProperty('taskStatusUpdate');
  expect(saved).not.toHaveProperty('recordStatusUpdate');

  jest.resetModules();
  const store = await import('@/lib/projects/server/projectsStore');
  const reloaded = (await store.listProjects('owner'))[0]!;
  expect(reloaded.statusHistory).toEqual(saved.statusHistory);
  expect(tasks(reloaded)[0]!.status).toBe('in_progress');
});

it('synchronizes ordinary completion/reopening saves and rejects client history overwrites', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }));
  const store = await import('@/lib/projects/server/projectsStore');
  let saved = (await store.listProjects('owner'))[0]!;
  let response = await PATCH(request({
    subprojects: saved.subprojects.map(section => ({ ...section, tasks: section.tasks.map(task => ({ ...task, done: true })) })),
    statusHistory: [],
  }));
  saved = await response.json();
  expect(tasks(saved).every(task => task.status === 'complete')).toBe(true);
  expect(saved.statusHistory![0]!.status).toBe('complete');
  response = await PATCH(request({
    subprojects: saved.subprojects.map(section => ({ ...section, tasks: section.tasks.map(task => ({ ...task, done: false })) })),
  }));
  saved = await response.json();
  expect(tasks(saved).every(task => task.status === 'not_started')).toBe(true);
  expect(saved.statusHistory![0]!.status).toBe('not_started');
  expect(saved.statusHistory).toHaveLength(1);
});

it('records an unchanged daily report and does not refresh it for unrelated editor saves', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  let saved: ProjectItem = await (await PATCH(request({ recordStatusUpdate: true }))).json();
  const original = JSON.stringify(saved.statusHistory);
  jest.setSystemTime(new Date('2026-10-26T01:00:00Z'));
  saved = await (await PATCH(request({ text: 'Renamed', statusHistory: [] }))).json();
  expect(JSON.stringify(saved.statusHistory)).toBe(original);
  saved = await (await PATCH(request({ recordStatusUpdate: true }))).json();
  expect(saved.statusHistory).toHaveLength(2);
  expect(saved.statusHistory![1]!.projectName).toBe('Renamed');
});

it('skips Roadmap scans for reporting-only saves but preserves completion and recurrence notifications', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  const { notifyRoadmapMembers } = await import('@/lib/projects/server/roadmapNotifications');
  const { notifyTaskCompleted } = await import('@/lib/projects/server/projectCommentsStore');
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }));
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'on_track' } }));
  await PATCH(request({ recordStatusUpdate: true }));
  expect(notifyRoadmapMembers).not.toHaveBeenCalled();
  expect(notifyTaskCompleted).not.toHaveBeenCalled();
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'complete' } }));
  expect(notifyRoadmapMembers).toHaveBeenCalledTimes(1);
  expect(notifyTaskCompleted).toHaveBeenCalledTimes(1);
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'in_progress' } }));
  expect(notifyRoadmapMembers).toHaveBeenCalledTimes(2);
  expect(notifyTaskCompleted).toHaveBeenCalledTimes(1);
});

it('does not let stale full-task snapshots overwrite newer statuses when editing or completing another task', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  const stale = persisted.projects[0]!.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => ({ ...task })),
  }));
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }));
  stale[0]!.tasks[0]!.status = 'not_started';
  stale[0]!.tasks[0]!.text = 'Edited name';
  stale[0]!.tasks[1]!.done = true;
  const saved: ProjectItem = await (await PATCH(request({ subprojects: stale }))).json();
  expect(tasks(saved)[0]).toMatchObject({ text: 'Edited name', status: 'blocked' });
  expect(tasks(saved)[1]).toMatchObject({ done: true, status: 'complete' });
  expect(saved.statusHistory![0]!.status).toBe('blocked');
});

it('advances recurring work instead of leaving its next occurrence complete or blocked', async () => {
  persisted.projects![0]!.subprojects[0]!.tasks[0]!.recurrence = 'daily';
  persisted.projects![0]!.subprojects[0]!.tasks[0]!.dueDate = '2026-10-25';
  const { PATCH } = await import('@/app/api/projects/route');
  const response = await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'complete' } }));
  const saved: ProjectItem = await response.json();
  expect(tasks(saved)[0]).toMatchObject({ done: false, status: 'not_started', dueDate: '2026-10-26' });
  expect(saved.statusHistory).toHaveLength(1);
});

it.each([
  { taskStatusUpdate: { taskId: 'a', status: 'bogus' } },
  { taskStatusUpdate: null },
  { recordStatusUpdate: 'yes' },
  { taskStatusUpdate: { taskId: 'a', status: 'blocked' }, subprojects: [] },
  { subprojects: [{ tasks: [{ status: 'invalid' }] }] },
])('rejects invalid status input %j without saving', async patch => {
  const { PATCH } = await import('@/app/api/projects/route');
  expect((await PATCH(request(patch))).status).toBe(400);
  expect(mockSave).not.toHaveBeenCalled();
});

it('rejects a missing task, revoked membership, and unauthenticated writes', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  expect((await PATCH(request({ taskStatusUpdate: { taskId: 'missing', status: 'blocked' } }))).status).toBe(404);
  mockSession.mockResolvedValue({ isAuthenticated: true, userId: 'outsider', authMode: 'none' });
  expect((await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }))).status).toBe(404);
  expect((await PATCH(request({ recordStatusUpdate: true }))).status).toBe(404);
  mockSession.mockResolvedValue({ isAuthenticated: false, userId: '', authMode: 'none' });
  expect((await PATCH(request({ recordStatusUpdate: true }))).status).toBe(401);
  expect(mockSave).not.toHaveBeenCalled();
});

it('returns an explicit error on failed storage without advancing cached or persisted history', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockSave.mockRejectedValueOnce(new Error('Storage offline'));
  const response = await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }));
  expect(response.status).toBe(500);
  expect((await response.json()).error).toContain('Please retry');
  const store = await import('@/lib/projects/server/projectsStore');
  expect((await store.listProjects('owner'))[0]!.statusHistory).toBeUndefined();
  expect(persisted.projects![0]!.statusHistory).toBeUndefined();
  log.mockRestore();
});

it('persists independent work/health and task update bullets with daily history across cold reloads', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'in_progress' } }));
  let saved: ProjectItem = await (await PATCH(request({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } }))).json();
  expect(tasks(saved)[0]).toMatchObject({ status: 'in_progress', scheduleHealth: 'behind' });
  expect(saved.statusHistory![0]!.tasks[1]).toMatchObject({ status: 'not_started', scheduleHealth: 'behind', inheritedBehind: true });
  saved = await (await PATCH(request({ taskStatusNote: { taskId: 'a', action: 'add', update: { id: 'note', text: '  Supplier delayed  ' } } }))).json();
  expect(tasks(saved)[0]!.statusUpdates).toEqual([{ id: 'note', text: 'Supplier delayed' }]);
  expect(saved.statusHistory).toHaveLength(1);
  expect(saved.statusHistory![0]!.tasks[0]!.statusUpdates).toEqual([{ id: 'note', text: 'Supplier delayed' }]);
  expect(saved).not.toHaveProperty('taskScheduleUpdate');
  expect(saved).not.toHaveProperty('taskStatusNote');
  const oldSnapshot = JSON.stringify(saved.statusHistory![0]);
  jest.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  saved = await (await PATCH(request({ taskStatusNote: { taskId: 'a', action: 'remove', updateId: 'note' } }))).json();
  expect(tasks(saved)[0]!.statusUpdates).toEqual([]);
  expect(saved.statusHistory).toHaveLength(2);
  expect(JSON.stringify(saved.statusHistory![0])).toBe(oldSnapshot);
  jest.resetModules();
  const store = await import('@/lib/projects/server/projectsStore');
  const reloaded = (await store.listProjects('owner'))[0]!;
  expect(tasks(reloaded)[0]).toMatchObject({ status: 'in_progress', scheduleHealth: 'behind', statusUpdates: [] });
  expect(reloaded.statusHistory).toEqual(saved.statusHistory);
});

it('preserves health and notes from newer reporting writes over stale editor snapshots', async () => {
  const stale = persisted.projects[0]!.subprojects.map(section => ({ ...section, tasks: section.tasks.map(task => ({ ...task })) }));
  const { PATCH } = await import('@/app/api/projects/route');
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }));
  await PATCH(request({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } }));
  await PATCH(request({ taskStatusNote: { taskId: 'a', action: 'add', update: { id: 'note', text: 'Saved note' } } }));
  stale[0]!.tasks[0]!.statusUpdates = [];
  stale[0]!.tasks[0]!.scheduleHealth = 'on_track';
  const saved: ProjectItem = await (await PATCH(request({ subprojects: stale }))).json();
  expect(tasks(saved)[0]).toMatchObject({ status: 'blocked', scheduleHealth: 'behind', statusUpdates: [{ id: 'note', text: 'Saved note' }] });
});

it('requires active eligible tasks for health and clears inherited Behind when completed', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  expect((await PATCH(request({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } }))).status).toBe(400);
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'in_progress' } }));
  await PATCH(request({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } }));
  expect((await PATCH(request({ taskScheduleUpdate: { taskId: 'b', health: 'on_track' } }))).status).toBe(400);
  let saved: ProjectItem = await (await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'complete' } }))).json();
  expect(tasks(saved)[0]).toMatchObject({ status: 'complete', scheduleHealth: null });
  expect(saved.statusHistory![0]!.tasks[1]).toMatchObject({ scheduleHealth: null, inheritedBehind: false });
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'in_progress' } }));
  saved = await (await PATCH(request({ taskScheduleUpdate: { taskId: 'a', health: 'on_track' } }))).json();
  expect(saved.statusHistory![0]!.scheduleHealth).toBe('on_track');
});

it('migrates persisted legacy On track work status when recording new reports', async () => {
  persisted.projects[0]!.subprojects[0]!.tasks[0]!.status = 'on_track';
  const { PATCH } = await import('@/app/api/projects/route');
  const saved: ProjectItem = await (await PATCH(request({ recordStatusUpdate: true }))).json();
  expect(saved.statusHistory![0]).toMatchObject({ status: 'in_progress', scheduleHealth: 'on_track' });
  expect(saved.statusHistory![0]!.tasks[0]).toMatchObject({ status: 'in_progress', scheduleHealth: 'on_track' });
});

it.each([
  { taskScheduleUpdate: { taskId: 'a', health: 'invalid' } },
  { taskScheduleUpdate: null },
  { taskStatusNote: null },
  { taskStatusNote: { taskId: 'a', action: 'add', update: { id: 'note', text: '   ' } } },
  { taskStatusNote: { taskId: 'a', action: 'add', update: { id: 'note', text: 'x'.repeat(5001) } } },
  { taskStatusNote: { taskId: 'a', action: 'remove' } },
  { taskStatusNote: { taskId: 'a', action: 'other' } },
  { taskScheduleUpdate: { taskId: 'a', health: 'behind' }, subprojects: [] },
  { taskStatusUpdate: { taskId: 'a', status: 'in_progress' }, taskScheduleUpdate: { taskId: 'a', health: 'behind' } },
  { subprojects: [{ tasks: [{ scheduleHealth: 'invalid' }] }] },
  { subprojects: [{ tasks: [{ statusUpdates: [{ id: 'note', text: '' }] }] }] },
])('rejects malformed health and update actions without writing (%#)', async patch => {
  const { PATCH } = await import('@/app/api/projects/route');
  expect((await PATCH(request(patch))).status).toBe(400);
  expect(mockSave).not.toHaveBeenCalled();
});

it('does not remove missing updates or permit reporting actions for revoked members', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  expect((await PATCH(request({ taskStatusNote: { taskId: 'a', action: 'remove', updateId: 'missing' } }))).status).toBe(404);
  mockSession.mockResolvedValue({ isAuthenticated: true, userId: 'outsider', authMode: 'none' });
  expect((await PATCH(request({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } }))).status).toBe(404);
  expect((await PATCH(request({ taskStatusNote: { taskId: 'a', action: 'add', update: { id: 'note', text: 'Not allowed' } } }))).status).toBe(404);
  expect(mockSave).not.toHaveBeenCalled();
});

it('clears reporting notes and health for recurring completion in ordinary task editors', async () => {
  const { advanceRecurringTask } = await import('@/lib/tasks/recurrence');
  persisted.projects[0]!.subprojects[0]!.tasks[0]!.recurrence = 'daily';
  persisted.projects[0]!.subprojects[0]!.tasks[0]!.dueDate = '2026-10-25';
  const { PATCH } = await import('@/app/api/projects/route');
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'in_progress' } }));
  await PATCH(request({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } }));
  let saved: ProjectItem = await (await PATCH(request({ taskStatusNote: { taskId: 'a', action: 'add', update: { id: 'note', text: 'This occurrence only' } } }))).json();
  const oldHistory = JSON.stringify(saved.statusHistory![0]);
  jest.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  const subprojects = saved.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => task.id === 'a' ? advanceRecurringTask(task)! : task),
  }));
  saved = await (await PATCH(request({ subprojects }))).json();
  expect(tasks(saved)[0]).toMatchObject({ done: false, status: 'not_started', scheduleHealth: null, statusUpdates: [], dueDate: '2026-10-26' });
  expect(saved.statusHistory).toHaveLength(2);
  expect(JSON.stringify(saved.statusHistory![0])).toBe(oldHistory);
});

it('persists active delay days and forecast automatically with today snapshot', async () => {
  persisted.projects[0]!.subprojects[0]!.tasks.forEach(task => { task.effort = 2; });
  const { PATCH } = await import('@/app/api/projects/route');
  expect((await PATCH(request({ taskDelayUpdate: { taskId: 'a', days: 3 } }))).status).toBe(400);
  await PATCH(request({ taskStatusUpdate: { taskId: 'a', status: 'in_progress' } }));
  const response = await PATCH(request({ taskDelayUpdate: { taskId: 'a', days: 3 } }));
  expect(response.status).toBe(200);
  const saved: ProjectItem = await response.json();
  expect(tasks(saved)[0]).toMatchObject({ delayDays: 3, scheduleHealth: 'behind' });
  expect(saved.statusHistory).toHaveLength(1);
  expect(saved.statusHistory![0]!.forecast).toMatchObject({ earliestFinish: '2026-11-01', delayDays: 3, missingEffort: 0 });
  expect(saved).not.toHaveProperty('taskDelayUpdate');
  expect((await PATCH(request({ taskDelayUpdate: { taskId: 'a', days: -1 } }))).status).toBe(400);
  expect((await PATCH(request({ taskDelayUpdate: { taskId: 'a', days: 36501 } }))).status).toBe(400);
  const cleared: ProjectItem = await (await PATCH(request({ taskDelayUpdate: { taskId: 'a', days: 0 } }))).json();
  expect(tasks(cleared)[0]).toMatchObject({ delayDays: 0, scheduleHealth: 'on_track' });
});

it('automatically snapshots effort, task-list and deadline changes without a manual report', async () => {
  const { PATCH } = await import('@/app/api/projects/route');
  const sections = JSON.parse(JSON.stringify(persisted.projects[0]!.subprojects)) as ProjectItem['subprojects'];
  sections[0]!.tasks.forEach(task => { task.effort = 2; });
  let response = await PATCH(request({ subprojects: sections }));
  expect(response.status).toBe(200);
  let saved: ProjectItem = await response.json();
  expect(saved.statusHistory![0]!.forecast?.earliestFinish).toBe('2026-10-29');
  const yesterday = JSON.stringify(saved.statusHistory![0]);
  jest.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  response = await PATCH(request({ deadlines: [{ id: 'd', label: 'Delivery', date: '2026-10-28' }] }));
  saved = await response.json();
  expect(saved.statusHistory).toHaveLength(2);
  expect(JSON.stringify(saved.statusHistory![0])).toBe(yesterday);
  expect(saved.statusHistory![1]!.forecast?.deadlines).toEqual([{ label: 'Delivery', date: '2026-10-28', daysLate: 2 }]);
  const shortenedSections = saved.subprojects.map(section => ({ ...section, tasks: section.tasks.slice(0, -1) }));
  response = await PATCH(request({ subprojects: shortenedSections }));
  expect(response.status).toBe(200);
  saved = await response.json();
  expect(tasks(saved)).toHaveLength(1);
  expect(saved.statusHistory![1]!.tasks).toHaveLength(1);
  expect(saved.statusHistory![1]!.forecast?.earliestFinish).toBeNull();
});
