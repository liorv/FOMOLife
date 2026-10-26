jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: async (key: string) => mockRows.get(key) ?? null,
    save: async (key: string, data: PersistedUserData) => { mockRows.set(key, data); },
  }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getDisplayNameFromUserId: (id: string) => id,
}));
jest.mock('@/lib/server/webPush', () => ({
  sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
}));

import type { PersistedUserData } from '@myorg/storage';
import type { ProjectItem } from '@/lib/projects/server/projectsStore';
import { updateProject } from '@/lib/projects/server/projectsStore';
import { scanRoadmapNotifications, notifyRoadmapMembers } from '@/lib/projects/server/roadmapNotifications';
import { dismissProjectNotifications, listProjectNotifications, markProjectNotificationsRead } from '@/lib/projects/server/projectCommentsStore';
import { saveTaskNotificationSettings } from '@/lib/server/notificationSettings';
import { sendPushToUser } from '@/lib/server/webPush';
import { getNotificationUrl } from '@/lib/notificationNavigation';

const mockRows = new Map<string, PersistedUserData>();
const now = new Date('2026-10-25T23:59:00Z');
const task = { id: 't', text: 'Task', done: false, dueDate: null, favorite: false, people: [] };
const base: ProjectItem = {
  id: 'p', text: 'Project', color: 'blue',
  subprojects: [{ id: 's', text: 'Section', tasks: [task] }],
};
const preferences = {
  createdByMe: { enabled: true, notifyBefore: '1d' as const },
  assignedToMe: { enabled: true, notifyBefore: '1d' as const },
};
let userId: string;
let sequence = 0;

beforeEach(() => {
  userId = `roadmap-user-${++sequence}`;
  mockRows.clear();
  jest.clearAllMocks();
});

it('sends approaching and missed deadline alerts with distinct push tags and Roadmap links', async () => {
  const project = { ...base, deadlines: [
    { id: 'tomorrow', label: 'Launch', date: '2026-10-26' },
    { id: 'yesterday', label: 'Review', date: '2026-10-24' },
  ] };
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(2);
  const notifications = await listProjectNotifications(userId);
  expect(notifications.map(n => n.type).sort()).toEqual(['deadline_approaching', 'deadline_missed']);
  expect(notifications.map(n => n.commentText).join(' ')).toContain('in 1 day');
  expect(sendPushToUser).toHaveBeenCalledTimes(2);
  expect(new Set(jest.mocked(sendPushToUser).mock.calls.map(([, push]) => push.tag)).size).toBe(2);
  for (const notification of notifications) {
    expect(getNotificationUrl(notification)).toBe('/?tab=projects&projectId=p&view=roadmap');
  }
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
});

it('uses the next UTC day for missed alerts, not the start of the due date', async () => {
  const project = { ...base, deadlines: [{ id: 'd', label: 'Today', date: '2026-10-25' }] };
  await scanRoadmapNotifications(userId, [project], now);
  expect((await listProjectNotifications(userId))[0]?.type).toBe('deadline_approaching');
  expect(await scanRoadmapNotifications(userId, [project], new Date('2026-10-26T00:00:00Z'))).toBe(1);
  expect((await listProjectNotifications(userId))[0]?.type).toBe('deadline_missed');
});

it('does not send or consume deadline and milestone alerts while the master switch is off', async () => {
  const project = { ...base, dueDate: '2026-10-25',
    subprojects: [{ ...base.subprojects[0]!, tasks: [{ ...task, done: true }] }],
    milestones: [{ id: 'm', label: 'Ready', taskIds: ['t'] }],
  };
  await saveTaskNotificationSettings(userId, { ...preferences, enabled: false });
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
  expect(sendPushToUser).not.toHaveBeenCalled();
  expect(mockRows.has(`__roadmap_notif_state__${userId}`)).toBe(false);
  await saveTaskNotificationSettings(userId, { ...preferences, enabled: true });
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(2);
});

it.each([
  ['7d', '2026-11-01', 1], ['1d', '2026-10-27', 0],
  ['0d', '2026-10-26', 0], ['0d', '2026-10-25', 1], ['off', '2026-10-25', 0],
] as const)('honors deadline timing %s for %s', async (timing, date, count) => {
  await saveTaskNotificationSettings(userId, { ...preferences, deadlineNotifyBefore: timing });
  expect(await scanRoadmapNotifications(userId, [{ ...base, dueDate: date }], now)).toBe(count);
});

it('supports independent category toggles, including hiding and restoring existing alerts', async () => {
  const project = { ...base, dueDate: '2026-10-25', deadlines: [{ id: 'd', label: 'Past', date: '2026-10-24' }] };
  await saveTaskNotificationSettings(userId, { ...preferences, events: { deadlinesMissed: false } });
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(1);
  expect((await listProjectNotifications(userId))[0]?.type).toBe('deadline_approaching');
  await saveTaskNotificationSettings(userId, { ...preferences, events: { deadlinesApproaching: false, deadlinesMissed: true } });
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(1);
  expect((await listProjectNotifications(userId)).map(n => n.type)).toEqual(['deadline_missed']);
  await saveTaskNotificationSettings(userId, { ...preferences, events: { deadlinesApproaching: true } });
  expect((await listProjectNotifications(userId)).length).toBe(2);
});

it('requires every milestone dependency to exist and be complete', async () => {
  const project = { ...base, milestones: [
    { id: 'empty', label: 'Empty', taskIds: [] },
    { id: 'missing', label: 'Missing', taskIds: ['deleted'] },
    { id: 'valid', label: 'Ship', taskIds: ['t'] },
  ] };
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
  project.subprojects = [{ ...base.subprojects[0]!, tasks: [{ ...task, done: true }] }];
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(1);
  const [notification] = await listProjectNotifications(userId);
  expect(notification).toMatchObject({ type: 'milestone_achieved', read: false });
  await dismissProjectNotifications(userId, [notification!.id]);
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
  expect((await listProjectNotifications(userId))[0]?.dismissed).toBe(true);
});

it('allows milestone alerts to be disabled without consuming the achievement', async () => {
  const project = { ...base, milestones: [{ id: 'm', label: 'Ship', taskIds: ['t'] }],
    subprojects: [{ ...base.subprojects[0]!, tasks: [{ ...task, done: true }] }] };
  await saveTaskNotificationSettings(userId, { ...preferences, events: { milestonesAchieved: false } });
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
  await saveTaskNotificationSettings(userId, { ...preferences, events: { milestonesAchieved: true } });
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(1);
});

it('requires all current section tasks to finish before notifying and rejects deleted sections', async () => {
  const project: ProjectItem = { ...base, milestones: [
    { id: 'm', label: 'Section complete', taskIds: [], sectionIds: ['s'] },
    { id: 'deleted', label: 'Missing section', taskIds: ['t'], sectionIds: ['missing'] },
  ] };
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
  project.subprojects = [{ ...base.subprojects[0]!, tasks: [{ ...task, done: true }] }];
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(1);
  project.subprojects[0]!.tasks.push({ ...task, id: 'new' });
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
  project.subprojects[0]!.tasks[1]!.done = true;
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(1);
});

it('does not send again after reopening and recompleting the same milestone', async () => {
  const project = { ...base, milestones: [{ id: 'm', label: 'Ship', taskIds: ['t'] }],
    subprojects: [{ ...base.subprojects[0]!, tasks: [{ ...task, done: true }] }] };
  await scanRoadmapNotifications(userId, [project], now);
  await scanRoadmapNotifications(userId, [base], now);
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
});

it.each([{ archived: true }, { isTemplate: true }, { members: [{ userId: 'someone-else', name: 'Other' }] }])(
  'skips ineligible projects %j', async patch => {
    expect(await scanRoadmapNotifications(userId, [{ ...base, ...patch, dueDate: '2026-10-24' }], now)).toBe(0);
    expect(sendPushToUser).not.toHaveBeenCalled();
  },
);

it('deduplicates simultaneous scans and permits a new alert when the date changes', async () => {
  const project = { ...base, dueDate: '2026-10-25' };
  expect(await Promise.all([
    scanRoadmapNotifications(userId, [project], now),
    scanRoadmapNotifications(userId, [project], now),
  ])).toEqual([1, 0]);
  expect(await scanRoadmapNotifications(userId, [{ ...project, dueDate: '2026-10-26' }], now)).toBe(1);
});

it('supports mark-read and dismiss-all without regenerating dismissed events', async () => {
  const project = { ...base, dueDate: '2026-10-24' };
  await scanRoadmapNotifications(userId, [project], now);
  await markProjectNotificationsRead(userId, []);
  expect((await listProjectNotifications(userId))[0]?.read).toBe(true);
  await dismissProjectNotifications(userId, []);
  expect(await scanRoadmapNotifications(userId, [project], now)).toBe(0);
  expect((await listProjectNotifications(userId))[0]?.dismissed).toBe(true);
});

it('notifies only current members, once each', async () => {
  await notifyRoadmapMembers({ ...base, dueDate: '2000-01-01', members: [
    { userId, name: 'One' }, { userId, name: 'Duplicate' },
    { userId: `${userId}-member`, name: 'Two' },
  ] }, 'former-owner');
  expect(jest.mocked(sendPushToUser).mock.calls.map(([id]) => id).sort()).toEqual([userId, `${userId}-member`]);
});

it('delivers milestone achievements immediately when a project task is saved complete', async () => {
  mockRows.set(userId, { projects: [{ ...base, milestones: [{ id: 'm', label: 'Ship', taskIds: ['t'] }] }] });
  await updateProject(userId, base.id, {
    subprojects: [{ ...base.subprojects[0]!, tasks: [{ ...task, done: true }] }],
  });
  expect((await listProjectNotifications(userId))[0]?.type).toBe('milestone_achieved');
});
