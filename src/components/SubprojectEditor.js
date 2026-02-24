import React from "react";
import PropTypes from "prop-types";
import TaskList from "./TaskList";
import SubprojectRow from "./SubprojectRow";

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
}) {
  const collapsed = sub.collapsed;

  // when collapsed, just render a compact row; edit button will expand
  if (collapsed) {
    return (
      <SubprojectRow
        sub={sub}
        onEdit={onToggleCollapse}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className={"subproject" + (collapsed ? " collapsed" : "")}>
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
        <input
          id={`subproject-name-${sub.id}`}
          className="subproject-name-input"
          name="subproject-name"
          placeholder="Please name the subproject"
          value={sub.text}
          onChange={(e) => onUpdateText(e.target.value)}
        />
        <button
          className="delete"
          onClick={onDelete}
          title="Delete subproject"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
      <div className="subproject-body">
        <div className="subproject-tasks">
          <div className="add-task-row">
            <input
              id={`new-task-${sub.id}`}
              className="new-task-input"
              name="new-task"
              placeholder="New task"
              value={sub.newTaskText || ""}
              onChange={(e) => onUpdateNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddTask(sub.newTaskText || "");
                }
              }}
            />
            <button
              className="add-task-btn"
              onClick={() => onAddTask(sub.newTaskText || "")}
              title="Add task"
            >
              Add
            </button>
          </div>
          <ul className="item-list">
            <TaskList
              items={sub.tasks || []}
              type="tasks"
              editorTaskId={editorTaskId}
              setEditorTaskId={setEditorTaskId}
              handleToggle={handleTaskToggle}
              handleStar={handleTaskStar}
              handleDelete={handleTaskDelete}
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
};
