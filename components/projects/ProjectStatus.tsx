'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectItem, ProjectScheduleHealth, ProjectTaskStatus, ProjectUpdateInput } from '@myorg/types';
import { applyTaskStatusUpdate, buildProjectStatus, getStatusUpdateTaskId, isActiveStatus, isTaskStatus, TASK_STATUSES } from '@/lib/projects/status';
import { generateId } from '@myorg/utils';
import CompletedTaskIcon from './CompletedTaskIcon';
import ProjectViewHelp from './ProjectViewHelp';
import tableStyles from './ProjectPlan.module.css';
import styles from './ProjectStatus.module.css';
import riskStyles from './ProjectRisks.module.css';

type Props = {
  project: ProjectItem;
  canManage: boolean;
  onSave?: (patch: ProjectUpdateInput) => Promise<ProjectItem>;
};

function StatusIcon({ status }: { status: ProjectTaskStatus | ProjectScheduleHealth }) {
  const paths = {
    not_started: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    in_progress: 'M12 3a9 9 0 1 0 9 9M12 7v5l3 2',
    blocked: 'M12 3 2 21h20L12 3Zm0 6v5m0 3v.5',
    complete: 'm7 12 3 3 7-7M21 12a9 9 0 1 1-5-8',
    on_track: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6',
    behind: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v6m0 4v.5',
  };
  return <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={paths[status]} />
  </svg>;
}

function StatusBadge({ status }: { status: ProjectTaskStatus }) {
  const definition = TASK_STATUSES.find(item => item.value === status);
  return <span className={`${styles.badge} ${styles[status]}`}>
    <StatusIcon status={status} />
    {definition?.label ?? 'On track'}
  </span>;
}

function HealthBadge({ health, inherited = false }: { health: ProjectScheduleHealth; inherited?: boolean }) {
  return <span className={`${styles.badge} ${styles[health]}`}>
    <StatusIcon status={health} />
    {health === 'behind' ? inherited ? 'Behind (prerequisite)' : 'Behind' : 'On track'}
  </span>;
}

export default function ProjectStatus({ project: incomingProject, canManage, onSave }: Props) {
  const [project, setProject] = useState(incomingProject);
  useEffect(() => { setProject(incomingProject); }, [incomingProject]);
  const [pending, setPending] = useState<Record<string, ProjectUpdateInput[]>>({});
  const taskSaves = useRef(new Map<string, Promise<void>>());
  const current = useMemo(() => buildProjectStatus({
    ...project,
    subprojects: project.subprojects.map(section => ({
      ...section,
      tasks: section.tasks.map(task => {
        return (pending[task.id] ?? []).reduce((updated, patch) => applyTaskStatusUpdate(updated, patch), task);
      }),
    })),
  }), [project, pending]);
  const [selectedDate, setSelectedDate] = useState('');
  const [recording, setRecording] = useState(false);
  const saving = recording || Object.keys(pending).length > 0;
  const [error, setError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);
  const snapshot = project.statusHistory?.find(row => row.date === selectedDate);
  const report = snapshot ?? current;
  const editable = canManage && !!onSave && !snapshot && !recording;
  const sections = [...new Map(report.tasks.map(task => [task.sectionId, task.section])).entries()];
  const history = useMemo(() => [...(project.statusHistory ?? [])].sort((a, b) => a.date.localeCompare(b.date)), [project.statusHistory]);
  const completedCount = report.tasks.filter(task => task.status === 'complete').length;
  const attention = report.tasks.filter(task => task.status === 'blocked' || (task.scheduleHealth === 'behind' && !task.inheritedBehind));
  const headline = report.tasks.length === 0 ? 'No tasks yet'
    : completedCount === report.tasks.length ? 'Project complete'
    : report.scheduleHealth === 'behind' || attention.length ? 'Behind'
    : report.scheduleHealth === 'on_track' || completedCount > 0 ? 'On track' : 'Not started';
  useEffect(() => {
    if (!selectedTaskId) return;
    const deselect = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !selectedRowRef.current?.contains(event.target)) setSelectedTaskId(null);
    };
    document.addEventListener('pointerdown', deselect);
    document.addEventListener('focusin', deselect);
    return () => {
      document.removeEventListener('pointerdown', deselect);
      document.removeEventListener('focusin', deselect);
    };
  }, [selectedTaskId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('project-view-active', { detail: 'status' }));
    return () => { window.dispatchEvent(new CustomEvent('project-view-active', { detail: null })); };
  }, []);

  async function save(patch: ProjectUpdateInput) {
    if (!onSave || !editable) return;
    const taskId = getStatusUpdateTaskId(patch);
    if (taskId) {
      setPending(previous => ({ ...previous, [taskId]: [...(previous[taskId] ?? []), patch] }));
    } else {
      if (saving) return;
      setRecording(true);
    }
    setError('');
    const persist = async () => {
      try {
        setProject(await onSave(patch));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Failed to save status. Please try again.');
      } finally {
        if (taskId) {
          setPending(previous => {
            const next = { ...previous };
            const remaining = (next[taskId] ?? []).slice(1);
            if (remaining.length) next[taskId] = remaining;
            else delete next[taskId];
            return next;
          });
        } else {
          setRecording(false);
        }
      }
    };
    if (taskId) {
      const previous = taskSaves.current.get(taskId);
      const request = previous ? previous.then(persist) : persist();
      taskSaves.current.set(taskId, request);
      await request;
      if (taskSaves.current.get(taskId) === request) taskSaves.current.delete(taskId);
    } else {
      await persist();
    }
  }

  return <div className={`${tableStyles.plan} ${styles.page}`}>
    <ProjectViewHelp view="status" />
    <div className={styles.heading}>
      <h2 className={styles.title}>Project Status</h2>
      {snapshot && <button type="button" className={styles.button} onClick={() => setSelectedDate('')}>Back to current status</button>}
    </div>
    {snapshot && <p className={styles.historical}>Read-only snapshot for {snapshot.date} (UTC) &mdash; {snapshot.projectName}</p>}
    <section className={`${styles.summary} ${headline === 'Behind' ? styles.needsAttention : report.scheduleHealth === 'on_track' || headline === 'Project complete' ? styles.healthy : ''}`} aria-label="Overall project status">
      <div className={styles.overviewHeading}>
        <div className={styles.headline}>
          <span className={styles.overviewIcon}><StatusIcon status={attention.length ? 'blocked' : headline === 'Project complete' ? 'complete' : report.scheduleHealth ?? report.status} /></span>
          <h3>{headline}</h3>
        </div>
        <span className={styles.completionCount}>{completedCount} / {report.tasks.length} tasks complete</span>
      </div>
      {report.forecast && <div className={styles.forecast}>
        <div><span>Earliest finish</span><strong>{report.forecast.earliestFinish ?? 'Not estimated'}</strong></div>
        <div><span>Added delay</span><strong>{report.forecast.earliestFinish ? `${report.forecast.delayDays} calendar days` : 'Not estimated'}</strong></div>
        {report.forecast.deadlines.map(deadline => <div key={`${deadline.label}:${deadline.date}`}>
          <span>{deadline.label} · {deadline.date}</span><strong className={deadline.daysLate > 0 ? styles.late : undefined}>
            {!report.forecast?.earliestFinish ? 'Needs estimate' : deadline.daysLate > 0 ? `${deadline.daysLate} days late` : 'Within deadline'}
          </strong>
        </div>)}
        <p className={styles.forecastBasis}>{report.forecast.error ?? (report.forecast.missingEffort
          ? `Set effort for ${report.forecast.missingEffort} unfinished tasks to estimate the finish.`
          : 'Effort = remaining calendar days. Independent work runs in parallel; recurring tasks are excluded. Only entered delays are included.')}</p>
      </div>}
      {!!attention.length && <ul className={styles.attentionList}>{attention.map(task => <li key={task.id}>
        <strong>{task.text}</strong><span>{task.status === 'blocked' ? 'Blocked' : 'Behind'}</span>
      </li>)}</ul>}
      {!!report.impact.downstreamTasks.length && <details className={styles.downstream}>
        <summary>{report.impact.downstreamTasks.length} dependent task{report.impact.downstreamTasks.length === 1 ? '' : 's'} affected</summary>
        <ul>{report.impact.downstreamTasks.map(task => <li key={task.id}>{task.text}</li>)}</ul>
      </details>}
    </section>
    {saving && <p className={styles.saving} role="status" aria-live="polite">Saving status...</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.scroll}>
      <table className={styles.table} aria-label="Task status">
        <thead><tr><th scope="col">Section / Task</th><th scope="col">Status</th><th scope="col">Schedule</th><th scope="col">Updates</th></tr></thead>
        <tbody>
          {sections.map(([sectionId, name]) => {
            const tasks = report.tasks.filter(task => task.sectionId === sectionId && task.eligible);
            if (!tasks.length) return null;
            return <React.Fragment key={sectionId}>
              <tr className={styles.sectionRow}><th scope="row" colSpan={4}><span className={styles.sectionName}>{name}</span></th></tr>
              {tasks.map(task => {
                const selected = selectedTaskId === task.id && canManage && !!onSave && !snapshot;
                const disabled = !editable || pending[task.id] !== undefined;
                return <tr key={task.id} ref={selected ? selectedRowRef : undefined}
                  className={selected ? styles.selectedRow : undefined}
                  tabIndex={canManage && onSave && !snapshot ? 0 : undefined}
                  aria-label={`Task status: ${task.text}`}
                  onClick={() => setSelectedTaskId(task.id)}
                  onFocus={() => setSelectedTaskId(task.id)}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTaskId(task.id); }
                    if (event.key === 'Escape') setSelectedTaskId(null);
                  }}>
                <th scope="row"><span className={styles.taskName}>{task.status === 'complete' && <CompletedTaskIcon />}{task.text}</span></th>
                <td>{canManage && onSave && !snapshot ? <div className={`${styles.statusControl} ${styles[task.status]}`}>
                  <StatusIcon status={task.status} />
                  <select aria-label={`Status for ${task.text}`} value={task.status} disabled={!editable || pending[task.id] !== undefined}
                    aria-busy={pending[task.id] !== undefined}
                    onChange={event => {
                      const status = event.target.value;
                      if (isTaskStatus(status)) void save({ taskStatusUpdate: { taskId: task.id, status } });
                    }}>
                    {TASK_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </div> : <StatusBadge status={task.status} />}</td>
                <td>{task.scheduleHealth ? editable && isActiveStatus(task.status) && !task.inheritedBehind ? <button
                  type="button" role="switch" aria-label={`On track for ${task.text}`}
                  aria-checked={task.scheduleHealth === 'on_track'} aria-busy={pending[task.id] !== undefined}
                  className={styles.healthSwitch} disabled={!editable}
                  onClick={() => void save({ taskScheduleUpdate: {
                    taskId: task.id, health: task.scheduleHealth === 'on_track' ? 'behind' : 'on_track',
                  } })}
                  onKeyDown={event => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    const health = event.key === 'ArrowLeft' ? 'behind' : 'on_track';
                    if (editable && task.scheduleHealth !== health) void save({ taskScheduleUpdate: { taskId: task.id, health } });
                  }}>
                  <span className={styles.healthThumb} aria-hidden="true" />
                  <span className={styles.healthLabel} aria-hidden="true">Behind</span>
                  <span className={styles.healthLabel} aria-hidden="true">On track</span>
                </button> : <HealthBadge health={task.scheduleHealth} inherited={task.inheritedBehind ?? false} /> : <span className={tableStyles.caption}>Not active</span>}
                {task.eligible && isActiveStatus(task.status) && !task.inheritedBehind && task.scheduleHealth === 'behind' && <label className={styles.delayInput}>
                  Delay days
                  <input type="number" min="0" max="36500" step="any" aria-label={`Delay days for ${task.text}`}
                    key={`${task.id}:${task.delayDays ?? 0}`} defaultValue={task.delayDays ?? 0} disabled={!editable}
                    onBlur={event => {
                      const days = event.currentTarget.valueAsNumber;
                      if (!Number.isFinite(days) || days < 0 || days > 36500) { setError('Delay must be between 0 and 36500 calendar days.'); return; }
                      if (days !== (task.delayDays ?? 0)) void save({ taskDelayUpdate: { taskId: task.id, days } });
                    }}
                    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
                </label>}
                </td>
                <td>
                  {!!task.statusUpdates?.length && <ul className={riskStyles.mitigations} aria-label={`Updates for ${task.text}`}>
                  {task.statusUpdates.map(update => <li key={update.id}>
                    <span className={`${riskStyles.mitigationBullet} ${selected ? riskStyles.tag : ''}`}>
                      <span>{update.text}</span>
                      {selected && <button type="button" className={riskStyles.removeMitigation} disabled={disabled}
                        aria-label={`Remove update: ${update.text} (${task.text})`}
                        onClick={() => void save({ taskStatusNote: { taskId: task.id, action: 'remove', updateId: update.id } })}>&times;</button>}
                    </span>
                  </li>)}
                  </ul>}
                  {selected && <form className={riskStyles.quickAdd} aria-label={`Add update for ${task.text}`}
                  onSubmit={event => {
                    event.preventDefault();
                    if (!editable) return;
                    const form = event.currentTarget;
                    const text = String(new FormData(form).get('update') ?? '').trim();
                    if (!text) { setError('Enter update text before saving.'); return; }
                    void save({ taskStatusNote: { taskId: task.id, action: 'add', update: { id: generateId(), text } } });
                    form.reset();
                    form.querySelector('input')?.focus();
                  }}>
                  <input className={styles.updateInput} name="update" aria-label={`New update for ${task.text}`} placeholder="What is the update?"
                    maxLength={5000} disabled={!editable} onBlur={event => { event.currentTarget.value = ''; }}
                    onKeyDown={event => {
                      if (event.key === 'Escape') { event.stopPropagation(); event.currentTarget.value = ''; event.currentTarget.blur(); setSelectedTaskId(null); }
                    }} />
                  </form>}
                  {!task.statusUpdates?.length && !selected && <span className={tableStyles.caption}>No updates</span>}
                </td>
              </tr>;
              })}
            </React.Fragment>;
          })}
          {!report.tasks.some(task => task.eligible) && <tr><td colSpan={4}><p>No completed or ready-to-start tasks.</p></td></tr>}
        </tbody>
      </table>
    </div>
    <h3 className={styles.historyTitle}>Status history</h3>
    <div className={styles.historyContainer}>
      <table className={`${styles.history} ${styles.table}`} aria-label="Status history">
        <thead><tr><th scope="col">Date (UTC)</th><th scope="col">Status</th><th scope="col">Summary / impact</th><th scope="col">Updated by</th></tr></thead>
        <tbody>
          {[...history].reverse().map(row => <tr key={row.date}>
            <td><button type="button" className={styles.dateButton} aria-pressed={selectedDate === row.date}
              onClick={() => setSelectedDate(row.date)}>{row.date}</button><small>{row.updatedAt.slice(11, 19)} UTC</small></td>
            <td>{row.status === 'complete' ? <StatusBadge status="complete" />
              : row.scheduleHealth ? <HealthBadge health={row.scheduleHealth} />
                : row.status === 'blocked' ? <HealthBadge health="behind" />
                  : row.status === 'in_progress' || row.status === 'on_track' ? <HealthBadge health="on_track" />
                    : <span>Not started</span>}</td>
            <td>{row.forecast?.earliestFinish ? <>Earliest finish: {row.forecast.earliestFinish}<small>{row.forecast.delayDays} calendar days added delay</small>
              {row.forecast.deadlines.filter(deadline => deadline.daysLate > 0).map(deadline => <small key={`${deadline.label}:${deadline.date}`} className={styles.late}>{deadline.label}: {deadline.daysLate} days late</small>)}</>
              : <>{row.tasks.filter(task => task.status === 'complete').length} / {row.tasks.length} tasks complete
                <small>{row.forecast ? 'Finish not estimated' : 'Forecast not recorded'}</small></>}</td>
            <td>{project.members?.find(member => member.userId === row.updatedBy)?.name ?? row.updatedBy}</td>
          </tr>)}
          {!project.statusHistory?.length && <tr><td colSpan={4}>No status updates recorded yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
