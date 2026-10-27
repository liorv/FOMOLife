import React, { useState, useEffect, useCallback } from "react";
import type { ProjectTask, ProjectTaskPerson, Contact, TaskRecurrence } from "@myorg/types";
import ModalOverlay from "../ModalOverlay";
import styles from "./TaskModal.module.css";

export interface TaskEditorProps {
  task: ProjectTask;
  onSave: (task: ProjectTask) => void;
  onClose: () => void;
  onUpdateTask?: (task: ProjectTask) => void;
  allPeople?: Contact[];
  onOpenPeople?: () => void;
  onCreatePerson?: (person: { name: string }) => Contact | Promise<Contact | void> | void;
  dialogTitle?: string;
  dialogDescription?: string;
  beforeFields?: React.ReactNode;
  footer?: React.ReactNode;
  disabled?: boolean;
  closeOnSave?: boolean;
}

interface PersonEntry {
  name: string;
}

export default function TaskEditor({
  task,
  onSave,
  onClose,
  onUpdateTask = () => {},
  allPeople = [],
  dialogTitle = "Edit task",
  dialogDescription = "Update task details, schedule, and who will complete this task.",
  beforeFields,
  footer,
  disabled = false,
  closeOnSave = true,
}: TaskEditorProps) {
  // --- State ---------------------------------------------------------------

  const [title, setTitle] = useState(task.text || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [recurrence, setRecurrence] = useState<TaskRecurrence | "">(task.recurrence || "");
  const [recurrenceAnchorDate, setRecurrenceAnchorDate] = useState(task.recurrenceAnchorDate || task.dueDate || "");
  const [effort, setEffort] = useState<number | null | undefined>(task.effort);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // People assigned to this task – stored simply as [{name}].
  const initialPeople: PersonEntry[] = (task.people || []).map((p) => ({
    name: typeof p === "string" ? p : p.name || "",
  }));
  const [people, setPeople] = useState<PersonEntry[]>(initialPeople);

  useEffect(() => {
    setTitle(task.text || "");
  }, [task.id, task.text]);
  useEffect(() => {
    setDueDate(task.dueDate || "");
  }, [task.id, task.dueDate]);
  useEffect(() => {
    setRecurrence(task.recurrence || "");
    setRecurrenceAnchorDate(task.recurrenceAnchorDate || task.dueDate || "");
  }, [task.id, task.recurrence, task.recurrenceAnchorDate, task.dueDate]);
  useEffect(() => {
    setEffort(task.effort);
  }, [task.id, task.effort]);
  useEffect(() => {
    setPeople((task.people || []).map(p => ({
      name: typeof p === "string" ? p : p.name || "",
    })));
  }, [task.id, task.people]);

  // --- People handlers ---------------------------------------------------

  const handleAddFromAll = (person: Contact) => {
    if (people.find((p) => p.name === person.name)) return;
    const newPeople = [...people, { name: person.name }];
    setPeople(newPeople);
    onUpdateTask({ ...task, people: newPeople });
  };

  const handleRemovePerson = (name: string) => {
    const newPeople = people.filter((person) => person.name !== name);
    setPeople(newPeople);
    onUpdateTask({ ...task, people: newPeople });
  };

  // --- Save / keyboard shortcuts ------------------------------------------

  const saveToParent = useCallback((closeAfter = false) => {
    const normalizedPeople: ProjectTaskPerson[] = people.map((p) => ({ name: p.name }));
    const updated: ProjectTask = {
      ...task,
      text: title,
      people: normalizedPeople,
      effort: effort !== undefined ? effort : null,
      dueDate: dueDate || null,
      recurrence: recurrence || null,
      recurrenceAnchorDate: recurrence ? recurrenceAnchorDate || dueDate || null : null,
    };
    onUpdateTask(updated);
    if (closeAfter) onSave(updated);
  }, [task, title, people, effort, dueDate, recurrence, recurrenceAnchorDate, onUpdateTask, onSave]);

  const finishAndClose = useCallback(() => {
    if (closeOnSave) saveToParent(true);
    onClose();
  }, [closeOnSave, onClose, saveToParent]);

  const saveAndClose = useCallback(() => {
    saveToParent(true);
    if (closeOnSave) onClose();
  }, [closeOnSave, onClose, saveToParent]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    titleInputRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        saveAndClose();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        finishAndClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishAndClose, saveAndClose]);

  // --- Render ---

  // unique ids for inputs (avoid duplicates when multiple editors are mounted)
  const editorId = React.useId();
  const dateId = `task-date-${task.id || 'editor'}-${editorId}`;
  const titleId = `task-title-${task.id || 'editor'}-${editorId}`;
  const recurrenceId = `task-recurrence-${task.id || 'editor'}-${editorId}`;
  const effortId = `task-effort-${task.id || 'editor'}-${editorId}`;
  const headingId = `task-editor-heading-${task.id || 'editor'}-${editorId}`;

  const fields = (
    <div className={styles.fields}>

        {/* Task title */}
        <div className={`${styles.field} ${styles.titleField}`}>
          <label htmlFor={titleId} className={styles.label}>Task</label>
          <div className={styles.inputWrap}>
            <input
              id={titleId}
              ref={titleInputRef}
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onUpdateTask({ ...task, text: e.target.value });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              aria-label="Task title"
            />
          </div>
        </div>

        {/* Effort */}
        <div className={`${styles.field} ${styles.effortField}`}>
          <label htmlFor={effortId} className={styles.label}>
            <span className={`material-icons ${styles.labelIcon}`}>schedule</span>
            Effort
          </label>
          <div className={styles.inputWrap}>
            <input
              id={effortId}
              type="number"
              min="0"
              step="0.5"
              className={`${styles.input} ${styles.shortInput}`}
              value={effort ?? ''}
              placeholder="days"
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                setEffort(val);
                onUpdateTask({ ...task, effort: val });
              }}
            />
          </div>
        </div>

        {/* Due Date */}
        <div className={styles.field}>
          <label htmlFor={dateId} className={styles.label}>
            <span className={`material-icons ${styles.labelIcon}`}>event</span>
            Due date
          </label>
          <div className={styles.inputWrap}>
            <input
              id={dateId}
              type="date"
              className={styles.input}
              value={dueDate}
              onChange={(e) => {
                const newValue = e.target.value;
                setDueDate(newValue);
                if (recurrence) setRecurrenceAnchorDate(newValue);
                onUpdateTask({
                  ...task,
                  dueDate: newValue || null,
                  ...(recurrence ? { recurrenceAnchorDate: newValue || null } : {}),
                });
              }}
            />
          </div>
        </div>

        {/* Repeat */}
        <div className={styles.field}>
          <label htmlFor={recurrenceId} className={styles.label}>
            <span className={`material-icons ${styles.labelIcon}`}>repeat</span>
            Repeat
          </label>
          <div className={styles.inputWrap}>
            <select
              id={recurrenceId}
              className={styles.input}
              value={recurrence}
              aria-label="Repeat"
              onChange={(e) => {
                const value = e.target.value as TaskRecurrence | "";
                setRecurrence(value);
                const anchorDate = value ? dueDate : "";
                setRecurrenceAnchorDate(anchorDate);
                onUpdateTask({
                  ...task,
                  recurrence: value || null,
                  recurrenceAnchorDate: anchorDate || null,
                });
              }}
            >
              <option value="">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Task assignees */}
        <div className={`${styles.field} ${styles.ownersField}`}>
          <label className={styles.label}>
            <span className={`material-icons ${styles.labelIcon}`}>group</span>
            Assigned to
          </label>
          <p className={styles.assignmentHint}>Select the person responsible for completing this task.</p>
          {allPeople.length > 0 ? (
            <div className="member-avatar-picker">
              {allPeople.map((p) => {
                const isAssigned = people.some(
                  (pp) => pp.name.toLowerCase() === p.name.toLowerCase(),
                );
                const initials = p.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <button
                    key={p.name}
                    type="button"
                    className={`member-avatar-btn${isAssigned ? ' member-avatar-btn--active' : ''}`}
                    title={p.name}
                    data-name={p.name}
                    onClick={() =>
                      isAssigned
                        ? handleRemovePerson(p.name)
                        : handleAddFromAll(p)
                    }
                  >
                    {(p as any).avatarUrl ? (
                      <img
                        src={(p as any).avatarUrl}
                        alt={p.name}
                        className="member-avatar-img"
                      />
                    ) : (
                      <span className="member-avatar-initials">{initials}</span>
                    )}
                    {isAssigned && (
                      <span className="member-avatar-check material-icons">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="people-empty-hint">
              Invite members to assign someone to complete this task.
            </p>
          )}
        </div>

    </div>
  );

  return (
    <ModalOverlay
      open
      onClose={finishAndClose}
      className={styles.overlay}
      contentClassName={styles.dialog}
      contentRef={dialogRef}
      ariaLabelledby={headingId}
    >
      <div
        onKeyDown={event => {
          if (event.key !== "Tab") return;
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:enabled, input:enabled, select:enabled, textarea:enabled',
          );
          const first = controls?.[0];
          const last = controls?.[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          } else if (!first) {
            event.preventDefault();
          }
        }}
      >
        <header className={styles.header}>
          <div>
            <h2 id={headingId}>{dialogTitle}</h2>
            <p>{dialogDescription}</p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close task editor"
            onClick={finishAndClose}
          >
            <span className="material-icons" aria-hidden="true">close</span>
          </button>
        </header>
        <fieldset className={styles.body} disabled={disabled}>
          {beforeFields}
          {fields}
        </fieldset>
        <footer className={styles.footer}>
          {footer ?? <button type="button" className={styles.done} onClick={saveAndClose}>Done</button>}
        </footer>
      </div>
    </ModalOverlay>
  );
}
