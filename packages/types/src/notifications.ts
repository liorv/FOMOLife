/**
 * Task due-date notification types.
 *
 * Users can be notified when a task they created or are assigned to is
 * coming due. Reminder timing is configurable per category (tasks the user
 * created vs. tasks they're assigned to), and each notification can be
 * dismissed or rescheduled to fire again closer to the due date.
 */

/** How far before the due date a reminder should fire. */
export type TaskNotifyBefore = '7d' | '1d' | '0d' | 'off';

/** Which reminder milestone a given notification represents. */
export type TaskReminderStage = 'week' | 'day' | 'due';

export interface TaskNotificationCategorySettings {
  enabled: boolean;
  notifyBefore: TaskNotifyBefore;
}

/** Per-user notification preferences for task due-date reminders. */
export interface TaskNotificationSettings {
  /** Settings for tasks the user created/owns. */
  createdByMe: TaskNotificationCategorySettings;
  /** Settings for tasks the user is assigned to (project tasks). */
  assignedToMe: TaskNotificationCategorySettings;
}

export interface TaskDueNotification {
  id: string;
  type: 'task_due';
  taskId: string;
  taskTitle: string;
  /** ISO 8601 due date of the task. */
  dueDate: string;
  /** Present when the task belongs to a project. */
  projectId?: string;
  projectTitle?: string;
  /** Whether the recipient created this task or is assigned to it. */
  source: 'created' | 'assigned';
  stage: TaskReminderStage;
  createdAt: string;
  read: boolean;
  dismissed?: boolean;
}
