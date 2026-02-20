import React from 'react';
import TaskRow from './TaskRow';

export default function Task({ item, idx, type, editorTaskIdx, setEditorTaskIdx, handleToggle, handleStar, handleDelete, children }) {
  return (
    <li className={`${item.done ? 'done' : ''}${type === 'tasks' && editorTaskIdx === idx ? ' editing' : ''}`}>
      {/* header area – sits at top of container, now delegated to TaskRow */}
      <div className="task-header">
        <TaskRow
          item={item}
          idx={idx}
          type={type}
          editorTaskIdx={editorTaskIdx}
          setEditorTaskIdx={setEditorTaskIdx}
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
