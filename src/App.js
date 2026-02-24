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
import generateId from "./utils/generateId";

const logoUrl = "/assets/logo_fomo.png";

function App({ userId } = {}) {
  // --- State ---------------------------------------------------------------

  const [data, setData] = useState({
    tasks: [],
    projects: [],
    dreams: [],
    people: [],
  });
  const [confirmingProjectId, setConfirmingProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [newlyAddedSubprojectId, setNewlyAddedSubprojectId] = useState(null);
  const pendingBlankSubRef = useRef(false);

  // Exit editing mode, removing any unnamed subprojects first.
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

  const initializedRef = useRef(false);

  // --- Data hydration (runs once on mount) --------------------------------

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
  const handleSetEditorId = (id) =>
    setEditorTaskId((prev) => (prev === id ? null : id));
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [editingPersonName, setEditingPersonName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState([]);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Safety-net write-through: persists on every state change.
  useEffect(() => {
    if (initializedRef.current) {
      db.saveData && db.saveData(data, userId);
    }
  }, [data]);

  // --- Subproject helpers -------------------------------------------------

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
      collapsed: true,
    };
    const updatedSubs = [...(project.subprojects || []), newSub];
    await db.update("projects", editingProjectId, { subprojects: updatedSubs }, userId);
    setNewlyAddedSubprojectId(newSub.id);
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((pr) =>
        pr.id === editingProjectId ? { ...pr, subprojects: updatedSubs } : pr,
      ),
    }));
  };

  // --- CRUD handlers ------------------------------------------------------

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
      // Dedupe by name (a real backend would enforce uniqueness server-side).
      if (!data.people.find((p) => p.name === name)) {
        const newPerson = await db.create(
          "people",
          { name, methods: { discord: false, sms: false, whatsapp: false } },
          userId,
        );
        setData((prev) => ({ ...prev, people: [...prev.people, newPerson] }));
      }
    } else if (type === "projects") {
      // Choose next unused color by cycling through PROJECT_COLORS
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
      // immediately enter editing mode and add a blank subproject
      setEditingProjectId(newProject.id);
      // schedule the subproject addition after state updates settle
      setTimeout(() => {
        handleAddSubproject("");
      }, 0);
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

  // --- Project helpers ----------------------------------------------------

  const handleProjectColorChange = async (projectId, newColor) => {
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) return;
    await db.update("projects", projectId, { color: newColor }, userId);
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId ? { ...p, color: newColor } : p,
      ),
    }));
  };

  const handleReorderProjects = async (draggedProjectId, targetProjectId) => {
    const draggedIndex = data.projects.findIndex((p) => p.id === draggedProjectId);
    const targetIndex = data.projects.findIndex((p) => p.id === targetProjectId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new array with reordered projects
    const newProjects = [...data.projects];
    const [removed] = newProjects.splice(draggedIndex, 1);
    newProjects.splice(targetIndex, 0, removed);

    // Update local state immediately for better UX
    setData((prev) => ({
      ...prev,
      projects: newProjects,
    }));

    // Persist the new order to the database
    // Store order as metadata or just rely on the new order in the array
    try {
      await Promise.all(
        newProjects.map((p, index) =>
          db.update("projects", p.id, { order: index }, userId)
        )
      );
    } catch (error) {
      console.error("Failed to save project order:", error);
      // Revert on error
      setData((prev) => ({
        ...prev,
        projects: data.projects,
      }));
    }
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

  // --- Editor helpers -----------------------------------------------------

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

  // inline title edits from rows update text without opening full editor
  const handleTaskTitleChange = async (id, newText) => {
    await db.update("tasks", id, { text: newText }, userId);
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, text: newText } : t)),
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

  // --- Filtered list computation ------------------------------------------
  // Compute a filtered list based on the search query and the
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

  // Reset search/filters when switching away from tasks
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

  // Exit project editing when switching to a different tab
  useEffect(() => {
    if (type !== "projects" && editingProjectId) {
      setEditingProjectId(null);
    }
  }, [type, editingProjectId]);

  // --- Drag-and-drop reordering -------------------------------------------

  const handleDragStart = (id) => setDraggedTaskId(id);
  const handleDragOver = () => {};
  const handleDragEnd = () => setDraggedTaskId(null);

  const handleDrop = (id) => {
    if (!draggedTaskId || draggedTaskId === id) return;
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

  // --- Shared person creation callback -----------------------------------
  // Used by both ProjectEditor and TaskList to create new people inline.
  const handleCreatePerson = async (person) => {
    if (data.people.find((p) => p.name === person.name)) return null;
    const newPerson = await db.create(
      "people",
      {
        name: person.name,
        methods: person.methods || { discord: false, sms: false, whatsapp: false },
      },
      userId,
    );
    setData((prev) => ({ ...prev, people: [...prev.people, newPerson] }));
    return newPerson;
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
        <div
          className={`container ${type === 'tasks' ? 'tasks-padding' : ''}`}
        >
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
                newlyAddedSubprojectId={newlyAddedSubprojectId}
                onClearNewSubproject={() => setNewlyAddedSubprojectId(null)}
                allPeople={data.people}
                onOpenPeople={() => setType("people")}
                onCreatePerson={handleCreatePerson}
              />
            ) : (
              <div className="projects-panel">
                {data.projects.map((p) => (
                  <ProjectTile
                    key={p.id}
                    project={p}
                    onDelete={() => setConfirmingProjectId(p.id)}
                    onEdit={() => setEditingProjectId(p.id)}
                    onChangeColor={handleProjectColorChange}
                    onReorder={handleReorderProjects}
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
                onTitleChange={handleTaskTitleChange}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onEditorSave={handleEditorSave}
                onEditorUpdate={handleEditorUpdate}
                onEditorClose={handleEditorClose}
                allPeople={data.people || []}
                onOpenPeople={() => setType("people")}
                onCreatePerson={handleCreatePerson}
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
