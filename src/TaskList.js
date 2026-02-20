import React from 'react';
import Task from './Task';

export default function TaskList({ items = [], type, editorTaskIdx, setEditorTaskIdx, handleToggle, handleStar, handleDelete }) {
  return (
    <>
      {items.map((item, idx) => (
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
      ))}
    </>
  );
}
