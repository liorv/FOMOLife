import React from 'react';

// A standalone row representing a single task's primary information such as
// checkbox, title, expand toggle, due date, people avatars, favorite star, and
// delete button. This component mirrors the header portion of the previous
// <Task> component and is now reusable wherever only the row itself is needed.

export default function TaskRow({
  item,
  idx,
  type,
  editorTaskIdx,
  setEditorTaskIdx,
  handleToggle,
  handleStar,
  handleDelete,
}) {
  return (
    <>
      {type === 'tasks' && (
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => handleToggle(idx)}
          className="task-checkbox"
          title={item.done ? 'Mark as incomplete' : 'Mark as complete'}
        />
      )}
      {type === 'tasks' && (
        <span
          className={`material-icons expand-icon${editorTaskIdx === idx ? ' open' : ''}`}
          onClick={() => setEditorTaskIdx(idx)}
          title={editorTaskIdx === idx ? ' Collapse editor' : 'Expand editor'}
          aria-hidden="true"
          style={{ cursor: 'pointer', marginRight: 6, fontSize: '1rem' }}
        >
          {editorTaskIdx === idx ? 'expand_less' : 'expand_more'}
        </span>
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
    </>
  );
}