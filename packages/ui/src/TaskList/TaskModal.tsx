import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | null | undefined>(task.priority);
  const [effort, setEffort] = useState<number | null | undefined>(task.effort);

  // People assigned to this task – stored simply as [{name}].
  const initialPeople: PersonEntry[] = (task.people || []).map((p) => ({
    name: typeof p === "string" ? p : p.name || "",
  }));
  const [people, setPeople] = useState<PersonEntry[]>(initialPeople);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const barRef = React.useRef<HTMLInputElement | null>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  // Keep a ref to track if component is mounted (for Strict Mode double-mount handling)
  const isMountedRef = React.useRef(true);

  // Keep a ref to latest editable state so cleanup can persist on unmount
  const latestRef = React.useRef({
    title: task.text || "",
    description: task.description || "",
    dueDate: task.dueDate || "",
    priority: task.priority,
    effort: task.effort,
    people: initialPeople,
  });
  useEffect(() => {
    latestRef.current = { title, description, dueDate, priority, effort, people };
  }, [title, description, dueDate, priority, effort, people]);

  // Sync local state with prop changes (handles external updates)
  useEffect(() => {
    setTitle(task.text || "");
    setDescription(task.description || "");
    setDueDate(task.dueDate || "");
    setPriority(task.priority);
    setEffort(task.effort);
    setEffort(task.effort);
    const newPeople: PersonEntry[] = (task.people || []).map((p) => ({
      name: typeof p === "string" ? p : p.name || "",
    }));
    setPeople(newPeople);
  }, [task.id, task.text, task.description, task.dueDate, task.priority, task.effort, JSON.stringify(task.people)]);

  useEffect(() => {
    // reset keyboard focus whenever the query changes
    setActiveSuggestion(-1);
    updatePortalPosition();
  }, [searchQuery]);

  const updatePortalPosition = () => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setPortalStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 300,
      });
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', updatePortalPosition, true);
    window.addEventListener('resize', updatePortalPosition);
    return () => {
      window.removeEventListener('scroll', updatePortalPosition, true);
      window.removeEventListener('resize', updatePortalPosition);
    };
  }, []);

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
        description: latest.description,
        dueDate: latest.dueDate || null,
        priority: latest.priority ? latest.priority : null,
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
    setSearchQuery("");
    onUpdateTask({ ...task, people: newPeople });
  };

  // Create a new person locally and persist via the parent callback.
  const handleCreateAndAdd = (name: string) => {
    const created = { name };
    const newPeople = (prev: PersonEntry[]) =>
      prev.find((p) => p.name === created.name) ? prev : [...prev, created];
    setPeople(newPeople);
    setSearchQuery("");
    setActiveSuggestion(-1);
    // Update parent with new person added
    const updatedPeople = [...people, created];
    onUpdateTask({ ...task, people: updatedPeople });
    const maybePromise = onCreatePerson(created);
    if (maybePromise && typeof maybePromise === 'object' && 'then' in maybePromise) {
      (maybePromise as Promise<Contact | void>).then((newPerson) => {
        if (newPerson && newPerson.id) {
          setPeople((prev) =>
            prev.map((p) => (p.name === newPerson.name ? { name: newPerson.name } : p)),
          );
        }
      });
    }
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
      description,
      people: normalizedPeople,
      priority: priority ? priority : null,
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
        // if search is open, clear it first; otherwise close editor
        if (searchQuery.trim()) {
          setSearchQuery("");
          setActiveSuggestion(-1);
          return;
        }
        saveToParent(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchQuery, description, people, onSave, onUpdateTask, task]);

  // --- Render ---

  const containerClass = inline ? "inline-editor" : "side-editor";

  // unique ids for inputs (avoid duplicates when multiple editors are mounted)
  const dateId = `task-date-${task.id || 'editor'}`;
  const descId = `task-desc-${task.id || 'editor'}`;
  const peopleSearchId = `person-search-${task.id || 'editor'}`;

  return (
    <div className={containerClass}>
      {!inline && <h2>Edit Task</h2>}
      <div className="editor-columns">
        <div className="left-column">
              {/* use unique ids so multiple editors on the page won't clash */}
          <div className="editor-section priority-section">
            <label htmlFor={`task-priority-${task.id || 'editor'}`} className="desc-label">
              Priority
            </label>
            <select
              id={`task-priority-${task.id || 'editor'}`}
              className="priority-select"
              value={priority || ""}
              onChange={(e) => {
                const newValue = e.target.value as "low" | "medium" | "high" | "" | null;
                setPriority(newValue || undefined);
                const updatedTask = { ...task };
                if (newValue) {
                  updatedTask.priority = newValue as "low" | "medium" | "high";
                } else {
                  updatedTask.priority = null;
                }
                onUpdateTask(updatedTask);
              }}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', width: '100%', marginBottom: '16px', background: '#fff' }}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

          <div className="editor-section effort-section" style={{ marginTop: '16px' }}>
            <label htmlFor={`task-effort-${task.id || 'editor'}`} className="desc-label">
              Effort (Days)
            </label>
            <input
              id={`task-effort-${task.id || 'editor'}`}
              type="number"
              min="0"
              step="0.5"
              className="effort-input"
              value={effort || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                setEffort(val);
                const updatedTask = { ...task, effort: val };
                onUpdateTask(updatedTask);
              }}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', width: '100%', background: '#fff' }}
            />
          </div>


          <div className="editor-section effort-section" style={{ marginTop: '16px' }}>
            <label htmlFor={`task-effort-${task.id || 'editor'}`} className="desc-label">
              Effort (Days)
            </label>
            <input
              id={`task-effort-${task.id || 'editor'}`}
              type="number"
              min="0"
              step="0.5"
              className="effort-input"
              value={effort || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                setEffort(val);
                const updatedTask = { ...task, effort: val };
                onUpdateTask(updatedTask);
              }}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', width: '100%', background: '#fff' }}
            />
          </div>

          </div>

          <div className="editor-section date-section">
            <label htmlFor={dateId} className="desc-label">
              Due date
            </label>
            <input
              id={dateId}
              type="date"
              className="due-date-input"
              value={dueDate}
              onChange={(e) => {
                const newValue = e.target.value;
                setDueDate(newValue);
                onUpdateTask({ ...task, dueDate: newValue || null });
              }}
            />
          </div>

          <div className="editor-section desc-section">
            <label htmlFor={descId} className="desc-label">
              Notes
            </label>
            <textarea
              id={descId}
              className="task-description"
              value={description}
              onChange={(e) => {
                const newValue = e.target.value;
                setDescription(newValue);
                onUpdateTask({ ...task, description: newValue });
              }}
            />
          </div>
        </div>
        <div className="right-column">
          <div className="editor-section people-section">
            <label htmlFor={peopleSearchId}>Owners</label>
            <div className="people-list task-person-list">
              {people.map((p) => (
                <div key={p.name} className="person-chip small">
                  <span className="person-name">{p.name}</span>
                  <button
                    type="button"
                    className="btn-icon delete"
                    onClick={() => handleRemovePerson(p.name)}
                    aria-label={`Remove ${p.name}`}
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="add-person-bar">
              <input
                id={peopleSearchId}
                name="personSearch"
                ref={barRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                onKeyDown={(e) => {
                  const q = searchQuery.trim();
                  const lc = q.toLowerCase();
                  const matches = q
                    ? allPeople
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(lc) &&
                            !people.find(
                              (pp) =>
                                pp.name.toLowerCase() === p.name.toLowerCase(),
                            ),
                        )
                        .slice(0, 6)
                    : [];
                  const itemsCount =
                    matches.length > 0 ? matches.length : q ? 1 : 0;

                  if (e.key === "ArrowDown") {
                    if (!q || itemsCount === 0) return;
                    e.preventDefault();
                    setActiveSuggestion((prev) =>
                      prev >= itemsCount - 1 ? 0 : prev + 1,
                    );
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    if (!q || itemsCount === 0) return;
                    e.preventDefault();
                    setActiveSuggestion((prev) =>
                      prev <= 0 ? itemsCount - 1 : prev - 1,
                    );
                    return;
                  }
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    setActiveSuggestion(-1);
                    return;
                  }
                  if (e.key === "Enter") {
                    if (!q) return;
                    e.preventDefault();

                    if (activeSuggestion >= 0) {
                      if (matches.length > 0 && matches[activeSuggestion]) {
                        handleAddFromAll(matches[activeSuggestion]);
                      } else {
                        // // handleCreateAndAdd(q);
                      }
                      setActiveSuggestion(-1);
                      return;
                    }

                    // No highlighted item — match or create
                    const exact = allPeople.find(
                      (p) => p.name.toLowerCase() === q.toLowerCase(),
                    );
                    if (exact) handleAddFromAll(exact);
                    /* else no-op */
                  }
                }}
              />

              {searchQuery.trim() &&
                (() => {
                  const q = searchQuery.trim().toLowerCase();
                  const matches = allPeople
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(q) &&
                        !people.find(
                          (pp) =>
                            pp.name.toLowerCase() === p.name.toLowerCase(),
                        ),
                    )
                    .slice(0, 6);

                  // build dropdown or inline suggestion
                  if (matches.length > 0) {
                    const dropdown = (
                      <div
                        className="search-suggestions dropdown"
                        role="listbox"
                        aria-label="People suggestions"
                      >
                        {matches.map((p, i) => (
                          <div
                            key={p.name}
                            role="option"
                            aria-selected={activeSuggestion === i}
                            className={
                              activeSuggestion === i
                                ? "task-person-row suggestion-row active"
                                : "task-person-row suggestion-row"
                            }
                            onMouseEnter={() => setActiveSuggestion(i)}
                            onMouseLeave={() => setActiveSuggestion(-1)}
                            onClick={() => {
                              handleAddFromAll(p);
                              setActiveSuggestion(-1);
                            }}
                          >
                            <div className="task-person-col name">
                              <strong>{p.name}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                    // portal the floating dropdown so it can escape overflow
                    if (typeof document !== 'undefined') {
                      return createPortal(
                        <div style={{ ...portalStyle, background: '#fff' }}>{dropdown}</div>,
                        document.body,
                      );
                    }
                    return dropdown;
                  }

                  // inline suggestion (no matches) renders in-place with transparent background
                  const newName = searchQuery.trim();
                  return (
                    <div
                      role="option"
                      className={
                        activeSuggestion === 0
                          ? "suggestion-inline active"
                          : "suggestion-inline"
                      }
                      onMouseEnter={() => setActiveSuggestion(0)}
                      onMouseLeave={() => setActiveSuggestion(-1)}
                      /* onClick disabled */
                    >
                      <div className="task-person-col name">
                        <strong>"{newName}" not found</strong>
                      </div>
                      <div
                        className="task-person-col methods"
                      >
                        Must be invited first
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
