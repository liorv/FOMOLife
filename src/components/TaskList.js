import React from 'react';
import Task from './Task';
import Person from './Person';
import TaskEditor from './TaskModal';

// TaskList serves as the generic list renderer for both tasks and people.
// When `type` is "people" we render <Person /> rows and wire the
// various person-specific callbacks; for everything else we delegate
// to the existing <Task /> component.  For the tasks list we also have
// the ability to render an inline editor directly underneath a task
// row when `editorTaskId` matches the item's id.
export default function TaskList({
  items = [],
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,          // used for task checkbox or person default toggle
  handleStar,
  handleDelete,
  // task-editor props (only relevant when type === 'tasks')
  onEditorSave,
  onEditorUpdate,
  onEditorClose,
  allPeople = [],
  onOpenPeople = () => {},
  onCreatePerson = () => {},
  // person-specific props (only used when type === 'people')
  editingPersonId,
  editingPersonName,
  setEditingPersonId,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
  handleTogglePersonDefault,
}) {
  return (
    <>
      {items.map(item => {
        const id = item.id;
        if (type === 'people') {
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
              handleTogglePersonDefault={handleTogglePersonDefault || handleToggle}
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
          />
        );

        if (type === 'tasks' && editorTaskId === id) {
          // render the task row followed by a sibling editor list item
          const editorLi = (
            <li key={`${id}-editor`} className="editor-panel">
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
            </li>
          );
          return [row, editorLi];
        }

        return row;
      })}
    </>
  );
}
