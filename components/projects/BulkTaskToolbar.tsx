import React, { useId, useState } from 'react';
import type { Contact } from '@myorg/types';
import styles from './BulkTaskToolbar.module.css';

export type BulkTaskChange = { dueDate: string | null } | { person: Contact } | { complete: true };

interface Props {
  count: number;
  people: Contact[];
  saving: boolean;
  error: string;
  onApply: (change: BulkTaskChange) => Promise<void>;
  onSelectAll: () => void;
  onClear: () => void;
  onCancel: () => void;
}

export default function BulkTaskToolbar({ count, people, saving, error, onApply, onSelectAll, onClear, onCancel }: Props) {
  const [panel, setPanel] = useState<'date' | 'person' | null>(null);
  const [date, setDate] = useState('');
  const [person, setPerson] = useState<Contact | null>(null);
  const dateId = useId();
  const selectionTitleId = useId();
  const actionsTitleId = useId();
  const panelId = useId();
  const taskLabel = `${count} task${count === 1 ? '' : 's'}`;

  return (
    <div className={styles.bar} role="region" aria-label="Bulk task actions" aria-busy={saving}>
      <fieldset disabled={saving} className={styles.controls}>
        <legend className={styles.srOnly}>Edit multiple tasks</legend>
        <div className={styles.selection} role="group" aria-labelledby={selectionTitleId}>
          <div className={styles.header}>
            <div>
              <h3 id={selectionTitleId} className={styles.title}>Select tasks to edit</h3>
              <span className={styles.count} aria-live="polite">{count} selected</span>
            </div>
            <button type="button" className={styles.outlinedButton} onClick={onCancel}>Done</button>
          </div>
          <p className={styles.hint}>Click rows to select or deselect them. Selection does not complete tasks.</p>
          <div className={styles.selectionTools}>
            <button type="button" className={styles.textButton} onClick={onSelectAll}>Select all visible</button>
            <button type="button" className={styles.textButton} disabled={!count} onClick={onClear}>Clear selection</button>
          </div>
        </div>
        <div className={styles.editActions} role="group" aria-labelledby={actionsTitleId}>
          <h3 id={actionsTitleId} className={styles.sectionTitle}>Change selected tasks</h3>
          {!count && <p className={styles.hint}>Select at least one task to enable actions.</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.tonalButton} disabled={!count}
              aria-expanded={panel === 'date'} aria-controls={panel === 'date' && count > 0 ? panelId : undefined}
              onClick={() => setPanel(panel === 'date' ? null : 'date')}>
              <span className="material-icons" aria-hidden="true">event</span>
              Due date
            </button>
            <button type="button" className={styles.tonalButton} disabled={!count}
              aria-expanded={panel === 'person'} aria-controls={panel === 'person' && count > 0 ? panelId : undefined}
              onClick={() => setPanel(panel === 'person' ? null : 'person')}>
              <span className="material-icons" aria-hidden="true">person_add</span>
              Assign
            </button>
            <button type="button" className={styles.tonalButton} disabled={!count}
              onClick={() => void onApply({ complete: true })}>
              <span className="material-icons" aria-hidden="true">task_alt</span>
              Mark complete
            </button>
          </div>
        {panel === 'date' && count > 0 && (
          <div id={panelId} className={styles.panel}>
            <div className={styles.dateField}>
              <label htmlFor={dateId}>Due date for selected tasks</label>
              <input id={dateId} type="date" value={date} onChange={event => setDate(event.target.value)} />
            </div>
            <div className={styles.panelActions}>
            <button type="button" className={styles.textButton}
              onClick={() => void onApply({ dueDate: null })}>Clear due date on {taskLabel}</button>
            <button type="button" className={styles.filledButton} disabled={!date}
              onClick={() => void onApply({ dueDate: date })}>Set date on {taskLabel}</button>
            </div>
          </div>
        )}
        {panel === 'person' && count > 0 && (
          <div id={panelId} className={styles.panel}>
            <p>Add a project member without removing existing assignees.</p>
            {people.length ? (
              <>
                <div className="member-avatar-picker" role="group" aria-label="Assign a project member">
                  {people.map(member => (
                    <button key={member.id} type="button"
                      className={`member-avatar-btn${person?.id === member.id ? ' member-avatar-btn--active' : ''}`}
                      title={member.name} aria-label={member.name} aria-pressed={person?.id === member.id}
                      onClick={() => setPerson(member)}>
                      {member.avatarUrl
                        ? <img src={member.avatarUrl} alt="" className="member-avatar-img" />
                        : <span className="member-avatar-initials">{member.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span>}
                    </button>
                  ))}
                </div>
                <div className={styles.panelActions}>
                <button type="button" className={styles.filledButton} disabled={!person}
                  onClick={() => { if (person) void onApply({ person }); }}>
                  Add {person?.name ?? 'person'} to {taskLabel}
                </button>
                </div>
              </>
            ) : <p>Invite members to assign someone to these tasks.</p>}
          </div>
        )}
        </div>
      </fieldset>
      {saving && <p role="status">Saving task changes...</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  );
}
