import React from 'react';

export default function Task({ item, idx, type, editorTaskIdx, setEditorTaskIdx, handleToggle, handleStar, handleDelete }) {
  return (
    <li key={idx} className={`${item.done ? 'done' : ''}${type === 'tasks' && editorTaskIdx === idx ? ' editing' : ''}`}>
      {type === 'tasks' && (
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => handleToggle(idx)}
          className="task-checkbox"
          title={item.done ? 'Mark as incomplete' : 'Mark as complete'}
        />
      )}
      <span
        className="task-title"
        onClick={() => type === 'tasks' ? setEditorTaskIdx(idx) : undefined}
        style={{ cursor: type === 'tasks' ? 'pointer' : 'default', textDecoration: item.done ? 'line-through' : undefined }}
      >
        {item.text}
      </span>
      {type === 'tasks' && (
        <>
          {item.dueDate && (
            <span className="due-date"><span className="material-icons" style={{verticalAlign: 'middle', fontSize: '1rem', marginRight:6}}>event</span>{item.dueDate}</span>
          )}

          {(item.people || []).length > 0 && (
            <div className="task-people" title={(item.people || []).map(p => p.name).join(', ')}>
              {((item.people || []).slice(0,2)).map(p => (
                <div key={p.name} className="avatar small">{p.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
              ))}
              {(item.people || []).length > 2 && (
                <div className="people-count">+{(item.people || []).length - 2}</div>
              )}
            </div>
          )}

          <button
            className={item.favorite ? 'star favorite' : 'star'}
            title={item.favorite ? 'Unstar' : 'Star'}
            onClick={() => handleStar(idx)}
            aria-label={item.favorite ? 'Unstar' : 'Star'}
          >
            <span className="material-icons">{item.favorite ? 'star' : 'star_border'}</span>
          </button>
        </>
      )}
      <button className="delete" onClick={() => handleDelete(idx)} aria-label="Delete"><span className="material-icons">close</span></button>
    </li>
  );
}
