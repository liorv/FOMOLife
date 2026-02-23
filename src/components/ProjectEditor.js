import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import TaskList from "./TaskList";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ProjectEditor({
  project,
  onApplyChange = () => {},
  allPeople = [],
  onCreatePerson = () => {},
  onOpenPeople = () => {},
}) {
  const [local, setLocal] = useState(() => ({
    ...project,
    subprojects: project.subprojects
      ? project.subprojects.map((s) => ({ ...s, collapsed: false }))
      : [],
  }));
  const [editorTaskId, setEditorTaskId] = useState(null);
  const handleSetEditorId = (id) => {
    setEditorTaskId((prev) => (prev === id ? null : id));
  };

  // generic update helper for a nested task
  const updateTask = (subId, taskId, changes) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId ? { ...t, ...changes } : t,
          ),
        };
      }),
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  const handleEditorSave = (subId) => async (updatedTask) => {
    // assume editor passes only changes
    const taskId = editorTaskId;
    updateTask(subId, taskId, updatedTask);
    setEditorTaskId(null);
  };

  const handleEditorUpdate = (subId) => async (updatedTask) => {
    const taskId = editorTaskId;
    updateTask(subId, taskId, updatedTask);
  };

  const handleEditorClose = () => setEditorTaskId(null);

  useEffect(() => {
    setLocal({
      ...project,
      subprojects: project.subprojects ? [...project.subprojects] : [],
    });
  }, [project]);

  const updateField = (changes) => {
    const updated = { ...local, ...changes };
    setLocal(updated);
    onApplyChange(updated);
  };


  const deleteSubproject = (id) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).filter((s) => s.id !== id),
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  const updateSubText = (id, text) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) =>
        s.id === id ? { ...s, text } : s,
      ),
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  const toggleSubCollapse = (id) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) =>
        s.id === id ? { ...s, collapsed: !s.collapsed } : s,
      ),
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  const updateSubNewTask = (id, text) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) =>
        s.id === id ? { ...s, newTaskText: text } : s,
      ),
    };
    setLocal(updated);
  };

  const addTask = (subId) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        const newTask = {
          id: generateId(),
          text: "",
          done: false,
          dueDate: null,
          favorite: false,
          people: [],
        };
        return {
          ...s,
          tasks: [...(s.tasks || []), newTask],
        };
      }),
    };
    setLocal(updated);
    onApplyChange(updated);
  };


  const handleTaskToggle = (subId, taskId) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t,
          ),
        };
      }),
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  const handleTaskDelete = (subId, taskId) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).filter((t) => t.id !== taskId),
        };
      }),
    };
    setLocal(updated);
    onApplyChange(updated);
  };



  const handleTaskStar = (subId, taskId) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) =>
            t.id === taskId ? { ...t, favorite: !t.favorite } : t,
          ),
        };
      }),
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  return (
    <div className="project-editor">
      <div className="editor-section">
        <label htmlFor="proj-name-input">Project Name</label>
        <input
          id="proj-name-input"
          className="proj-name-input"
          value={local.text || ""}
          onChange={(e) => updateField({ text: e.target.value })}
        />
      </div>
      {/* input bar at bottom will handle new subproject names */}
      {/* preserve spacing if desired by keeping an empty section or remove entirely */}
      {(local.subprojects || []).map((sub, idx, arr) => {
        const isLast = idx === arr.length - 1;
        return (
          <details key={sub.id} open={!sub.collapsed}>
            <summary className="subproject-summary">
              <button
                className="collapse-btn"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubCollapse(sub.id);
                }}
                title={sub.collapsed ? "Show tasks" : "Hide tasks"}
              >
                <span className="material-icons">
                  {sub.collapsed ? "expand_more" : "expand_less"}
                </span>
              </button>
              <input
                className="subproject-name-input"
                placeholder="Subproject name"
                value={sub.text}
                onChange={(e) => updateSubText(sub.id, e.target.value)}
              />
              <button
                className="delete-subproj-inline"
                onClick={() => deleteSubproject(sub.id)}
                title="Delete subproject"
              >
                <span className="material-icons">delete</span>
              </button>
            </summary>
            <div className="subproject-tasks">
              <button
                className="add-task-btn"
                onClick={() => addTask(sub.id)}
                title="Add task"
              >
                Task
              </button>
              <ul className="item-list">
                <TaskList
                  items={sub.tasks || []}
                  type="tasks"
                  editorTaskId={editorTaskId}
                  setEditorTaskId={handleSetEditorId}
                  handleToggle={(taskId) => handleTaskToggle(sub.id, taskId)}
                  handleStar={(taskId) => handleTaskStar(sub.id, taskId)}
                  handleDelete={(taskId) => handleTaskDelete(sub.id, taskId)}
                  onEditorSave={handleEditorSave(sub.id)}
                  onEditorUpdate={handleEditorUpdate(sub.id)}
                  onEditorClose={handleEditorClose}
                  allPeople={allPeople}
                  onOpenPeople={onOpenPeople}
                  onCreatePerson={onCreatePerson}
                />
              </ul>
            </div>
          </details>
        );
      })}
    </div>
  );
}

ProjectEditor.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string,
    text: PropTypes.string,
    subprojects: PropTypes.array,
  }).isRequired,
  onApplyChange: PropTypes.func,
};
