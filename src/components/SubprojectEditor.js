import React, { useState } from "react";
import PropTypes from "prop-types";
import TaskList from "./TaskList";
import SubprojectRow from "./SubprojectRow";

export default function SubprojectEditor({
  sub,
  project,
  editorTaskId,
  setEditorTaskId,
  onDelete,
  onUpdateText,
  onUpdateColor,
  onToggleCollapse,
  onAddTask,
  handleTaskToggle,
  handleTaskStar,
  handleTaskDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragOverSubprojectTile,
  onDragLeaveSubprojectTile,
  onDropOnSubprojectTile,
  isDragOverSubprojectTile = false,
  onEditorSave,
  onEditorUpdate,
  onEditorClose,
  allPeople,
  onOpenPeople,
  onCreatePerson,
  onTaskTitleChange,
  autoEdit = false,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
  onReorder = () => {},
  isDragging = false,
  taskFilter = null,
}) {
  // Apply filter to the task list if one is active
  const visibleTasks = React.useMemo(() => {
    if (!taskFilter) return sub.tasks || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(today.getDate() + 7);
    return (sub.tasks || []).filter((t) => {
      if (taskFilter === "starred") return (t.starred || t.favorite) && !t.done;
      if (taskFilter === "overdue") return !t.done && t.dueDate && new Date(t.dueDate) < today;
      if (taskFilter === "upcoming") {
        if (t.done || !t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= today && d <= inSeven;
      }
      return true;
    });
  }, [sub.tasks, taskFilter]);
  // --- AddBar open/close ---

  const collapsed = sub.collapsed;
  const [editingName, setEditingName] = React.useState(
    () => autoEdit && (!sub.text || sub.text.trim() === "")
  );
  const [draftName, setDraftName] = React.useState(sub.text || "");

  // --- Subproject drag/drop ---

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
    let data = "";
    try {
      data = e.dataTransfer?.getData("application/json") || "";
    } catch (err) {
      return;
    }

    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.subprojectId && parsed.subprojectId !== sub.id) {
        // ── Subproject reorder ─────────────────────────────────
        onReorder(parsed.subprojectId, sub.id);
      } else if (parsed.taskId) {
        // ── Task dropped onto a subproject header / tile ───────
        // Delegate to the same handler used by collapsed-tile drops
        // so the task is moved into this subproject.
        if (onDropOnSubprojectTile) onDropOnSubprojectTile(e);
      }
    } catch (err) {
      // Silently handle parse errors
    }
  };

  // --- Render ---

  const wrapperClass = "subproject" + (collapsed ? " collapsed" : "");

  return (
    <div
      className={wrapperClass}
      draggable
      onDragStart={handleSubDragStart}
      onDragOver={handleSubDragOver}
      onDrop={handleSubDrop}
      style={{ 
        opacity: isDragging ? 0.5 : 1, 
        overflow: 'visible',
        backgroundColor: isDragOverSubprojectTile ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
        borderLeft: isDragOverSubprojectTile ? '3px solid #1a73e8' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {collapsed ? (
        <SubprojectRow
          sub={sub}
          project={project}
          onEdit={onToggleCollapse}
          onNameChange={(newName) => onUpdateText(newName)}
          onColorChange={(id, color) => onUpdateColor(color)}
          onDelete={onDelete}
          onDragOverSubprojectTile={onDragOverSubprojectTile}
          onDragLeaveSubprojectTile={onDragLeaveSubprojectTile}
          onDropOnSubprojectTile={onDropOnSubprojectTile}
          isDragOverSubprojectTile={isDragOverSubprojectTile}
          autoEdit={autoEdit}
          isDragging={isDragging}
          /* drag handled by wrapper */
        />
      ) : (
        <>
          <div 
            className="subproject-summary"
            onDragOver={(e) => {
              e.preventDefault();
              if (onDragOverSubprojectTile) onDragOverSubprojectTile();
            }}
            onDragLeave={() => {
              if (onDragLeaveSubprojectTile) onDragLeaveSubprojectTile();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (onDropOnSubprojectTile) onDropOnSubprojectTile(e);
            }}
          >
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
              className="material-icons subproject-icon" 
              aria-hidden="true"
              style={
                (sub.color || (sub.isProjectLevel && project?.color))
                  ? { color: sub.color || project?.color }
                  : {}
              }
            >
              {sub.isProjectLevel ? "assignment_turned_in" : "folder"}
            </span>
            {!sub.isProjectLevel && editingName ? (
              <input
                className="subproject-name-input-expanded"
                value={draftName}
                maxLength={100}
                autoFocus
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => {
                  setEditingName(false);
                  onUpdateText(draftName);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                }}
              />
            ) : (
              <span
                className="subproject-name-display"
                title={sub.isProjectLevel ? "Tasks" : sub.text}
              >
                {sub.isProjectLevel ? "Tasks" : sub.text}
              </span>
            )}
            {!sub.isProjectLevel && !editingName && (
              <button
                className="subproject-name-edit-btn"
                onClick={() => { setDraftName(sub.text || ""); setEditingName(true); }}
                title="Rename sub-project"
              >
                <span className="material-icons">edit</span>
              </button>
            )}
            <div style={{ flex: '1 1 auto' }} />
          </div>
          <div className="subproject-body">
            <div className="subproject-tasks">
              <ul className="item-list">
                <TaskList
                  items={visibleTasks}
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
        </>
      )}
    </div>
  );
}

SubprojectEditor.propTypes = {
  sub: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string,
    collapsed: PropTypes.bool,
    tasks: PropTypes.array,
  }).isRequired,
  editorTaskId: PropTypes.string,
  setEditorTaskId: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
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
  onTaskTitleChange: PropTypes.func,
  autoEdit: PropTypes.bool,
  newlyAddedTaskId: PropTypes.string,
  onClearNewTask: PropTypes.func,
  onReorder: PropTypes.func,
  isDragging: PropTypes.bool,
};
