import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { withKeyedLock } from '@myorg/utils';
import type { NotificationEventSettings, TaskNotificationSettings } from '@myorg/types';

const storage = createStorageProvider();
const SETTINGS_KEY_PREFIX = '__task_notif_settings__';

export const DEFAULT_NOTIFICATION_EVENTS: NotificationEventSettings = {
  deadlinesApproaching: true,
  deadlinesMissed: true,
  milestonesAchieved: true,
  ownTaskCompletions: true,
  othersTaskCompletions: true,
  taskAssignments: true,
  projectComments: true,
  taskComments: true,
  feedbackComments: true,
  feedbackStatusChanges: true,
};

export const DEFAULT_TASK_NOTIFICATION_SETTINGS: TaskNotificationSettings = {
  deadlineNotifyBefore: '1d',
  createdByMe: { enabled: true, notifyBefore: '1d' },
  assignedToMe: { enabled: true, notifyBefore: '1d' },
  events: DEFAULT_NOTIFICATION_EVENTS,
};

export async function getTaskNotificationSettings(userId: string) {
  const persisted = await storage.load(`${SETTINGS_KEY_PREFIX}${userId}`);
  const settings = persisted?.settings as TaskNotificationSettings | undefined;
  return {
    deadlineNotifyBefore: settings?.deadlineNotifyBefore ?? '1d',
    createdByMe: { ...DEFAULT_TASK_NOTIFICATION_SETTINGS.createdByMe, ...settings?.createdByMe },
    assignedToMe: { ...DEFAULT_TASK_NOTIFICATION_SETTINGS.assignedToMe, ...settings?.assignedToMe },
    events: { ...DEFAULT_NOTIFICATION_EVENTS, ...settings?.events },
  };
}

export async function saveTaskNotificationSettings(userId: string, settings: TaskNotificationSettings): Promise<void> {
  await withKeyedLock(`notification-settings:${userId}`, async () => {
    const current = await getTaskNotificationSettings(userId);
    await storage.save(`${SETTINGS_KEY_PREFIX}${userId}`, {
      settings: { ...current, ...settings, events: { ...current.events, ...settings.events } },
    });
  });
}

export async function isNotificationEnabled(userId: string, event: keyof NotificationEventSettings): Promise<boolean> {
  return (await getTaskNotificationSettings(userId)).events[event];
}
