const fs = require('fs');

let taskFile = fs.readFileSync('packages/ui/src/TaskList/Task.tsx', 'utf8');
taskFile = taskFile.replace(
  /  onTaskUpdate\?: \(taskId: string, updates: Partial<ProjectTask>\) => void;\n  onTaskUpdate\?: \(taskId: string, updates: Partial<ProjectTask>\) => void;/g,
  '  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;'
);
fs.writeFileSync('packages/ui/src/TaskList/Task.tsx', taskFile);

let rowFile = fs.readFileSync('packages/ui/src/TaskList/TaskRow.tsx', 'utf8');
// 1. add onTaskUpdate to props
rowFile = rowFile.replace(
  /onDragEnd\?: \(taskId: string, e: React\.DragEvent\) => void;/g,
  '$&\n  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;'
);
rowFile = rowFile.replace(
  /onDragEnd,\n\s*newlyAddedTaskId/g,
  'onDragEnd,\n  onTaskUpdate,\n  newlyAddedTaskId'
);

// 2. Add an inline priority select logic and UI 
// find `{item.priority && (` and replace the badge with our custom priority select.

let priorityBadgeRegex = /\{item\.priority && \(\s*<span className=\{`priority-badge`\}.*?<\/span>\s*\)\}/s;

const newPriorityHtml = `
              {type === "tasks" ? (
                <select
                  value={item.priority || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newPri = val === "" ? null : val;
                    onTaskUpdate?.(id, { priority: newPri as any });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    outline: 'none',
                    background: item.priority === 'high' ? '#ffebee' : item.priority === 'medium' ? '#fff3e0' : item.priority === 'low' ? '#f5f5f5' : 'transparent',
                    color: item.priority === 'high' ? '#c62828' : item.priority === 'medium' ? '#e65100' : item.priority === 'low' ? '#616161' : '#ccc'
                  }}
                  title="Change priority"
                >
                  <option value="" style={{ color: '#ccc', fontStyle: 'italic' }}>PRIORITY</option>
                  <option value="low" style={{ color: '#616161' }}>LOW</option>
                  <option value="medium" style={{ color: '#e65100' }}>MEDIUM</option>
                  <option value="high" style={{ color: '#c62828' }}>HIGH</option>
                </select>
              ) : item.priority ? (
                <span className={\`priority-badge\`} style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  background: item.priority === 'high' ? '#ffebee' : item.priority === 'medium' ? '#fff3e0' : '#f5f5f5',
                  color: item.priority === 'high' ? '#c62828' : item.priority === 'medium' ? '#e65100' : '#616161'
                }}>
                  {item.priority}
                </span>
              ) : null}
`;

rowFile = rowFile.replace(priorityBadgeRegex, newPriorityHtml);

fs.writeFileSync('packages/ui/src/TaskList/TaskRow.tsx', rowFile);
