jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: (key: string) => mockLoad(key),
    save: (key: string, data: PersistedUserData) => mockSave(key, data),
  }),
}));
jest.mock('@/lib/server/webPush', () => ({ sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }) }));
jest.mock('@/lib/tasks/server/allUsersData', () => ({ listAllUsersData: jest.fn() }));

import type { PersistedUserData } from '@myorg/storage';
import { listAllUsersData } from '@/lib/tasks/server/allUsersData';
import { sendPushToUser } from '@/lib/server/webPush';
import {
  runTaskDueNotificationsJob, listTaskDueNotifications, rescheduleTaskNotification,
  saveTaskNotificationSettings,
} from '@/lib/tasks/server/taskNotificationsStore';
import { createTask, updateTask } from '@/lib/tasks/server/tasksStore';

const mockRows = new Map<string, PersistedUserData>();
const mockLoad = jest.fn(async (key: string) => mockRows.get(key) ?? null);
const mockSave = jest.fn(async (key: string, data: PersistedUserData) => { mockRows.set(key, data); });
const task = { id: 'task', text: 'Due task', dueDate: '2026-10-08', done: false };

describe('daily task reminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-07T13:00:00Z'));
    mockRows.clear();
    jest.clearAllMocks();
    jest.mocked(listAllUsersData).mockResolvedValue([{ userId: 'owner', data: { tasks: [{ ...task }] } }]);
  });
  afterEach(() => { jest.useRealTimers(); });

  it('sends the day-before reminder via push and does not repeat it on another run', async () => {
    expect(await runTaskDueNotificationsJob()).toEqual({ usersScanned: 1, notified: 1 });
    expect(sendPushToUser).toHaveBeenCalledWith('owner', expect.objectContaining({ title: 'Task due tomorrow', body: task.text }));
    expect(await runTaskDueNotificationsJob()).toEqual({ usersScanned: 1, notified: 0 });
  });

  it('resolves assigned tasks from shared-project references, including legacy owners', async () => {
    jest.mocked(listAllUsersData).mockResolvedValue([
      { userId: 'owner', data: { projects: [{
        id: 'project', text: 'Shared', members: [{ userId: 'assignee', name: 'Member' }],
        subprojects: [{ tasks: [{ ...task, people: [{ name: 'member' }] }] }],
      }] } },
      { userId: 'assignee', data: { sharedProjectRefs: [{ ownerUserId: 'owner', projectId: 'project' }] } },
    ]);
    expect((await runTaskDueNotificationsJob()).notified).toBe(2);
    expect(await listTaskDueNotifications('assignee')).toEqual([
      expect.objectContaining({ taskId: 'task', projectId: 'project', source: 'assigned' }),
    ]);
  });

  it('sends again for a changed due date', async () => {
    await runTaskDueNotificationsJob();
    jest.mocked(listAllUsersData).mockResolvedValue([{ userId: 'owner', data: { tasks: [{ ...task, dueDate: '2026-10-09' }] } }]);
    jest.setSystemTime(new Date('2026-10-08T13:00:00Z'));
    expect((await runTaskDueNotificationsJob()).notified).toBe(1);
  });

  it('honors a snooze even if that stage was already sent', async () => {
    await runTaskDueNotificationsJob();
    const [notification] = await listTaskDueNotifications('owner');
    if (!notification) throw new Error('Expected a reminder');
    await rescheduleTaskNotification('owner', notification.id, 'day');
    expect((await runTaskDueNotificationsJob()).notified).toBe(0);
    jest.advanceTimersByTime(60_001);
    expect((await runTaskDueNotificationsJob()).notified).toBe(1);
    expect((await runTaskDueNotificationsJob()).notified).toBe(0);
  });

  it('respects disabled reminders', async () => {
    await saveTaskNotificationSettings('owner', {
      createdByMe: { enabled: false, notifyBefore: '1d' },
      assignedToMe: { enabled: false, notifyBefore: '1d' },
    });
    expect((await runTaskDueNotificationsJob()).notified).toBe(0);
  });

  it.each(['7d', '0d'] as const)('honors the %s milestone', async (notifyBefore) => {
    await saveTaskNotificationSettings('owner', {
      createdByMe: { enabled: true, notifyBefore },
      assignedToMe: { enabled: false, notifyBefore: '1d' },
    });
    jest.mocked(listAllUsersData).mockResolvedValue([{ userId: 'owner', data: {
      tasks: [{ ...task, dueDate: notifyBefore === '7d' ? '2026-10-14' : '2026-10-07' }],
    } }]);
    expect((await runTaskDueNotificationsJob()).notified).toBe(1);
  });

  it('skips completed and overdue tasks', async () => {
    jest.mocked(listAllUsersData).mockResolvedValue([{ userId: 'owner', data: { tasks: [
      { ...task, done: true }, { ...task, id: 'past', dueDate: '2026-10-06' },
    ] } }]);
    expect((await runTaskDueNotificationsJob()).notified).toBe(0);
  });

  it('surfaces storage failures rather than reporting an empty successful scan', async () => {
    mockLoad.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(runTaskDueNotificationsJob()).rejects.toThrow('Storage unavailable');
  });

  it('serializes overlapping job runs to prevent duplicate reminders', async () => {
    const results = await Promise.all([runTaskDueNotificationsJob(), runTaskDueNotificationsJob()]);
    expect(results.reduce((sum, result) => sum + result.notified, 0)).toBe(1);
  });
});

describe('standalone completions', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('awaits push to the owner only for a newly completed task', async () => {
    const created = await createTask('completion-owner', { text: 'Finish' });
    await updateTask('completion-owner', created.id, { done: true });
    expect(sendPushToUser).toHaveBeenCalledWith('completion-owner', expect.objectContaining({
      title: 'Task completed', body: 'Finish',
    }));
    await updateTask('completion-owner', created.id, { text: 'Renamed' });
    await updateTask('completion-owner', created.id, { done: true });
    expect(sendPushToUser).toHaveBeenCalledTimes(1);
    await updateTask('completion-owner', created.id, { done: false });
    await updateTask('completion-owner', created.id, { done: true });
    expect(sendPushToUser).toHaveBeenCalledTimes(2);
  });
});
