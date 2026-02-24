import React, { useState, useEffect, useRef } from "react";
import TaskList from "./components/TaskList";
import TabNav from "./components/TabNav";
import AddBar from "./components/AddBar";
import LogoBar from "./components/LogoBar";
import SearchTasks from "./components/SearchTasks";
import ProjectTile, { PROJECT_COLORS } from "./components/ProjectTile";
import ProjectEditor from "./components/ProjectEditor";
import ConfirmModal from "./components/ConfirmModal";
// persistence API; currently backed by localStorage or file but will
// eventually become a network service capable of scaling to many users.
import * as db from "./api/db";
// PeopleSection has been replaced by TaskList for consistency

// all static images live in public/assets

const logoUrl = "/assets/logo_fomo.png";

// the legacy storage helpers are no longer used directly; all
// operations go through `src/api/db.js` which itself wraps the
// storage layer.  this makes it easy to replace the implementation with
// a network service in the future.

// helpers used solely within App
function pickRandomColor() {
  // simple random hex color; ensures 6 digits
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

function App({ userId } = {}) {
  // avoid accessing the persistence layer during render so server & client
  // markup match.  loadData is synchronous today but may become async
  // later, so we keep it in an effect the same way we did with
  // `localStorage` previously.
  const [data, setData] = useState({
    tasks: [],
    projects: [],
    dreams: [],
    people: [],
  });
  const [confirmingProjectId, setConfirmingProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  // track if a blank subproject is pending additions to avoid races
  const pendingBlankSubRef = useRef(false);
  
  // helper to exit editing mode, removing any unnamed subprojects first
  const exitEditor = async () => {
    if (editingProjectId) {
      const project = data.projects.find((p) => p.id === editingProjectId);
      if (project && project.subprojects) {
        const cleaned = project.subprojects.filter(
          (s) => s.text && s.text.trim() !== ""
        );
        if (cleaned.length !== project.subprojects.length) {
          await db.update("projects", editingProjectId, { subprojects: cleaned }, userId);
          setData((prev) => ({
            ...prev,
            projects: prev.projects.map((pr) =>
              pr.id === editingProjectId ? { ...pr, subprojects: cleaned } : pr
            ),
          }));
        }
      }
    }
    setEditingProjectId(null);
  };
  // state placeholder previously reserved for subproject input; no longer needed
  // (subproject names start empty and are edited inline)  

  const initializedRef = useRef(false);

  // client-only hydration of persisted data.  we call the async db
  // helper so that identifiers can be added and the same API can be
  // swapped out for a remote backend later.
  useEffect(() => {
    (async () => {
      const loaded = await db.loadData(userId);
      setData(loaded);
      initializedRef.current = true;
    })();
  }, []);

  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("tasks");

  const [editorTaskId, setEditorTaskId] = useState(null);
  // helper which toggles the editor open/closed when the same task is clicked
  const handleSetEditorId = (id) => {
    setEditorTaskId((prev) => (prev === id ? null : id));
  };
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [editingPersonName, setEditingPersonName] = useState("");

  // query for top-bar search; only affects task list
  const [searchQuery, setSearchQuery] = useState("");
  // active filters: array of 'completed'|'overdue'
  const [filters, setFilters] = useState([]);
  // drag-and-drop state used while reordering tasks
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // The old "save-on-every-change" effect is no longer strictly
  // necessary since each handler uses the async db API directly.  We
  // retain it as a safety net in case something mutates `data` outside
  // of the helpers.
  useEffect(() => {
    if (initializedRef.current) {
      // don't await; this is just a best-effort write-through
      db.saveData && db.saveData(data, userId);
    }
  }, [data]);

  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleAddSubproject = async (name = "") => {
    if (!editingProjectId) return;
    const project = data.projects.find((p) => p.id === editingProjectId);
    if (!project) return;
    // avoid inserting another unnamed subproject
    if (
      project.subprojects &&
      project.subprojects.some((s) => !s.text || s.text.trim() === "")
    ) {
      return;
    }
    // mark pending if blank being added (prevents back-to-back clicks)
    if (!name.trim()) {
      pendingBlankSubRef.current = true;
    }
    const newSub = {
      id: generateId(),
      text: (name || "").trim(),
      tasks: [],
      collapsed: false,
    };
    const updatedSubs = [...(project.subprojects || []), newSub];
    await db.update("projects", editingProjectId, { subprojects: updatedSubs }, userId);
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((pr) =>
        pr.id === editingProjectId ? { ...pr, subprojects: updatedSubs } : pr,
      ),
    }));
  };

  const handleAdd = async () => {
    if (!input.trim()) return;
    if (type === "tasks") {
      const newTask = await db.create(
        "tasks",
        {
          text: input,
          done: false,
          dueDate: dueDate || null,
          favorite: false,
          people: [],
        },
        userId,
      );
      setData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
      setDueDate("");
    } else if (type === "people") {
      const name = input.trim();
      // dedupe by name; this is still done purely in-memory because the
      // db mock doesn't support querying.  a real backend would enforce
      // uniqueness server‑side.
      if (!data.people.find((p) => p.name === name)) {
        const newPerson = await db.create(
          "people",
          { name, methods: { discord: false, sms: false, whatsapp: false } },
          userId,
        );
        setData((prev) => ({ ...prev, people: [...prev.people, newPerson] }));
      }
    } else if (type === "projects") {
      // choose next unused color by cycling through PROJECT_COLORS in order
      const len = (data.projects && data.projects.length) || 0;
      const idx = len % PROJECT_COLORS.length;
      const color = PROJECT_COLORS[idx];
      const progress = Math.floor(Math.random() * 40) + 30;
      const newProject = await db.create(
        "projects",
        { text: input, color, progress },
        userId,
      );
      setData((prev) => ({ ...prev, projects: [...prev.projects, newProject] }));
    } else {
      // fallback for dreams and other types
      const newItem = await db.create(
        type,
        { text: input, done: false },
        userId,
      );
      setData((prev) => ({ ...prev, [type]: [...prev[type], newItem] }));
    }
    setInput("");
  };

  const handleToggle = async (id) => {
    const item = data[type].find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, done: !item.done };
    await db.update(type, id, { done: !item.done }, userId);
    setData((prev) => ({
      ...prev,
      [type]: prev[type].map((i) => (i.id === id ? updated : i)),
    }));
  };

  const handleDelete = async (id) => {
    if (type === "people") {
      const person = data.people.find((p) => p.id === id);
      if (!person) return;
      await db.remove("people", id, userId);
      setData((prev) => ({
        ...prev,
        people: prev.people.filter((p) => p.id !== id),
        tasks: prev.tasks.map((t) => ({
          ...t,
          people: (t.people || []).filter((p) => p.name !== person.name),
        })),
      }));
      return;
    }

    if (type === "tasks") {
      setEditorTaskId((prev) => (prev === id ? null : prev));
    }

    await db.remove(type, id, userId);
    setData((prev) => ({
      ...prev,
      [type]: prev[type].filter((i) => i.id !== id),
    }));
  };

  const handleStar = async (id) => {
    if (type !== "tasks") return;
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, favorite: !task.favorite };
    await db.update("tasks", id, { favorite: !task.favorite }, userId);
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
    }));
  };

  const handleTogglePersonDefault = async (id, method) => {
    const person = data.people.find((p) => p.id === id);
    if (!person) return;
    const newMethods = { ...person.methods, [method]: !person.methods[method] };
    await db.update("people", id, { methods: newMethods }, userId);
    setData((prev) => ({
      ...prev,
      people: prev.people.map((p) =>
        p.id === id ? { ...p, methods: newMethods } : p,
      ),
      tasks: prev.tasks.map((t) => ({
        ...t,
        people: (t.people || []).map((tp) =>
          tp.name === person.name
            ? {
                ...tp,
                methods: { ...tp.methods, [method]: !person.methods[method] },
              }
            : tp,
        ),
      })),
    }));
  };

  const handleEditorSave = async (updatedTask) => {
    if (!editorTaskId) return;
    await db.update("tasks", editorTaskId, updatedTask, userId);
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === editorTaskId ? { ...t, ...updatedTask } : t,
      ),
    }));
    setEditorTaskId(null);
  };

  // persist changes from editor without closing it (used for autosave / unmount)
  const handleEditorUpdate = async (updatedTask) => {
    if (!editorTaskId) return;
    // persist immediately but also update state for fast UI feedback
    await db.update("tasks", editorTaskId, updatedTask, userId);
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === editorTaskId ? { ...t, ...updatedTask } : t,
      ),
    }));
  };

  const handleEditorClose = () => setEditorTaskId(null);

  const handleSavePersonEdit = async (id, newName) => {
    const name = (newName || "").trim();
    if (!name) return;
    const person = data.people.find((p) => p.id === id);
    if (!person) return;
    const oldName = person.name;
    await db.update("people", id, { name }, userId);
    setData((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, name } : p)),
      tasks: prev.tasks.map((t) => ({
        ...t,
        people: (t.people || []).map((tp) =>
          tp.name === oldName ? { ...tp, name } : tp,
        ),
      })),
    }));
    setEditingPersonId(null);
    setEditingPersonName("");
  };

  // add a named subproject to the currently editing project

  // compute a filtered list based on the search query and the
  // user-chosen filters.  Completed tasks are hidden by default unless
  // the corresponding pill is active; overdue selection further narrows
  // to items with past due dates. Filters are combined with union logic.
  const filteredItems = (() => {
    if (type !== "tasks") return data[type];

    let list = data.tasks;

    // if completed is not selected, remove done items
    if (!filters.includes("completed")) {
      list = list.filter((t) => !t.done);
    }
    // if overdue is selected, further limit
    if (filters.includes("overdue")) {
      const now = new Date();
      list = list.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((t) => t.text.toLowerCase().includes(query));
    }

    return list;
  })();

  // reset search and active filters when switching away from tasks
  useEffect(() => {
    if (type !== "tasks") {
      if (searchQuery) {
        setSearchQuery("");
      }
      if (filters.length) {
        setFilters([]);
      }
    }
  }, [type]);

  // clear subproject input when switching between projects or leaving edit mode

  // if user navigates away from projects, exit editing mode
  useEffect(() => {
    if (type !== "projects" && editingProjectId) {
      setEditingProjectId(null);
    }
  }, [type, editingProjectId]);

  // drag handlers passed down to TaskList so tasks can be reordered
  const handleDragStart = (id, e) => {
    // record which task is currently being dragged
    setDraggedTaskId(id);
  };

  const handleDragOver = (id, e) => {
    // no action other than preventing default already handled by TaskRow
  };

  const handleDrop = (id, e) => {
    if (!draggedTaskId || draggedTaskId === id) return;
    // reorder tasks array in state; skip persistence for simplicity
    setData((prev) => {
      const tasks = [...prev.tasks];
      const fromIdx = tasks.findIndex((t) => t.id === draggedTaskId);
      const toIdx = tasks.findIndex((t) => t.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = tasks.splice(fromIdx, 1);
      tasks.splice(toIdx, 0, moved);
      return { ...prev, tasks };
    });
    setDraggedTaskId(null);
  };

  const handleDragEnd = (id, e) => {
    setDraggedTaskId(null);
  };

  return (
    <div className={`main-layout${editingProjectId ? ' editing' : ''}`}>
      {/* outer wrapper holds the top bar and container and fills available vertical space */}
      <div className="app-outer">
        {/* title/logo bar component */}
        {/* logo bar always shown; pass task search component as child when
            we're on tasks tab */}
        <LogoBar
          logoUrl={logoUrl}
          title={
            editingProjectId &&
            type === "projects" &&
            data.projects.find((p) => p.id === editingProjectId)?.text
          }
          onBack={editingProjectId && type === "projects" ? exitEditor : undefined}
          onLogoClick={editingProjectId && type === "projects" ? exitEditor : undefined}
          onTitleChange={
            editingProjectId
              ? (newText) => {
                  const id = editingProjectId;
                  // update persistent storage and in-memory state
                  db.update('projects', id, { text: newText }, userId);
                  setData((prev) => ({
                    ...prev,
                    projects: prev.projects.map((p) =>
                      p.id === id ? { ...p, text: newText } : p,
                    ),
                  }));
                }
              : undefined
          }
        >
          {type === "tasks" && !editingProjectId && (
            <SearchTasks
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onToggleFilter={(type) => {
                setFilters((prev) =>
                  prev.includes(type)
                    ? prev.filter((f) => f !== type)
                    : [...prev, type],
                );
              }}
            />
          )}
        </LogoBar>
        <div className={`container ${type === 'tasks' ? 'tasks-padding' : ''}`}>
          {/* decorative splash removed; logo now shown in title bar */}

          {type === "projects" ? (
            editingProjectId && data.projects.find((p) => p.id === editingProjectId) ? (
              <ProjectEditor
                project={data.projects.find((p) => p.id === editingProjectId)}
                onApplyChange={(updated) => {
                  // if any unnamed subprojects removed or named, clear pending flag
                  if (updated.subprojects) {
                    const hasBlank = updated.subprojects.some(
                      (s) => !s.text || s.text.trim() === ""
                    );
                    pendingBlankSubRef.current = hasBlank;
                  }
                  db.update("projects", editingProjectId, updated, userId);
                  setData((prev) => ({
                    ...prev,
                    projects: prev.projects.map((pr) =>
                      pr.id === editingProjectId ? { ...pr, ...updated } : pr,
                    ),
                  }));
                }}
                onAddSubproject={handleAddSubproject}
                allPeople={data.people}
                onOpenPeople={() => setType("people")}
                onCreatePerson={async (person) => {
                  if (data.people.find((p) => p.name === person.name)) return null;
                  const newPerson = await db.create(
                    "people",
                    {
                      name: person.name,
                      methods: person.methods || {
                        discord: false,
                        sms: false,
                        whatsapp: false,
                      },
                    },
                    userId,
                  );
                  setData((prev) => ({
                    ...prev,
                    people: [...prev.people, newPerson],
                  }));
                  return newPerson;
                }}
              />
            ) : (
              <div className="projects-panel">
                {data.projects.map((p) => (
                  <ProjectTile
                    key={p.id}
                    project={p}
                    onDelete={() => setConfirmingProjectId(p.id)}
                    onEdit={() => setEditingProjectId(p.id)}
                  />
                ))}
              </div>
            )
          ) : type === "people" ? (
            <div className="people-list task-person-list">
              <div className="task-person-list-header" aria-hidden>
                <div className="task-person-col name">Name</div>
                <div className="task-person-col methods">Notifications</div>
              </div>
              <TaskList
                items={data.people}
                type="people"
                editingPersonId={editingPersonId}
                editingPersonName={editingPersonName}
                setEditingPersonId={setEditingPersonId}
                setEditingPersonName={setEditingPersonName}
                onSaveEdit={handleSavePersonEdit}
                onCancelEdit={() => {
                  setEditingPersonId(null);
                  setEditingPersonName("");
                }}
                handleTogglePersonDefault={handleTogglePersonDefault}
                handleDelete={handleDelete}
              />
            </div>
          ) : (
            <ul className="item-list">
              <TaskList
                items={filteredItems}
                type={type}
                editorTaskId={editorTaskId}
                setEditorTaskId={handleSetEditorId}
                handleToggle={handleToggle}
                handleStar={handleStar}
                handleDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onEditorSave={handleEditorSave}
                onEditorUpdate={handleEditorUpdate}
                onEditorClose={handleEditorClose}
                allPeople={data.people || []}
                onOpenPeople={() => setType("people")}
                onCreatePerson={async (person) => {
                  // avoid dupes
                  if (data.people.find((p) => p.name === person.name)) return;
                  const newPerson = await db.create(
                    "people",
                    {
                      name: person.name,
                      methods: person.methods || {
                        discord: false,
                        sms: false,
                        whatsapp: false,
                      },
                    },
                    userId,
                  );
                  setData((prev) => ({
                    ...prev,
                    people: [...prev.people, newPerson],
                  }));
                  return newPerson;
                }}
              />
            </ul>
          )}
        </div>
      </div>
      {/* bottom‐aligned add bar; replicates original AddBar controls */}
      {/* when a project is being edited we no longer render the global
          bottom bar; the editor component is responsible for its own
          "add subproject" button. */}
      {!editingProjectId && (
        <div className="bottom-input-bar">
          <AddBar
            type={type}
            input={input}
            dueDate={dueDate}
            onInputChange={setInput}
            onDueDateChange={setDueDate}
            onAdd={handleAdd}
          />
        </div>
      )}
      <TabNav active={type} onChange={setType} />
      {confirmingProjectId && (
        <ConfirmModal
          message="Are you sure you want to delete this project? This action cannot be undone."
          onConfirm={async () => {
            await handleDelete(confirmingProjectId);
            setConfirmingProjectId(null);
          }}
          onCancel={() => setConfirmingProjectId(null)}
        />
      )}
    </div>
  );
}

export default App;
