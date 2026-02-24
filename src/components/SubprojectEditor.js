import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import TaskList from "./TaskList";
import SubprojectRow from "./SubprojectRow";
import AddBar from "./AddBar";

export default function SubprojectEditor({
  sub,
  editorTaskId,
  setEditorTaskId,
  onDelete,
  onUpdateText,
  onToggleCollapse,
  onUpdateNewTask,
  onAddTask,
  handleTaskToggle,
  handleTaskStar,
  handleTaskDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEditorSave,
  onEditorUpdate,
  onEditorClose,
  allPeople,
  onOpenPeople,
  onCreatePerson,
  // new callback for inline title edits within tasks
  onTaskTitleChange,
  autoEdit = false,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
  onReorder = () => {},
  isDragging = false,
}) {
  const collapsed = sub.collapsed;
  const [showAddBar, setShowAddBar] = React.useState(false);
  const [addBarInput, setAddBarInput] = React.useState("");
  const addBarRef = React.useRef(null);

  // Close AddBar when clicking outside
  React.useEffect(() => {
    if (!showAddBar) return;

    const handleClickOutside = (e) => {
      if (addBarRef.current && !addBarRef.current.contains(e.target)) {
        setShowAddBar(false);
        setAddBarInput("");
      }
    };

    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        setShowAddBar(false);
        setAddBarInput("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showAddBar]);

  // Open AddBar when plus button is clicked
  const openAddBar = () => {
    setShowAddBar(true);
    setAddBarInput("");
  };

  // Handle adding task from AddBar
  const handleAddBarAdd = () => {
    if (!addBarInput.trim()) return;
    onAddTask(addBarInput);
    setAddBarInput("");
  };

  const handleSubDragStart = (e) => {
    try {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/json", JSON.stringify({
          subprojectId: sub.id,
        }));
      }
    } catch (err) {
      // dataTransfer might not be available in test environment
    }
  };

  const handleSubDragOver = (e) => {
    e.preventDefault();
    try {
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    } catch (err) {
      // dataTransfer might not be available
    }
  };

  const handleSubDrop = (e) => {
    e.preventDefault();
    // Safely get data, handling cases where dataTransfer is not properly set up
    let data = "";
    try {
      data = e.dataTransfer?.getData("application/json") || "";
    } catch (err) {
      // dataTransfer might not be available or might throw
      return;
    }
    
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      // Only process if it has a subprojectId (for subproject reordering)
      if (parsed.subprojectId && parsed.subprojectId !== sub.id) {
        onReorder(parsed.subprojectId, sub.id);
      }
    } catch (err) {
      // Silently handle parse errors
    }
  };

  // when collapsed, just render a compact row; edit button will expand
  if (collapsed) {
    return (
      <SubprojectRow
        sub={sub}
        onEdit={onToggleCollapse}
        onNameChange={(newName) => onUpdateText(newName)}
        onDelete={onDelete}
        autoEdit={autoEdit}
        onReorder={onReorder}
        isDragging={isDragging}
      />
    );
  }

  return (
    <div 
      className={"subproject" + (collapsed ? " collapsed" : "")}
      draggable
      onDragStart={handleSubDragStart}
      onDragOver={handleSubDragOver}
      onDrop={handleSubDrop}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="subproject-summary">
        <button
          className="collapse-btn"
          onClick={(e) => {
            e.preventDefault();
            onToggleCollapse();
          }}
          title={collapsed ? "Show tasks" : "Hide tasks"}
        >
          <span className="material-icons">
            {collapsed ? "expand_more" : "expand_less"}
          </span>
        </button>
        <span
          className="subproject-name-display"
          title={sub.text}
        >
          {sub.text}
        </span>
        {/* spacer pushes menu to the right */}
        <div style={{ flex: '1 1 auto' }} />
        <button
          className="add-task-header-btn"
          title="AddTask"
          onClick={openAddBar}
        >
          <span className="material-icons">add</span>
          <span className="add-task-label">Task</span>
        </button>
      </div>
      <div className="subproject-body">
        <div className="subproject-tasks">
          <ul className="item-list">
            {showAddBar && (
              <li className="add-bar-wrapper" ref={addBarRef}>
                <AddBar
                  type="task"
                  input={addBarInput}
                  dueDate=""
                  onInputChange={setAddBarInput}
                  onDueDateChange={() => {}}
                  onAdd={handleAddBarAdd}
                />
              </li>
            )}
            <TaskList
              items={sub.tasks || []}
              type="tasks"
              editorTaskId={editorTaskId}
              setEditorTaskId={setEditorTaskId}
              handleToggle={handleTaskToggle}
              handleStar={handleTaskStar}
              handleDelete={handleTaskDelete}
              onTitleChange={onTaskTitleChange}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onEditorSave={onEditorSave}
              onEditorUpdate={onEditorUpdate}
              onEditorClose={onEditorClose}
              allPeople={allPeople}
              onOpenPeople={onOpenPeople}
              onCreatePerson={onCreatePerson}
              newlyAddedTaskId={newlyAddedTaskId}
              onClearNewTask={onClearNewTask}
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

SubprojectEditor.propTypes = {
  sub: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string,
    collapsed: PropTypes.bool,
    newTaskText: PropTypes.string,
    tasks: PropTypes.array,
  }).isRequired,
  editorTaskId: PropTypes.string,
  setEditorTaskId: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
  onUpdateNewTask: PropTypes.func.isRequired,
  onAddTask: PropTypes.func.isRequired,
  handleTaskToggle: PropTypes.func.isRequired,
  handleTaskStar: PropTypes.func.isRequired,
  handleTaskDelete: PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  onEditorSave: PropTypes.func.isRequired,
  onEditorUpdate: PropTypes.func.isRequired,
  onEditorClose: PropTypes.func.isRequired,
  allPeople: PropTypes.array,
  onOpenPeople: PropTypes.func,
  onCreatePerson: PropTypes.func,
  onTaskTitleChange: PropTypes.func, // optional inline title callback
  autoEdit: PropTypes.bool,
  newlyAddedTaskId: PropTypes.string,
  onClearNewTask: PropTypes.func,
  onReorder: PropTypes.func,
  isDragging: PropTypes.bool,
};
