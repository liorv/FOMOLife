import React, { useState, useEffect } from "react";

export default function TaskEditor({
  task,
  onSave,
  onClose,
  onUpdateTask = () => {},
  allPeople = [],
  onOpenPeople = () => {},
  onCreatePerson = () => {},
  inline = false,
}) {
  // --- State ---------------------------------------------------------------

  const [title, setTitle] = useState(task.text || "");
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");

  // People assigned to this task – stored simply as [{name}].
  const initialPeople = (task.people || []).map((p) => ({
    name: typeof p === "string" ? p : p.name || p,
  }));
  const [people, setPeople] = useState(initialPeople);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  // Keep a ref to latest editable state so cleanup can persist on unmount
  const latestRef = React.useRef({
    title: task.text || "",
    description: task.description || "",
    dueDate: task.dueDate || "",
    people: initialPeople,
  });
  useEffect(() => {
    latestRef.current = { title, description, dueDate, people };
  }, [title, description, dueDate, people]);

  useEffect(() => {
    // reset keyboard focus whenever the query changes
    setActiveSuggestion(-1);
  }, [searchQuery]);

  // persist latest edits when editor unmounts (e.g. user switches tasks)
  useEffect(() => {
    return () => {
      const {
        title: latestTitle,
        description: latestDesc,
        dueDate: latestDate,
        people: latestPeople,
      } = latestRef.current;
      const normalized = latestPeople.map((p) => ({ name: p.name }));
      onUpdateTask({
        ...task,
        text: latestTitle,
        description: latestDesc,
        dueDate: latestDate || null,
        people: normalized,
      });
    };
  }, []);

  // --- People handlers ---------------------------------------------------

  const handleAddFromAll = (person) => {
    if (people.find((p) => p.name === person.name)) return;
    setPeople([...people, { name: person.name }]);
    setSearchQuery("");
  };

  // Create a new person locally and persist via the parent callback.
  const handleCreateAndAdd = (name) => {
    const created = { name };
    setPeople((prev) =>
      prev.find((p) => p.name === created.name) ? prev : [...prev, created],
    );
    setSearchQuery("");
    setActiveSuggestion(-1);
    const maybePromise = onCreatePerson(created);
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then((newPerson) => {
        if (newPerson && newPerson.id) {
          setPeople((prev) =>
            prev.map((p) => (p.name === newPerson.name ? { name: newPerson.name } : p)),
          );
        }
      });
    }
  };

  const handleRemovePerson = (name) => {
    setPeople(people.filter((person) => person.name !== name));
  };

  // --- Save / keyboard shortcuts ------------------------------------------

  const saveToParent = (closeAfter = false) => {
    const normalizedPeople = people.map((p) => ({ name: p.name }));
    const updated = {
      ...task,
      text: title,
      description,
      people: normalizedPeople,
      dueDate: dueDate || null,
    };
    onUpdateTask(updated);
    if (closeAfter) onSave(updated);
  };

  const handleSaveAndClose = () => saveToParent(true);

  // Keyboard shortcuts: Esc → close, Ctrl/Cmd+Enter → save & close
  useEffect(() => {
    const onKey = (e) => {
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
  }, [searchQuery, description, people]);

  // --- Render ---

  const containerClass = inline ? "inline-editor" : "side-editor";

  return (
    <div className={containerClass} style={{ overflow: 'auto' }}>
      {!inline && <h2>Edit Task</h2>}
      <div className="editor-columns">
        <div className="left-column">
          <div className="editor-section date-section">
            <label htmlFor="task-date" className="desc-label">
              Due date
            </label>
            <input
              id="task-date"
              type="date"
              className="due-date-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="editor-section desc-section">
            <label htmlFor="task-desc" className="desc-label">
              Notes
            </label>
            <textarea
              id="task-desc"
              className="task-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="right-column">
          <div className="editor-section people-section">
            <label>Owners</label>
            <div className="people-list task-person-list">
              {people.map((p) => (
                <div key={p.name} className="task-person-row">
                  <div className="task-person-col name">
                    <div className="owner-avatar">
                      {(p.name || "?")
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <strong className="person-name">{p.name}</strong>
                  </div>
                  <div className="task-person-col actions">
                    <button
                      className="remove-btn"
                      onClick={() => handleRemovePerson(p.name)}
                      aria-label={`Remove ${p.name}`}
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="add-person-bar" style={{ position: "relative" }}>
              <input
                id={`person-search-${task && task.id ? task.id : "editor"}`}
                name="personSearch"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people to add (type to find)"
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
                      if (matches.length > 0) {
                        handleAddFromAll(matches[activeSuggestion]);
                      } else {
                        handleCreateAndAdd(q);
                      }
                      setActiveSuggestion(-1);
                      return;
                    }

                    // No highlighted item — match or create
                    const exact = allPeople.find(
                      (p) => p.name.toLowerCase() === q.toLowerCase(),
                    );
                    if (exact) handleAddFromAll(exact);
                    else handleCreateAndAdd(q);
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

                  // render a floating dropdown only when we have multiple matches
                  if (matches.length > 0) {
                    return (
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
                  }

                  // no matches — show inline "Add" row (avoid floating box / scrollbars)
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
                      onClick={() => handleCreateAndAdd(newName)}
                    >
                      <div className="task-person-col name">
                        <strong>Add “{newName}”</strong>
                      </div>
                      <div
                        className="task-person-col methods"
                        style={{ color: "#7b8ca7" }}
                      >
                        create and add to task
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
