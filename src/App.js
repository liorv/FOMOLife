import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import TaskList from "./components/TaskList";
import TabNav from "./components/TabNav";
import AddBar from "./components/AddBar";
import LogoBar from "./components/LogoBar";
import SearchTasks from "./components/SearchTasks";
import { PROJECT_COLORS } from "./components/ProjectTile";
import ConfirmModal from "./components/ConfirmModal";
import ProjectsDashboard from "./components/ProjectsDashboard";
import UndoSnackBar from "./components/UndoSnackBar";
// persistence API; currently backed by localStorage or file but will
// eventually become a network service capable of scaling to many users.
import * as db from "./api/db";
import { initSupabaseTables } from "./api/supabaseInit";
import generateId from "./utils/generateId";
import ContactsPage from "./components/ContactsPage";

const logoUrl = "/assets/logo_fomo.png";

function App({ userId, authUser, onSignOut } = {}) {
  // --- State ---------------------------------------------------------------
  const router = useRouter();

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

  // Undo snack bar state
  const [undoSnackBar, setUndoSnackBar] = useState({
    isOpen: false,
    message: "",
    type: null, // 'project-created', 'project-deleted', 'subproject-created', 'subproject-deleted'
    actionData: null, // stores project/subproject data needed for undo
  });

  // Exit editing mode, removing any unnamed subprojects first.
  const exitEditor = async () => {
    if (editingProjectId) {
      const project = data.projects.find((p) => p.id === editingProjectId);
      if (project && project.subprojects) {
        // Keep the project-level subproject, remove other unnamed ones
        const cleaned = project.subprojects.filter(
          (s) => s.isProjectLevel || (s.text && s.text.trim() !== "")
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

  // --- Helper to ensure project-level tasks subproject ----------------

  // Ensures a project has a project-level tasks subproject at position 0
  const ensureProjectLevelTasks = (project) => {
    if (!project.subprojects) {
      project.subprojects = [];
    }

    // Check if first subproject is the project-level tasks subproject
    const hasProjectLevel = project.subprojects[0]?.isProjectLevel;

    if (!hasProjectLevel) {
      // Create project-level tasks subproject with project name
      const projectLevelSub = {
        id: `project-level-${project.id}`,
        text: `${project.text} Tasks`,
        tasks: [],
        collapsed: true,
        isProjectLevel: true,
        projectColor: project.color,
      };
      // Insert at the beginning
      project.subprojects = [projectLevelSub, ...project.subprojects];
    } else {
      // Update project-level tasks to always have the current project name
      project.subprojects[0] = {
        ...project.subprojects[0],
        text: `${project.text} Tasks`,
        projectColor: project.color,
      };
    }

    return project;
  };

  // --- Data hydration (runs once on mount) --------------------------------

  useEffect(() => {
    (async () => {
      // Initialize Supabase tables if they don't exist
      await initSupabaseTables();
      
      const loaded = await db.loadData(userId);
      // Ensure all projects have project-level tasks subproject
      if (loaded.projects) {
        loaded.projects = loaded.projects.map(ensureProjectLevelTasks);
      }
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
  const [projectSearch, setProjectSearch] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Safety-net write-through: persists on every state change.
  useEffect(() => {
    if (initializedRef.current) {
      db.saveData && db.saveData(data, userId);
    }
  }, [data]);

  // Sync tab state with URL query parameter
  useEffect(() => {
    if (router.isReady && router.query.tab) {
      const tabFromUrl = router.query.tab;
      if (["tasks", "projects", "dreams", "people"].includes(tabFromUrl)) {
        setType(tabFromUrl);
      }
    }
  }, [router.isReady, router.query.tab]);

  // Listen to route changes (including back button)
  useEffect(() => {
    const handleRouteChange = () => {
      const tabFromUrl = router.query.tab;
      if (tabFromUrl && ["tasks", "projects", "dreams", "people"].includes(tabFromUrl)) {
        setType(tabFromUrl);
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

  // Update URL when user clicks a tab button
  const handleTabChange = (newTab) => {
    router.push({ pathname: "/", query: { tab: newTab } }, undefined, { shallow: true });
  };

  // Get the active tab from URL (source of truth), with fallback to state
  const activeTab = router.isReady && router.query.tab ? router.query.tab : type;

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
      collapsed: false, // start expanded so user can immediately name it
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

  // --- Project-level handlers for new dashboard ----------------------------

  const handleAddProject = async (text = "New Project") => {
    // Guard: if caller accidentally passed an event object, use the default name
    if (!text || typeof text !== "string") text = "New Project";
    const len = (data.projects && data.projects.length) || 0;
    const idx = len % PROJECT_COLORS.length;
    const color = PROJECT_COLORS[idx];
    const newProject = await db.create(
      "projects",
      { text, color, progress: 0 },
      userId,
    );
    const projectWithLevel = ensureProjectLevelTasks(newProject);
    await db.update("projects", newProject.id, { subprojects: projectWithLevel.subprojects }, userId);
    setData((prev) => ({ ...prev, projects: [...prev.projects, projectWithLevel] }));
    setEditingProjectId(newProject.id);
  };

  const handleProjectApplyChange = (projectId, updated) => {
    if (updated.subprojects) {
      const hasBlank = updated.subprojects.some(
        (s) => !s.text || s.text.trim() === ""
      );
      pendingBlankSubRef.current = hasBlank;
    }
    db.update("projects", projectId, updated, userId);
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((pr) =>
        pr.id === projectId ? { ...pr, ...updated } : pr,
      ),
    }));
  };

  const handleProjectTitleChange = (projectId, newText) => {
    if (!newText || !newText.trim()) return;
    db.update("projects", projectId, { text: newText }, userId);
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId ? { ...p, text: newText } : p,
      ),
    }));
  };

  // --- Subproject deletion handler -----------------------------------------

  const handleSubprojectDeleted = (deletedSubproject) => {
    // Show undo snack bar for subproject deletion
    setUndoSnackBar({
      isOpen: true,
      message: `Subproject "${deletedSubproject.text}" deleted`,
      type: "subproject-deleted",
      actionData: {
        projectId: editingProjectId,
        subproject: deletedSubproject,
      },
    });
  };

  // --- Undo handlers -------------------------------------------------------

  const handleUndoAction = async () => {
    if (!undoSnackBar.actionData) {
      setUndoSnackBar({ ...undoSnackBar, isOpen: false });
      return;
    }

    try {
      if (undoSnackBar.type === "project-created") {
        // Remove the created project
        const { projectId } = undoSnackBar.actionData;
        await db.remove("projects", projectId, userId);
        setData((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== projectId),
        }));
        // If we were editing this project, exit editing mode
        if (editingProjectId === projectId) {
          setEditingProjectId(null);
        }
      } else if (undoSnackBar.type === "project-deleted") {
        // Restore the deleted project
        const { project } = undoSnackBar.actionData;
        await db.update("projects", project.id, project, userId);
        setData((prev) => ({
          ...prev,
          projects: [...prev.projects, project],
        }));
      } else if (undoSnackBar.type === "subproject-created") {
        // Remove the created subproject
        const { projectId, subprojectId } = undoSnackBar.actionData;
        const project = data.projects.find((p) => p.id === projectId);
        if (project) {
          const updatedSubs = project.subprojects.filter(
            (s) => s.id !== subprojectId
          );
          await db.update("projects", projectId, { subprojects: updatedSubs }, userId);
          setData((prev) => ({
            ...prev,
            projects: prev.projects.map((p) =>
              p.id === projectId ? { ...p, subprojects: updatedSubs } : p
            ),
          }));
          if (newlyAddedSubprojectId === subprojectId) {
            setNewlyAddedSubprojectId(null);
          }
        }
      } else if (undoSnackBar.type === "subproject-deleted") {
        // Restore the deleted subproject
        const { projectId, subproject } = undoSnackBar.actionData;
        const project = data.projects.find((p) => p.id === projectId);
        if (project) {
          const updatedSubs = [...(project.subprojects || []), subproject];
          await db.update("projects", projectId, { subprojects: updatedSubs }, userId);
          setData((prev) => ({
            ...prev,
            projects: prev.projects.map((p) =>
              p.id === projectId ? { ...p, subprojects: updatedSubs } : p
            ),
          }));
        }
      }
    } catch (error) {
      console.error("Error undoing action:", error);
    }

    // Close snack bar
    setUndoSnackBar({ ...undoSnackBar, isOpen: false });
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
      // Add project-level tasks subproject
      const projectWithLevel = ensureProjectLevelTasks(newProject);
      await db.update("projects", newProject.id, { subprojects: projectWithLevel.subprojects }, userId);
      setData((prev) => ({ ...prev, projects: [...prev.projects, projectWithLevel] }));
      // immediately enter editing mode
      setEditingProjectId(newProject.id);
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
        login: person.login || "",
        status: person.status || "none",
        inviteToken: person.inviteToken || null,
      },
      userId,
    );
    setData((prev) => ({ ...prev, people: [...prev.people, newPerson] }));
    return newPerson;
  };

  // --- Contacts tab: add contact with nickname + login identifier --------
  const handleAddContact = async (contactData) => {
    // Guard against duplicate nicknames (server would also enforce this).
    if (data.people.find((p) => p.name === contactData.name)) return;
    const newContact = await db.create("people", contactData, userId);
    setData((prev) => ({ ...prev, people: [...prev.people, newContact] }));
  };

  // --- Contacts tab: generate invite token for an existing contact ------
  const handleGenerateInvite = async (id, token) => {
    await db.update("people", id, { inviteToken: token, status: "invited" }, userId);
    setData((prev) => ({
      ...prev,
      people: prev.people.map((p) =>
        p.id === id ? { ...p, inviteToken: token, status: "invited" } : p
      ),
    }));
  };

  return (
    <div className="main-layout">
      {/* outer wrapper holds the top bar and container and fills available vertical space */}
      <div className="app-outer">
        {/* title/logo bar component */}
        {/* logo bar always shown; pass task search component as child when
            we're on tasks tab */}
        <LogoBar
          logoUrl={logoUrl}
          user={authUser}
          onSignOut={onSignOut}
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

          {type === "projects" && (
            <div className="projects-search-container">
              <div className="projects-search-bar" style={{ width: '50%' }}>
                <span className="material-icons">search</span>
                <input
                  type="text"
                  id="projects-search"
                  name="projectsSearch"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  aria-label="Search projects"
                />
                {projectSearch && (
                  <button
                    className="projects-search-clear"
                    onClick={() => setProjectSearch("")}
                    aria-label="Clear search"
                  >
                    <span className="material-icons">close</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {type === "projects" ? (
            <ProjectsDashboard
              projects={data.projects}
              people={data.people}
              selectedProjectId={editingProjectId}
              onSelectProject={setEditingProjectId}
              onApplyChange={handleProjectApplyChange}
              onAddSubproject={handleAddSubproject}
              newlyAddedSubprojectId={newlyAddedSubprojectId}
              onClearNewSubproject={() => setNewlyAddedSubprojectId(null)}
              onSubprojectDeleted={handleSubprojectDeleted}
              onColorChange={handleProjectColorChange}
              onReorder={handleReorderProjects}
              onDeleteProject={(id) => setConfirmingProjectId(id)}
              onAddProject={handleAddProject}
              onOpenPeople={() => setType("people")}
              onCreatePerson={handleCreatePerson}
              onTitleChange={handleProjectTitleChange}
              projectSearch={projectSearch}
            />
          ) : type === "people" ? (
            <ContactsPage
              contacts={data.people}
              onAdd={handleAddContact}
              onDelete={handleDelete}
              onGenerateInvite={handleGenerateInvite}
              editingPersonId={editingPersonId}
              editingPersonName={editingPersonName}
              setEditingPersonId={setEditingPersonId}
              setEditingPersonName={setEditingPersonName}
              onSaveEdit={handleSavePersonEdit}
              onCancelEdit={() => {
                setEditingPersonId(null);
                setEditingPersonName("");
              }}
            />
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
      {type !== "people" && type !== "projects" && (
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
      <TabNav active={activeTab} onChange={handleTabChange} />
      {confirmingProjectId && (
        <ConfirmModal
          message="Are you sure you want to delete this project? This action cannot be undone."
          onConfirm={async () => {
            // Get the project data before deleting
            const projectToDelete = data.projects.find(
              (p) => p.id === confirmingProjectId
            );
            if (projectToDelete) {
              // Delete the project
              await handleDelete(confirmingProjectId);
              // Clear selection if the deleted project was selected
              if (editingProjectId === confirmingProjectId) {
                setEditingProjectId(null);
              }
              // Show undo snack bar
              setUndoSnackBar({
                isOpen: true,
                message: `Project "${projectToDelete.text}" deleted`,
                type: "project-deleted",
                actionData: { project: projectToDelete },
              });
            }
            setConfirmingProjectId(null);
          }}
          onCancel={() => setConfirmingProjectId(null)}
        />
      )}
      <UndoSnackBar
        isOpen={undoSnackBar.isOpen}
        message={undoSnackBar.message}
        onUndo={handleUndoAction}
        onDismiss={() =>
          setUndoSnackBar((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}

export default App;
