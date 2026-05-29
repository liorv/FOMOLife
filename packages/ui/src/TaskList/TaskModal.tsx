import React, { useState, useEffect } from "react";
import type { ProjectTask, ProjectTaskPerson, Contact } from "@myorg/types";

export interface TaskEditorProps {
  task: ProjectTask;
  onSave: (task: ProjectTask) => void;
  onClose: () => void;
  onUpdateTask?: (task: ProjectTask) => void;
  allPeople?: Contact[];
  onOpenPeople?: () => void;
  onCreatePerson?: (person: { name: string }) => Contact | Promise<Contact | void> | void;
  inline?: boolean;
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
  onOpenPeople = () => {},
  onCreatePerson = () => {},
  inline = false,
}: TaskEditorProps) {
  // --- State ---------------------------------------------------------------

  const [title, setTitle] = useState(task.text || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [effort, setEffort] = useState<number | null | undefined>(task.effort);

  // People assigned to this task – stored simply as [{name}].
  const initialPeople: PersonEntry[] = (task.people || []).map((p) => ({
    name: typeof p === "string" ? p : p.name || "",
  }));
  const [people, setPeople] = useState<PersonEntry[]>(initialPeople);

  // Keep a ref to latest editable state so cleanup can persist on unmount
  const latestRef = React.useRef({
    title: task.text || "",
    dueDate: task.dueDate || "",
    effort: task.effort,
    people: initialPeople,
  });
  useEffect(() => {
    latestRef.current = { title, dueDate, effort, people };
  }, [title, dueDate, effort, people]);

  // persist latest edits when editor unmounts (e.g. user switches tasks)
  // Use a flag to ensure cleanup only runs once (handles Strict Mode double-mount)
  const cleanupRanRef = React.useRef(false);

  useEffect(() => {
    return () => {
      // Prevent running twice in React 18 Strict Mode
      if (cleanupRanRef.current) return;
      cleanupRanRef.current = true;

      const latest = latestRef.current;
      const normalizedPeople = latest.people.map((p: PersonEntry) => ({ name: p.name }));
      // Build updated task from latest values, preserving original task properties
      const updatedTask = {
        ...task,
        text: latest.title,
        dueDate: latest.dueDate || null,
        effort: latest.effort !== undefined ? latest.effort : null,
        people: normalizedPeople,
      };
      onUpdateTask(updatedTask);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const saveToParent = (closeAfter = false) => {
    const normalizedPeople: ProjectTaskPerson[] = people.map((p) => ({ name: p.name }));
    const updated: ProjectTask = {
      ...task,
      text: title,
      people: normalizedPeople,
      effort: effort !== undefined ? effort : null,
      dueDate: dueDate || null,
    };
    onUpdateTask(updated);
    if (closeAfter) onSave(updated);
  };

  const handleSaveAndClose = () => saveToParent(true);

  // Keyboard shortcuts: Esc → close, Ctrl/Cmd+Enter → save & close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        saveToParent(true);
        return;
      }
      if (e.key === "Escape") {
        saveToParent(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [people, onSave, onUpdateTask, task]);

  // --- Render ---

  const containerClass = inline ? "inline-editor" : "side-editor";

  // unique ids for inputs (avoid duplicates when multiple editors are mounted)
  const dateId = `task-date-${task.id || 'editor'}`;
  const effortId = `task-effort-${task.id || 'editor'}`;

  return (
    <div className={containerClass}>
      {!inline && <h2>Edit Task</h2>}
      <div className="task-editor-fields">

        {/* Effort */}
        <div className="task-editor-field">
          <label htmlFor={effortId} className="task-editor-label">
            <span className="material-icons task-editor-label-icon">schedule</span>
            Effort
          </label>
          <div className="task-editor-input-wrap">
            <input
              id={effortId}
              type="number"
              min="0"
              step="0.5"
              className="task-editor-input task-editor-input--short"
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
        <div className="task-editor-field">
          <label htmlFor={dateId} className="task-editor-label">
            <span className="material-icons task-editor-label-icon">event</span>
            Due date
          </label>
          <div className="task-editor-input-wrap">
            <input
              id={dateId}
              type="date"
              className="task-editor-input"
              value={dueDate}
              onChange={(e) => {
                const newValue = e.target.value;
                setDueDate(newValue);
                onUpdateTask({ ...task, dueDate: newValue || null });
              }}
            />
          </div>
        </div>

        {/* Owners */}
        <div className="task-editor-field task-editor-field--owners">
          <label className="task-editor-label">
            <span className="material-icons task-editor-label-icon">group</span>
            Owners
          </label>
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
              Invite members to assign owners.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
