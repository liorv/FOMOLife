import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import SubprojectEditor from "./SubprojectEditor";
import generateId from "../utils/generateId";

export default function ProjectEditor({
  project,
  onApplyChange = () => {},
  allPeople = [],
  onCreatePerson = () => {},
  onOpenPeople = () => {},
  onAddSubproject = () => {},
  onBack = () => {},
  newlyAddedSubprojectId = null,
  onClearNewSubproject = () => {},
}) {
  // --- State ---------------------------------------------------------------

  const [local, setLocal] = useState(() => ({
    ...project,
    subprojects: project.subprojects
      ? project.subprojects.map((s) => ({
          ...s,
          collapsed: s.collapsed !== undefined ? s.collapsed : false,
          newTaskText: "",
        }))
      : [],
  }));
  const [editorTaskId, setEditorTaskId] = useState(null);
  const [newlyAddedTaskId, setNewlyAddedTaskId] = useState(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState({ subId: null, taskId: null });
  const [draggedSubprojectId, setDraggedSubprojectId] = useState(null);
  const editorContainerRef = useRef(null);
  // Ref-based cooldown avoids setState-outside-act warnings in tests.
  const addingRef = React.useRef(false);

  const handleSetEditorId = (id) =>
    setEditorTaskId((prev) => (prev === id ? null : id));

  // --- Task helpers (nested inside subprojects) ---------------------------

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
      subprojects: project.subprojects
        ? project.subprojects.map((s) => ({ ...s, newTaskText: "" }))
        : [],
    });
  }, [project]);

  // Scroll expanded task into view
  useEffect(() => {
    if (!editorTaskId || !editorContainerRef.current) return;

    const scrollToExpanded = () => {
      const expandedElement = editorContainerRef.current?.querySelector(`[data-task-id="${editorTaskId}"]`);
      if (expandedElement) {
        // Scroll the task to the top of the visible area so users can see the whole editor
        setTimeout(() => {
          expandedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    };

    scrollToExpanded();
  }, [editorTaskId]);



  // --- Subproject helpers --------------------------------------------------

  const deleteSubproject = (id) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).filter((s) => s.id !== id),
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  const updateSubText = (id, text) => {
    // if text is empty, check if we should delete or give a temp name
    if (!text || text.trim() === "") {
      const subproject = (local.subprojects || []).find((s) => s.id === id);
      if (subproject) {
        const taskCount = (subproject.tasks || []).length;
        // if no tasks, delete the subproject
        if (taskCount === 0) {
          const updated = {
            ...local,
            subprojects: (local.subprojects || []).filter((s) => s.id !== id),
          };
          setLocal(updated);
          onApplyChange(updated);
          if (id === newlyAddedSubprojectId) {
            onClearNewSubproject();
          }
          return;
        }
        // if has tasks, give it a temporary name
        const tempName = `Untitled (${taskCount})`;
        const updated = {
          ...local,
          subprojects: (local.subprojects || []).map((s) =>
            s.id === id ? { ...s, text: tempName } : s,
          ),
        };
        setLocal(updated);
        onApplyChange(updated);
        if (id === newlyAddedSubprojectId) {
          onClearNewSubproject();
        }
        return;
      }
    }
    
    // normal case: update the text
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) =>
        s.id === id ? { ...s, text } : s,
      ),
    };
    setLocal(updated);
    onApplyChange(updated);
    // clear the newly added flag when the name is edited
    if (id === newlyAddedSubprojectId) {
      onClearNewSubproject();
    }
  };

  const toggleSubCollapse = (id) => {
    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id === id) {
          // flip the clicked one
          return { ...s, collapsed: !s.collapsed };
        }
        // collapse all others unconditionally
        return { ...s, collapsed: true };
      }),
    };
    // if we're collapsing the requested subproject, strip any unnamed tasks
    const cleaned = {
      ...updated,
      subprojects: updated.subprojects.map((s) => {
        if (s.id === id && s.collapsed) {
          return {
            ...s,
            tasks: (s.tasks || []).filter((t) => t.text && t.text.trim() !== ""),
          };
        }
        return s;
      }),
    };
    setLocal(cleaned);
    onApplyChange(cleaned);
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

  const addTask = (subId, text = "", allowBlank = false) => {
    // prevent creating tasks with no name (or only whitespace) unless caller
    // explicitly asked for a blank placeholder.
    if ((!text || text.trim() === "") && !allowBlank) {
      return;
    }

    const updated = {
      ...local,
      subprojects: (local.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        const newTask = {
          id: generateId(),
          text,
          done: false,
          dueDate: null,
          favorite: false,
          people: [],
        };
        return {
          ...s,
          tasks: [...(s.tasks || []), newTask],
          newTaskText: "",
        };
      }),
    };
    setLocal(updated);
    onApplyChange(updated);
    // if task was created blank, mark it as newly added so it enters edit mode
    if (!text || text.trim() === "") {
      const newTask = updated.subprojects
        .find((s) => s.id === subId)
        ?.tasks.slice(-1)[0];
      if (newTask) {
        setNewlyAddedTaskId(newTask.id);
      }
    }
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

  // --- Drag / drop (task reordering within a subproject) ------------------

  const handleDragStart = (subId) => (taskId) => {
    setDraggedTask({ subId, taskId });
  };

  const handleDrop = (subId) => (taskId) => {
    const { subId: fromSub, taskId: draggedId } = draggedTask;
    if (!draggedId || fromSub !== subId || draggedId === taskId) {
      setDraggedTask({ subId: null, taskId: null });
      return;
    }
    setLocal((prev) => {
      const subs = (prev.subprojects || []).map((s) => {
        if (s.id !== subId) return s;
        const tasks = [...(s.tasks || [])];
        const fromIdx = tasks.findIndex((t) => t.id === draggedId);
        const toIdx = tasks.findIndex((t) => t.id === taskId);
        if (fromIdx === -1 || toIdx === -1) return s;
        const [moved] = tasks.splice(fromIdx, 1);
        tasks.splice(toIdx, 0, moved);
        return { ...s, tasks };
      });
      const updated = { ...prev, subprojects: subs };
      onApplyChange(updated);
      return updated;
    });
    setDraggedTask({ subId: null, taskId: null });
  };

  const handleDragEnd = () => {
    setDraggedTask({ subId: null, taskId: null });
  };

  const handleReorderSubprojects = async (draggedSubId, targetSubId) => {
    const draggedIndex = (local.subprojects || []).findIndex((s) => s.id === draggedSubId);
    const targetIndex = (local.subprojects || []).findIndex((s) => s.id === targetSubId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new array with reordered subprojects
    const newSubprojects = [...(local.subprojects || [])];
    const [removed] = newSubprojects.splice(draggedIndex, 1);
    newSubprojects.splice(targetIndex, 0, removed);

    // Update local state immediately for better UX
    const updated = {
      ...local,
      subprojects: newSubprojects,
    };
    setLocal(updated);
    onApplyChange(updated);
  };

  // --- Render --------------------------------------------------------------

  return (
    <div
      className="project-editor"
      ref={editorContainerRef}
      style={{ position: 'relative', overflow: 'auto' }}
    >
      {(local.subprojects || []).map((sub) => (
        <SubprojectEditor
          key={sub.id}
          sub={sub}
          editorTaskId={editorTaskId}
          setEditorTaskId={handleSetEditorId}
          onDelete={() => deleteSubproject(sub.id)}
          onUpdateText={(text) => updateSubText(sub.id, text)}
          onToggleCollapse={() => toggleSubCollapse(sub.id)}
          onUpdateNewTask={(text) => updateSubNewTask(sub.id, text)}
          onAddTask={(text, allowBlank) => addTask(sub.id, text, allowBlank)}
          handleTaskToggle={(taskId) => handleTaskToggle(sub.id, taskId)}
          handleTaskStar={(taskId) => handleTaskStar(sub.id, taskId)}
          handleTaskDelete={(taskId) => handleTaskDelete(sub.id, taskId)}
          onDragStart={handleDragStart(sub.id)}
          onDragOver={() => { /* noop - no extra logic needed */ }}
          onDrop={handleDrop(sub.id)}
          onDragEnd={handleDragEnd}
          onEditorSave={handleEditorSave(sub.id)}
          onEditorUpdate={handleEditorUpdate(sub.id)}
          onEditorClose={handleEditorClose}
          allPeople={allPeople}
          onOpenPeople={onOpenPeople}
          onCreatePerson={onCreatePerson}
          onTaskTitleChange={(taskId, newText) => updateTask(sub.id, taskId, { text: newText })}
          autoEdit={newlyAddedSubprojectId === sub.id}
          newlyAddedTaskId={newlyAddedTaskId}
          onClearNewTask={() => setNewlyAddedTaskId(null)}
          onReorder={handleReorderSubprojects}
          isDragging={draggedSubprojectId === sub.id}
        />
      ))}
      {/* replicates the FAB formerly living in the global bottom bar */}
      <button
        className="fab"
        onClick={() => setFabMenuOpen(!fabMenuOpen)}
        title={fabMenuOpen ? "Close menu" : "Add subproject"}
      >
        <span className="material-icons">{fabMenuOpen ? "close" : "add"}</span>
      </button>
      {fabMenuOpen && (
        <div className="fab-menu" role="menu">
          <button
            className="fab-small"
            onClick={() => {
              setFabMenuOpen(false);
            }}
            title="AI assisted subproject"
          >
            <span className="material-icons">auto_awesome</span>
            <span className="fab-label">AI assisted project design</span>
          </button>
          <button
            className="fab-small"
            onClick={() => {
              if (!addingRef.current) {
                addingRef.current = true;
                onAddSubproject("");
                setFabMenuOpen(false);
                setTimeout(() => {
                  addingRef.current = false;
                }, 500);
              }
            }}
            title="Add manual subproject"
          >
            <span className="material-icons">edit</span>
            <span className="fab-label">Add subproject</span>
          </button>
        </div>
      )}
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
  onAddSubproject: PropTypes.func,
};
