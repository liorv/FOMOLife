import React from 'react';

// A standalone row representing a single task's primary information.
// Ordered columns (left→right):
//   1. expand toggle
//   2. completion checkbox
//   3. task string (editable when row is open)
//   4. date (rendered red when in the past)
//   5. people to notify (avatars)
//   6. star toggle
//   7. delete button
// Left items expand naturally; the final three are pushed to the right by
// virtue of a flex container with `margin-left: auto`.
// Input validation for the title enforces [a-zA-Z0-9 ]+.  The component also
// accepts `onTitleChange` for inline edits.  Additional task details live
// in the editor.

export default function TaskRow({
  item,
  idx,
  type,
  editorTaskIdx,
  setEditorTaskIdx,
  handleToggle,
  handleStar,
  handleDelete,
  // optional callback for inline title edits
  onTitleChange,
}) {
  const isOpen = editorTaskIdx === idx;
  const [localText, setLocalText] = React.useState(item.text);
  // determine if due date exists and is in the past
  const isPast = item.dueDate && new Date(item.dueDate) < new Date();

  // keep local state in sync if parent updates the task text
  React.useEffect(() => {
    setLocalText(item.text);
  }, [item.text]);

  const handleTextInput = e => {
    const val = e.target.value;
    // only allow alphanumeric and space (validation from table)
    if (/^[a-zA-Z0-9 ]*$/.test(val)) {
      setLocalText(val);
      if (onTitleChange) onTitleChange(val, idx);
    }
  };

  return (
    // container flex ensures left/middle/right segments and full width
    <div
      className="task-row"
      style={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%' }}
    >
      {/* left group: expand, checkbox, title */}
      <div className="left-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {type === 'tasks' && (
          <span
            className={`material-icons expand-icon${isOpen ? ' open' : ''}`}
            onClick={() => setEditorTaskIdx(idx)}
            title={isOpen ? ' Collapse editor' : 'Expand editor'}
            aria-hidden="true"
            style={{ cursor: 'pointer', fontSize: '1rem' }}
          >
            {isOpen ? 'expand_more' : 'chevron_right'}
          </span>
        )}

        {type === 'tasks' && (
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => handleToggle(idx)}
            className="task-checkbox"
            title={item.done ? 'Mark as incomplete' : 'Mark as complete'}
          />
        )}

        {isOpen ? (
          <input
            className="task-title-input"
            value={localText}
            onChange={handleTextInput}
            pattern="[a-zA-Z0-9 ]+"
          />
        ) : (
          <span
            className="task-title"
            onClick={() => (type === 'tasks' ? setEditorTaskIdx(idx) : undefined)}
            style={{
              cursor: type === 'tasks' ? 'pointer' : 'default',
              textDecoration: item.done ? 'line-through' : undefined,
            }}
          >
            {item.text}
          </span>
        )}
      </div>

      {/* middle group: date centered */}
      {item.dueDate && (
        <div className="date-container" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span
            className="task-date"
            style={{
              color: isPast ? 'red' : undefined,
              fontSize: '0.95em',
            }}
          >
            {item.dueDate}
          </span>
        </div>
      )}

      {/* right group: notify avatars, star, delete */}
      <div className="right-group" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {type === 'tasks' && (item.people || []).length > 0 && (
          <div className="notify-people" title={(item.people || []).map(p => p.name).join(', ')}>
            {((item.people || []).slice(0,2)).map(p => (
              <div key={p.name} className="avatar small">{p.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
            ))}
            {(item.people || []).length > 2 && (
              <div className="people-count">+{(item.people || []).length - 2}</div>
            )}
          </div>
        )}
        {type === 'tasks' && (
          <button
            className={item.favorite ? 'star favorite' : 'star'}
            title={item.favorite ? 'Unstar' : 'Star'}
            onClick={() => handleStar(idx)}
            aria-label={item.favorite ? 'Unstar' : 'Star'}
          >
            <span className="material-icons">
              {item.favorite ? 'star' : 'star_border'}
            </span>
          </button>
        )}
        <button
          className="delete"
          onClick={() => handleDelete(idx)}
          aria-label="Delete"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
}