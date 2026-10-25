import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { withKeyedLock } from '@myorg/utils';
import { getTaskNotificationSettings } from '../../server/notificationSettings';
import { isRoadmapDate } from '../roadmapEvents';
import { appendProjectNotification } from './projectCommentsStore';
import type { ProjectNotification } from './projectCommentsStore';
import type { ProjectItem } from './projectsStore';

const storage = createStorageProvider();
const DAY_MS = 86_400_000;

/** Calendar dates use UTC consistently, including the daily scheduler. */
export async function scanRoadmapNotifications(
  userId: string,
  projects: ProjectItem[],
  now = new Date(),
): Promise<number> {
  const eligible = projects.filter(project =>
    !project.archived && !project.isTemplate
    && (!project.members?.length || project.members.some(member => member.userId === userId))
    && (project.dueDate || project.deadlines?.length || project.milestones?.length),
  );
  if (!eligible.length) return 0;

  return withKeyedLock(`roadmap-notifications:${userId}`, async () => {
    const storageKey = `__roadmap_notif_state__${userId}`;
    const persisted = await storage.load(storageKey);
    const sent = new Set<string>(
      Array.isArray(persisted?.sent) ? persisted.sent.filter((key): key is string => typeof key === 'string') : [],
    );
    const settings = await getTaskNotificationSettings(userId);
    const today = Date.parse(now.toISOString().slice(0, 10));
    const timing = settings.deadlineNotifyBefore;
    const beforeDays = timing === '7d' ? 7 : timing === '0d' ? 0 : timing === 'off' ? null : 1;
    let notified = 0;

    const emit = async (
      project: ProjectItem,
      key: string,
      type: ProjectNotification['type'],
      title: string,
      text: string,
    ) => {
      if (sent.has(key)) return;
      const added = await appendProjectNotification(userId, {
        id: `roadmap:${key}`,
        type,
        threadId: `proj:${project.id}`,
        projectId: project.id,
        threadTitle: title,
        commentAuthorId: '',
        commentAuthorName: project.text,
        commentText: text,
        createdAt: now.toISOString(),
        read: false,
      });
      if (added) {
        sent.add(key);
        // Persist after each event so a later failure cannot replay earlier alerts.
        await storage.save(storageKey, { sent: [...sent] });
        notified += 1;
      }
    };

    for (const project of eligible) {
      const deadlines = [
        ...(project.deadlines ?? []).map(deadline => ({ ...deadline, key: `roadmap:${deadline.id}` })),
        ...(project.dueDate ? [{ key: 'project', label: project.text, date: project.dueDate.slice(0, 10) }] : []),
      ];
      for (const deadline of deadlines) {
        if (!isRoadmapDate(deadline.date)) {
          console.error('Invalid project deadline in notification scan:', project.id, deadline.key, deadline.date);
          continue;
        }
        const remaining = (Date.parse(deadline.date) - today) / DAY_MS;
        const key = JSON.stringify([project.id, deadline.key, deadline.date]);
        if (remaining < 0 && settings.events.deadlinesMissed) {
          await emit(project, `${key}:missed`, 'deadline_missed', 'Deadline missed',
            `"${deadline.label}" was due ${deadline.date} in ${project.text}.`);
        } else if (remaining >= 0 && beforeDays !== null && remaining <= beforeDays && settings.events.deadlinesApproaching) {
          await emit(project, `${key}:approaching`, 'deadline_approaching', 'Deadline approaching',
            `"${deadline.label}" is due ${remaining === 0 ? 'today' : `in ${remaining} day${remaining === 1 ? '' : 's'}`} (${deadline.date}) in ${project.text}.`);
        }
      }

      if (!settings.events.milestonesAchieved) continue;
      const tasks = new Map(project.subprojects.flatMap(section => section.tasks).map(task => [task.id, task]));
      for (const milestone of project.milestones ?? []) {
        if (!milestone.taskIds.length || !milestone.taskIds.every(id => tasks.get(id)?.done === true)) continue;
        const key = JSON.stringify([project.id, milestone.id, [...milestone.taskIds].sort()]);
        await emit(project, `${key}:achieved`, 'milestone_achieved', 'Milestone achieved',
          `"${milestone.label}" achieved in ${project.text}: all linked tasks are complete.`);
      }
    }
    return notified;
  });
}

export async function notifyRoadmapMembers(project: ProjectItem, ownerUserId: string): Promise<void> {
  const recipients = project.members?.length ? project.members.map(member => member.userId) : [ownerUserId];
  await Promise.all([...new Set(recipients)].map(userId => scanRoadmapNotifications(userId, [project])));
}
