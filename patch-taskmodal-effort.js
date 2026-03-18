const fs = require('fs');
let code = fs.readFileSync('packages/ui/src/TaskList/TaskModal.tsx', 'utf8');

code = code.replace(
  /const \[priority, setPriority\] = useState.*?;/,
  '$&\n  const [effort, setEffort] = useState<number | null | undefined>(task.effort);'
);

// add effort to latestRef
code = code.replace(
  /priority: task\.priority,/,
  '$&\n    effort: task.effort,'
);
code = code.replace(
  /latestRef\.current = \{ title, description, dueDate, priority, people \};/,
  'latestRef.current = { title, description, dueDate, priority, effort, people };'
);
code = code.replace(
  /\[title, description, dueDate, priority, people\]\);/,
  '[title, description, dueDate, priority, effort, people]);'
);

code = code.replace(
  /setPriority\(task\.priority\);/,
  '$&\n    setEffort(task.effort);'
);
code = code.replace(
  /task\.dueDate, task\.priority, JSON\.stringify\(task\.people\)/,
  'task.dueDate, task.priority, task.effort, JSON.stringify(task.people)'
);

code = code.replace(
  /priority: latest\.priority \? latest\.priority : null,/,
  '$&\n        effort: latest.effort !== undefined ? latest.effort : null,'
);
code = code.replace(
  /priority: priority \? priority : null,/,
  '$&\n      effort: effort !== undefined ? effort : null,'
);

// Add Effort UI Next to Priority
const effortHtml = `
          <div className="editor-section effort-section" style={{ marginTop: '16px' }}>
            <label htmlFor={\`task-effort-\${task.id || 'editor'}\`} className="desc-label">
              Effort (Days)
            </label>
            <input
              id={\`task-effort-\${task.id || 'editor'}\`}
              type="number"
              min="0"
              step="0.5"
              className="effort-input"
              value={effort || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                setEffort(val);
                const updatedTask = { ...task, effort: val };
                onUpdateTask(updatedTask);
              }}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', width: '100%', background: '#fff' }}
            />
          </div>
`;

code = code.replace(
  /(<select\s+id={`task-priority-\${task\.id \|\| 'editor'}`}.*?<\/select>)/s,
  '$1\n' + effortHtml
);

fs.writeFileSync('packages/ui/src/TaskList/TaskModal.tsx', code);
