import React from 'react';
import TaskRow from './TaskRow';

export default function Task({ item, id, type, editorTaskId, setEditorTaskId, handleToggle, handleStar, handleDelete, children }) {
  return (
    <li className={`${item.done ? 'done' : ''}${type === 'tasks' && editorTaskId === id ? ' editing' : ''}`}>
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
        />
      </div>

      {children && (
        <div className="task-editor-wrapper">
          {children}
        </div>
      )}
    </li>
  );
}
