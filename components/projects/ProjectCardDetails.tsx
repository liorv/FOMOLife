import type { ProjectItem } from '@myorg/types';
import { buildProjectStatus } from '@/lib/projects/status';
import { getProjectCardSummary } from '@/lib/projects/cardSummary';
import styles from './ProjectCardDetails.module.css';

function calendarDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function dateLabel(value: string, today: Date) {
  const date = calendarDate(value);
  if (date.getTime() === today.getTime()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export default function ProjectCardDetails({ project, now = new Date() }: {
  project: ProjectItem;
  now?: Date;
}) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const inSeven = new Date(today);
  inSeven.setDate(today.getDate() + 7);
  const tasks = project.subprojects.flatMap(section => section.tasks);
  const unfinished = tasks.filter(task => !task.done);
  const completed = tasks.length - unfinished.length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const report = project.projectManagementEnabled ? buildProjectStatus(project, now) : null;
  const readyIds = report ? new Set(report.tasks.filter(task =>
    task.eligible && task.status !== 'blocked',
  ).map(task => task.id)) : null;
  const next = unfinished.filter(task => !readyIds || readyIds.has(task.id))
    .sort((a, b) => (a.dueDate?.slice(0, 10) ?? '9999').localeCompare(b.dueDate?.slice(0, 10) ?? '9999'))
    .slice(0, 2);
  const summary = getProjectCardSummary(project, now);
  const overdue = summary.overdueTasks;
  const upcoming = unfinished.filter(task => {
    if (!task.dueDate) return false;
    const date = calendarDate(task.dueDate);
    return date >= today && date <= inSeven;
  }).length;
  const health = report && tasks.length ? report.status === 'complete' ? 'Complete'
    : report.scheduleHealth === 'behind' ? 'Behind'
    : report.scheduleHealth === 'on_track' ? 'On track' : 'Not started' : null;
  const members = project.members ?? [];

  return (
    <div className={styles.details}>
      {project.goal?.trim() && <p className={styles.goal} title={project.goal}>{project.goal}</p>}
      {tasks.length > 0 ? (
        <div className={styles.progressRow}>
          <div className={styles.progress} role="progressbar" aria-label={`${project.text} progress`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
            aria-valuetext={`${completed} of ${tasks.length} tasks done`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <span>{completed}/{tasks.length} done</span>
        </div>
      ) : <p className={styles.empty}>No tasks yet</p>}
      {!project.archived && (
        <div className={styles.attention}>
          {summary.blocked && <span className={styles.badge}>Blocked</span>}
          {summary.overdue && <span className={styles.badge}>Overdue</span>}
          {overdue > 0 && <span className={styles.warning}>{overdue} overdue</span>}
          {upcoming > 0 && <span>{upcoming} due in 7 days</span>}
          {summary.blockedTasks > 0 && (
            <span className={styles.warning}>{summary.blockedTasks} blocked</span>
          )}
          {health && <span className={health === 'Behind' ? styles.warning : styles.health}>{health}</span>}
        </div>
      )}
      <div className={styles.next}>
        <span className={styles.label}>{project.archived ? 'Archived' : 'Next up'}</span>
        {project.archived ? <p className={styles.empty}>Restore this project to continue.</p>
          : next.length ? (
            <ul>
              {next.map(task => (
                <li key={task.id}>
                  <span className={styles.bullet} aria-hidden="true">&bull;</span>
                  <span className={styles.taskName} title={task.text}>{task.text}</span>
                  {task.dueDate && <time dateTime={task.dueDate.slice(0, 10)}
                    className={calendarDate(task.dueDate) < today ? styles.warning : undefined}>
                    {dateLabel(task.dueDate, today)}
                  </time>}
                </li>
              ))}
            </ul>
          ) : <p className={styles.empty}>{!tasks.length ? 'Add a task to get started.'
            : !unfinished.length ? 'All tasks complete.'
            : 'Waiting on prerequisites or blocked work.'}</p>}
      </div>
      {(members.length > 0 || project.dueDate) && (
        <div className={styles.footer}>
          <div className={styles.members} aria-label={members.length ? `${members.length} project members` : undefined}>
            {members.slice(0, 3).map(member => (
              <span key={member.userId} className={styles.avatar} title={member.name}>
                {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} />
                  : <span aria-label={member.name}>{member.name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()}</span>}
              </span>
            ))}
            {members.length > 3 && <span className={styles.moreMembers}
              title={members.slice(3).map(member => member.name).join(', ')}>+{members.length - 3}</span>}
          </div>
          {project.dueDate && <time dateTime={project.dueDate.slice(0, 10)}
            className={!project.archived && unfinished.length > 0 && calendarDate(project.dueDate) < today ? styles.warning : undefined}>
            Due {dateLabel(project.dueDate, today)}
          </time>}
        </div>
      )}
    </div>
  );
}
