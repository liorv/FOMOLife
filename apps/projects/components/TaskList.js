import React from "react";
import Task from "./Task";
import Person from "./Person";
import TaskEditor from "./TaskModal";

/**
 * Generic list renderer for tasks and people.
 * Renders <Person /> for people, <Task /> for everything else.
 * Inline editor appears beneath the active task.
 */
export default function TaskList({
  items = [],
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,
  handleStar,
  handleDelete,
  onTitleChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEditorSave,
  onEditorUpdate,
  onEditorClose,
  allPeople = [],
  onOpenPeople = () => {},
  onCreatePerson = () => {},
  editingPersonId,
  editingPersonName,
  setEditingPersonId,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
  handleTogglePersonDefault,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
}) {
  return (
    <>
      {items.map((item) => {
        const id = item.id;
        if (type === "people") {
          return (
            <Person
              key={id}
              id={id}
              person={item}
              editingPersonId={editingPersonId}
              editingPersonName={editingPersonName}
              setEditingPersonId={setEditingPersonId}
              setEditingPersonName={setEditingPersonName}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              handleTogglePersonDefault={
                handleTogglePersonDefault || handleToggle
              }
              handleDelete={handleDelete}
              asRow={true}
            />
          );
        }

        // task list row; we render the <Task /> component which itself
        // contains the <li>. when editing we pass the editor as children so
        // the task can display an expandable pane within the same list item.
        const row = (
          <Task
            key={id}
            item={item}
            id={id}
            type={type}
            editorTaskId={editorTaskId}
            setEditorTaskId={setEditorTaskId}
            handleToggle={handleToggle}
            handleStar={handleStar}
            handleDelete={handleDelete}
            onTitleChange={onTitleChange}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            newlyAddedTaskId={newlyAddedTaskId}
            onClearNewTask={onClearNewTask}
          />
        );

        if (type === "tasks" && editorTaskId === id) {
          // render the task row with the editor nested inside the same <li>
          const editor = (
            <div key={`${id}-editor`} className="task-editor-wrapper">
              <TaskEditor
                task={item}
                onSave={onEditorSave}
                onUpdateTask={onEditorUpdate}
                onClose={onEditorClose}
                allPeople={allPeople}
                onOpenPeople={onOpenPeople}
                onCreatePerson={onCreatePerson}
                inline={true}
              />
            </div>
          );
          return (
            <Task
              key={id}
              item={item}
              id={id}
              type={type}
              editorTaskId={editorTaskId}
              setEditorTaskId={setEditorTaskId}
              handleToggle={handleToggle}
              handleStar={handleStar}
              handleDelete={handleDelete}
              onTitleChange={onTitleChange}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            >
              {editor}
            </Task>
          );
        }

        return row;
      })}
    </>
  );
}
