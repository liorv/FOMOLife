import React from "react";
import TaskRow from "./TaskRow";

export default function Task({
  item,
  id,
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,
  handleStar,
  handleDelete,
  onTitleChange,
  children,
  // drag callbacks forwarded from TaskList/App
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
}) {
  return (
    <li
      className={`${item.done ? "done" : ""}${type === "tasks" && editorTaskId === id ? " is-editing" : ""}`}
      draggable={type === "tasks"}
      onDragStart={(e) => {
        onDragStart && onDragStart(id, e);
      }}
      onDragOver={(e) => {
        if (type === "tasks") {
          e.preventDefault();
          onDragOver && onDragOver(id, e);
        }
      }}
      onDrop={(e) => {
        if (type === "tasks") {
          e.preventDefault();
          onDrop && onDrop(id, e);
        }
      }}
      onDragEnd={(e) => {
        onDragEnd && onDragEnd(id, e);
      }}
    >
      {/* header area – sits at top of container, now delegated to TaskRow */}
      <div className="task-header">
        <TaskRow
          item={item}
          id={id}
          type={type}
          editorTaskId={editorTaskId}
          setEditorTaskId={setEditorTaskId}
          handleToggle={handleToggle}
          handleStar={handleStar}
          handleDelete={handleDelete}
          onTitleChange={onTitleChange}
          newlyAddedTaskId={newlyAddedTaskId}
          onClearNewTask={onClearNewTask}
        />
      </div>

      {children}
    </li>
  );
}
