type NotificationTarget =
  | { type: 'feedback_comment' | 'feedback_status'; feedbackId: string }
  | { type: 'project_comment' | 'task_completed' | 'task_assigned'; projectId: string; threadId: string; taskId?: string }
  | { type: 'task_due'; projectId?: string; taskId: string };

export function getNotificationUrl(notification: NotificationTarget): string {
  const params = new URLSearchParams();
  if (notification.type === 'feedback_comment' || notification.type === 'feedback_status') {
    params.set('tab', 'feedback');
    params.set('feedbackId', notification.feedbackId);
  } else if ('threadId' in notification) {
    params.set('tab', 'projects');
    params.set('projectId', notification.projectId);
    if (notification.type === 'project_comment') {
      params.set('threadId', notification.threadId);
    } else if (notification.taskId) {
      params.set('taskId', notification.taskId);
    }
  } else if (notification.type === 'task_due') {
    params.set('tab', notification.projectId ? 'projects' : 'tasks');
    if (notification.projectId) params.set('projectId', notification.projectId);
    params.set('taskId', notification.taskId);
  }
  return `/?${params.toString()}`;
}
