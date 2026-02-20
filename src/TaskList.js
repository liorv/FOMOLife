import React from 'react';
import Task from './Task';
import Person from './Person';

// TaskList serves as the generic list renderer for both tasks and people.
// When `type` is "people" we render <Person /> rows and wire the
// various person-specific callbacks; for everything else we delegate
// to the existing <Task /> component.
export default function TaskList({
  items = [],
  type,
  editorTaskIdx,
  setEditorTaskIdx,
  handleToggle,          // used for task checkbox or person default toggle
  handleStar,
  handleDelete,
  // person-specific props (only used when type === 'people')
  editingPersonIdx,
  editingPersonName,
  setEditingPersonIdx,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
  handleTogglePersonDefault,
}) {
  return (
    <>
      {items.map((item, idx) => {
        if (type === 'people') {
          return (
            <Person
              key={idx}
              person={item}
              idx={idx}
              editingPersonIdx={editingPersonIdx}
              editingPersonName={editingPersonName}
              setEditingPersonIdx={setEditingPersonIdx}
              setEditingPersonName={setEditingPersonName}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              handleTogglePersonDefault={handleTogglePersonDefault || handleToggle}
              handleDelete={handleDelete}
              asRow={true}
            />
          );
        }

        // fallback to task rendering
        return (
          <Task
            key={idx}
            item={item}
            idx={idx}
            type={type}
            editorTaskIdx={editorTaskIdx}
            setEditorTaskIdx={setEditorTaskIdx}
            handleToggle={handleToggle}
            handleStar={handleStar}
            handleDelete={handleDelete}
          />
        );
      })}
    </>
  );
}
