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
  id,
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,
  handleStar,
  handleDelete,
  // optional callback for inline title edits
  onTitleChange,
}) {
  const isOpen = editorTaskId === id;
  // determine if due date exists and is in the past and compute days left
  let isPast = false;
  let daysLeft = null;
  if (item.dueDate) {
    const due = new Date(item.dueDate);
    const now = new Date();
    // difference in full days (ceiling so any partial day counts as 1)
    const msPerDay = 24 * 60 * 60 * 1000;
    daysLeft = Math.ceil((due - now) / msPerDay);
    isPast = daysLeft <= 0;
  }

  return (
    // container flex ensures left/middle/right segments and full width
    <div className="task-row">
      {/* left group: expand, checkbox, title */}
      <div className="left-group">
        {type === 'tasks' && (
          <span
            className={`material-icons expand-icon${isOpen ? ' open' : ''}`}
            onClick={() => setEditorTaskId(id)}
            title={isOpen ? ' Collapse editor' : 'Expand editor'}
            aria-hidden="true"
          >
            {isOpen ? 'expand_more' : 'chevron_right'}
          </span>
        )}

        {type === 'tasks' && (
          <input
            id={`task-${id}-done`}
            name={`task-${id}-done`}
            type="checkbox"
            checked={item.done}
            onChange={() => handleToggle(id)}
            className="task-checkbox"
            title={item.done ? 'Mark as incomplete' : 'Mark as complete'}
          />
        )}

        <span
          className="task-title"
          onClick={() => (type === 'tasks' ? setEditorTaskId(id) : undefined)}
          style={{
            cursor: type === 'tasks' ? 'pointer' : 'default',
            textDecoration: item.done ? 'line-through' : undefined,
          }}
        >
          {item.text}
        </span>
      </div>

      {/* middle group: date centered */}
      {item.dueDate && (
        <div className="date-container">
          <span
            className="task-date"
            style={{
              color: isPast ? 'red' : undefined,
              fontSize: '0.95em',
            }}
          >
            {/* show full text by default, fall back to short form in tight layouts */}
            {daysLeft !== null && (
              <>
                <span className="full">
                  {isPast
                    ? 'overdue'
                    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                </span>
                <span className="short">
                  {isPast ? 'OD' : `${daysLeft}d`}
                </span>
              </>
            )}
          </span>
        </div>
      )}

      {/* right group: notify avatars, star, delete */}
      <div className="right-group">
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
            onClick={() => handleStar(id)}
            aria-label={item.favorite ? 'Unstar' : 'Star'}
          >
            <span className="material-icons">
              {item.favorite ? 'star' : 'star_border'}
            </span>
          </button>
        )}
        <button
          className="delete"
          onClick={() => handleDelete(id)}
          aria-label="Delete"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
}