'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { ProjectDeadline, ProjectMilestone, ProjectTask } from '@myorg/types';
import { CheckeredFlag, ModalOverlay } from '@myorg/ui';
import { generateId } from '@myorg/utils';
import { isRoadmapDate } from '@/lib/projects/roadmapEvents';
import styles from './ProjectPlan.module.css';
import CompletedTaskIcon from './CompletedTaskIcon';

type Props = {
  milestones: ProjectMilestone[];
  deadlines: ProjectDeadline[];
  tasks: ProjectTask[];
  canManage: boolean;
  addingDeadline: boolean;
  onCloseDeadline: () => void;
  onAddMilestone: (trigger: HTMLButtonElement) => void;
  onAddDeadline: () => void;
  onMilestonesChange: (items: ProjectMilestone[]) => void;
  onDeadlinesChange: (items: ProjectDeadline[]) => void;
  onSelectDependency: (milestoneId: string, trigger: HTMLButtonElement) => void;
};

export default function RoadmapEventTables({ milestones, deadlines, tasks, canManage, addingDeadline,
  onCloseDeadline, onAddMilestone, onAddDeadline, onMilestonesChange, onDeadlinesChange, onSelectDependency }: Props) {
  const [clearing, setClearing] = useState<'Milestones' | 'Deadlines' | null>(null);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogTrigger = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const open = addingDeadline || !!clearing;
  useEffect(() => {
    if (!open) return;
    const trigger = dialogTrigger.current ?? document.activeElement;
    setError('');
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      else document.querySelector<HTMLButtonElement>('button[aria-label="Roadmap actions"]')?.focus();
      dialogTrigger.current = null;
    };
  }, [open]);

  function rename(value: string, save: (label: string) => void) {
    if (!value.trim()) { setError('A name is required.'); return; }
    setError('');
    save(value.trim());
  }
  function close() { setClearing(null); onCloseDeadline(); setError(''); }

  return <>
    {error && !open && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.tableHeading}>
      <h3 className={styles.sectionHeading}>Milestones</h3>
      {canManage && <div className={styles.tableActions}>
        <button type="button" className={`${styles.clearButton} ${styles.roadmapClearButton}`}
          onClick={event => onAddMilestone(event.currentTarget)}>
          <span className="material-icons" aria-hidden="true">star</span>Add Milestone
        </button>
        <button type="button" className={`${styles.clearButton} ${styles.roadmapClearButton}`} disabled={!milestones.length}
        onClick={event => { dialogTrigger.current = event.currentTarget; setClearing('Milestones'); }}>
        <span className="material-icons" aria-hidden="true">clear_all</span>Clear Milestones
      </button></div>}
    </div>
    <div className={styles.sequence}>
      <table className={styles.table} aria-label="Milestones">
        <thead><tr><th scope="col">Milestone</th><th scope="col">Dependent tasks</th>{canManage && <th scope="col"><span className={styles.srOnly}>Actions</span></th>}</tr></thead>
        <tbody>{milestones.map(milestone => <tr key={milestone.id}>
          <td>{canManage ? <input key={milestone.label} aria-label={`Milestone name: ${milestone.label}`} defaultValue={milestone.label}
            className={styles.eventInput} onBlur={event => rename(event.target.value, label => {
              if (label !== milestone.label) onMilestonesChange(milestones.map(item => item.id === milestone.id ? { ...item, label } : item));
            })} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> : milestone.label}</td>
          <td><ul className={styles.links}>{milestone.taskIds.map(id => <li key={id} className={styles.relationship}>
            <span className={styles.taskName}>
              {tasks.find(task => task.id === id)?.done && <CompletedTaskIcon />}
              <span>{tasks.find(task => task.id === id)?.text ?? 'Deleted task'}</span>
            </span>
            {canManage && milestone.taskIds.length > 1 && <button type="button" aria-label={`Remove ${tasks.find(task => task.id === id)?.text ?? 'deleted task'} from ${milestone.label}`}
              onClick={() => onMilestonesChange(milestones.map(item => item.id === milestone.id ? { ...item, taskIds: item.taskIds.filter(taskId => taskId !== id) } : item))}>&times;</button>}
          </li>)}</ul>
            {canManage && <button type="button" className={styles.addEventDependency}
              onClick={event => onSelectDependency(milestone.id, event.currentTarget)}>Add task to {milestone.label}</button>}
          </td>
          {canManage && <td className={styles.actions}><button type="button" aria-label={`Delete milestone ${milestone.label}`}
            onClick={() => onMilestonesChange(milestones.filter(item => item.id !== milestone.id))}>
            <span className="material-icons" aria-hidden="true">close</span>
          </button></td>}
        </tr>)}
          {!milestones.length && <tr><td colSpan={canManage ? 3 : 2}><p className={styles.empty}>No milestones.</p></td></tr>}
        </tbody>
      </table>
    </div>
    <div className={styles.tableHeading}>
      <h3 className={styles.sectionHeading}>Deadlines</h3>
      {canManage && <div className={styles.tableActions}>
        <button type="button" className={`${styles.clearButton} ${styles.roadmapClearButton}`}
          onClick={event => { dialogTrigger.current = event.currentTarget; onAddDeadline(); }}>
          <CheckeredFlag />Add Deadline
        </button>
        <button type="button" className={`${styles.clearButton} ${styles.roadmapClearButton}`} disabled={!deadlines.length}
        onClick={event => { dialogTrigger.current = event.currentTarget; setClearing('Deadlines'); }}>
        <span className="material-icons" aria-hidden="true">clear_all</span>Clear Deadlines
      </button></div>}
    </div>
    <div className={styles.sequence}>
      <table className={styles.table} aria-label="Deadlines">
        <thead><tr><th scope="col">Deadline</th><th scope="col">Date</th>{canManage && <th scope="col"><span className={styles.srOnly}>Actions</span></th>}</tr></thead>
        <tbody>{deadlines.map(deadline => <tr key={deadline.id}>
          <td>{canManage ? <input key={deadline.label} aria-label={`Deadline name: ${deadline.label}`} defaultValue={deadline.label}
            className={styles.eventInput} onBlur={event => rename(event.target.value, label => {
              if (label !== deadline.label) onDeadlinesChange(deadlines.map(item => item.id === deadline.id ? { ...item, label } : item));
            })} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /> : deadline.label}</td>
          <td>{canManage ? <input type="date" aria-label={`Deadline date: ${deadline.label}`} value={deadline.date}
            className={styles.eventInput} onChange={event => {
              if (!isRoadmapDate(event.target.value)) { setError('Choose a valid deadline date.'); return; }
              setError('');
              onDeadlinesChange(deadlines.map(item => item.id === deadline.id ? { ...item, date: event.target.value } : item));
            }} /> : deadline.date}</td>
          {canManage && <td className={styles.actions}><button type="button" aria-label={`Delete deadline ${deadline.label}`}
            onClick={() => onDeadlinesChange(deadlines.filter(item => item.id !== deadline.id))}>
            <span className="material-icons" aria-hidden="true">close</span>
          </button></td>}
        </tr>)}
          {!deadlines.length && <tr><td colSpan={canManage ? 3 : 2}><p className={styles.empty}>No deadlines.</p></td></tr>}
        </tbody>
      </table>
    </div>
    <ModalOverlay open={open && canManage} onClose={close} ariaLabelledby={titleId} contentClassName={styles.clearDialog}>
      <div ref={dialogRef} onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('input, button');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <h3 id={titleId}>{clearing ? `Clear all ${clearing.toLowerCase()}?` : 'Add Deadline'}</h3>
        {clearing ? <>
          <p>This removes all {clearing.toLowerCase()} from this project. Tasks and dependencies will not be deleted. This cannot be undone.</p>
          <div className={styles.clearDialogActions}>
            <button type="button" onClick={close}>Cancel</button>
            <button type="button" className={`${styles.clearButton} ${styles.roadmapClearButton}`} onClick={() => {
              if (clearing === 'Milestones') onMilestonesChange([]);
              else onDeadlinesChange([]);
              close();
            }}>Clear {clearing}</button>
          </div>
        </> : <form onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const label = String(data.get('label') ?? '').trim();
          const date = data.get('date');
          if (!label || !isRoadmapDate(date)) { setError('Enter a name and a valid deadline date.'); return; }
          onDeadlinesChange([...deadlines, { id: generateId(), label, date }]);
          close();
        }}>
          <label className={styles.eventField}>Name<input name="label" defaultValue="Deadline" required /></label>
          <label className={styles.eventField}>Date<input name="date" type="date" required /></label>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.clearDialogActions}>
            <button type="button" onClick={close}>Cancel</button>
            <button type="submit" className={styles.clearButton}>Add Deadline</button>
          </div>
        </form>}
      </div>
    </ModalOverlay>
  </>;
}
