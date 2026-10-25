jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: async (key: string) => mockRows.get(key) ?? null,
    save: async (key: string, data: PersistedUserData) => { mockRows.set(key, data); },
  }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getDisplayNameFromUserId: (id: string) => id,
  getFrameworkSession: jest.fn().mockResolvedValue({ isAuthenticated: true, userId: 'settings-user' }),
}));
jest.mock('@/lib/server/webPush', () => ({ sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }) }));

import type { PersistedUserData } from '@myorg/storage';
import type { NotificationEventSettings } from '@myorg/types';
import { DEFAULT_NOTIFICATION_EVENTS, getTaskNotificationSettings, saveTaskNotificationSettings } from '@/lib/server/notificationSettings';
import { addThreadComment, listProjectNotifications, notifyTaskAssigned, notifyTaskCompleted, getProjectNotifUnreadCount } from '@/lib/projects/server/projectCommentsStore';
import { addComment, createFeedback, listNotifications, markFeedbackComplete } from '@/lib/feedback/server/feedbackStore';
import { createTask, updateTask } from '@/lib/tasks/server/tasksStore';
import { sendPushToUser } from '@/lib/server/webPush';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { GET, PUT } from '@/app/api/tasks/notification-settings/route';

const mockRows = new Map<string, PersistedUserData>();
const reminders = {
  createdByMe: { enabled: true, notifyBefore: '1d' as const },
  assignedToMe: { enabled: true, notifyBefore: '1d' as const },
};
const completion = {
  projectId: 'project', projectTitle: 'Project', taskId: 'task', taskTitle: 'Task',
  completedByUserId: 'completer', completedByName: 'Completer', memberIds: ['member'],
};

beforeEach(() => {
  mockRows.clear();
  jest.clearAllMocks();
});

it('defaults old settings to enabled and preserves event choices when an older client saves', async () => {
  mockRows.set('__task_notif_settings__legacy', { settings: reminders });
  expect((await getTaskNotificationSettings('legacy')).events).toEqual(DEFAULT_NOTIFICATION_EVENTS);
  await saveTaskNotificationSettings('legacy', { ...reminders, events: { ownTaskCompletions: false } });
  await saveTaskNotificationSettings('legacy', reminders);
  expect((await getTaskNotificationSettings('legacy')).events.ownTaskCompletions).toBe(false);
});

it('suppresses self-completions for personal and project tasks without suppressing other members', async () => {
  await saveTaskNotificationSettings('completer', { ...reminders, events: { ownTaskCompletions: false } });
  await notifyTaskCompleted(completion);
  const task = await createTask('completer', { text: 'Personal' });
  await updateTask('completer', task.id, { done: true });
  expect(jest.mocked(sendPushToUser).mock.calls.map(([id]) => id)).toEqual(['member']);
  expect(await listProjectNotifications('completer')).toEqual([]);
  expect((await listProjectNotifications('member')).length).toBe(1);
});

it('independently suppresses completions by others', async () => {
  await saveTaskNotificationSettings('no-others', { ...reminders, events: { othersTaskCompletions: false } });
  await notifyTaskCompleted({ ...completion, completedByUserId: 'self-enabled', memberIds: ['no-others'] });
  expect(jest.mocked(sendPushToUser).mock.calls.map(([id]) => id)).toEqual(['self-enabled']);
});

it('hides existing notifications and unread counts, and restores them when re-enabled', async () => {
  await notifyTaskCompleted({ ...completion, completedByUserId: 'history', memberIds: [] });
  expect(await getProjectNotifUnreadCount('history')).toBe(1);
  await saveTaskNotificationSettings('history', { ...reminders, events: { ownTaskCompletions: false } });
  expect(await listProjectNotifications('history')).toEqual([]);
  expect(await getProjectNotifUnreadCount('history')).toBe(0);
  await saveTaskNotificationSettings('history', { ...reminders, events: { ownTaskCompletions: true } });
  expect(await getProjectNotifUnreadCount('history')).toBe(1);
});

it.each(['taskAssignments', 'projectComments', 'taskComments'] as const)('suppresses %s before storing or pushing', async (event) => {
  const user = `recipient-${event}`;
  await saveTaskNotificationSettings(user, { ...reminders, events: { [event]: false } });
  if (event === 'taskAssignments') {
    await notifyTaskAssigned({
      projectId: 'p', projectTitle: 'P', taskId: 't', taskTitle: 'T',
      assignedByUserId: 'actor', assignedByName: 'Actor', assigneeIds: [user],
    });
  } else {
    await addThreadComment({
      threadId: `thread-${event}`, threadTitle: 'Thread', projectId: 'p',
      ...(event === 'taskComments' ? { taskId: 't' } : {}),
      memberIds: [user], authorId: 'actor', authorName: 'Actor', text: 'Hello',
    });
  }
  expect(sendPushToUser).not.toHaveBeenCalled();
  expect(mockRows.has(`__proj_notifs__${user}`)).toBe(false);
});

it.each(['feedbackComments', 'feedbackStatusChanges'] as const)('independently suppresses %s', async (event) => {
  const user = `recipient-${event}`;
  await saveTaskNotificationSettings(user, { ...reminders, events: { [event]: false } });
  const feedback = await createFeedback(user, 'Author', { type: 'feature', title: event, description: 'Test' });
  await addComment(feedback.id, 'actor', 'Actor', 'Hello');
  await markFeedbackComplete('actor', feedback.id, true, 'Actor');
  const notifications = await listNotifications(user);
  expect(notifications.map((n) => n.type)).toEqual([event === 'feedbackComments' ? 'feedback_status' : 'feedback_comment']);
  expect(sendPushToUser).toHaveBeenCalledTimes(1);
  const other: keyof NotificationEventSettings = event === 'feedbackComments' ? 'feedbackStatusChanges' : 'feedbackComments';
  await saveTaskNotificationSettings(user, { ...reminders, events: { [other]: false } });
  expect(await listNotifications(user)).toEqual([]);
});

it('persists preferences through the authenticated settings endpoint', async () => {
  const settings = { ...reminders, events: { ownTaskCompletions: false, taskComments: false } };
  const response = await PUT(new Request('http://localhost/api/tasks/notification-settings', {
    method: 'PUT', body: JSON.stringify(settings),
  }));
  expect(response.status).toBe(200);
  expect((await (await GET()).json()).settings.events).toMatchObject(settings.events);
});

it('persists deadline timing and all three Roadmap preferences', async () => {
  const settings = { ...reminders, deadlineNotifyBefore: '7d', events: {
    deadlinesApproaching: false, deadlinesMissed: false, milestonesAchieved: false,
  } };
  const response = await PUT(new Request('http://localhost/api/tasks/notification-settings', {
    method: 'PUT', body: JSON.stringify(settings),
  }));
  expect(response.status).toBe(200);
  expect((await (await GET()).json()).settings).toMatchObject(settings);
  await saveTaskNotificationSettings('settings-user', reminders);
  expect((await getTaskNotificationSettings('settings-user')).deadlineNotifyBefore).toBe('7d');
});

it.each(['2d', false, null, 7])('rejects invalid deadline reminder timing %j', async deadlineNotifyBefore => {
  const response = await PUT(new Request('http://localhost/api/tasks/notification-settings', {
    method: 'PUT', body: JSON.stringify({ ...reminders, deadlineNotifyBefore }),
  }));
  expect(response.status).toBe(400);
  expect(mockRows.size).toBe(0);
});

it.each([{ ownTaskCompletions: 'false' }, { unknown: false }, null, []])('rejects invalid event preferences %j', async (events) => {
  const response = await PUT(new Request('http://localhost/api/tasks/notification-settings', {
    method: 'PUT', body: JSON.stringify({ ...reminders, events }),
  }));
  expect(response.status).toBe(400);
  expect(mockRows.size).toBe(0);
});

it('requires authentication for reading and writing preferences', async () => {
  jest.mocked(getFrameworkSession).mockResolvedValueOnce({ isAuthenticated: false, userId: '', authMode: 'mock-cookie' });
  expect((await GET()).status).toBe(401);
  jest.mocked(getFrameworkSession).mockResolvedValueOnce({ isAuthenticated: false, userId: '', authMode: 'mock-cookie' });
  expect((await PUT(new Request('http://localhost'))).status).toBe(401);
});
