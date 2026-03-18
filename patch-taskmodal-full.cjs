const fs = require('fs');
const file = 'packages/ui/src/TaskList/TaskModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  const latestRef = React.useRef({
    title: task.text || "",
    description: task.description || "",
    dueDate: task.dueDate || "",
    people: initialPeople,
  });
  useEffect(() => {
    latestRef.current = { title, description, dueDate, people };
  }, [title, description, dueDate, people]);`,
  `  const latestRef = React.useRef({
    title: task.text || "",
    description: task.description || "",
    dueDate: task.dueDate || "",
    priority: task.priority,
    people: initialPeople,
  });
  useEffect(() => {
    latestRef.current = { title, description, dueDate, priority, people };
  }, [title, description, dueDate, priority, people]);`
);

content = content.replace(
  `    setDueDate(task.dueDate || "");
    const newPeople: PersonEntry[] = (task.people || []).map((p) => ({`,
  `    setDueDate(task.dueDate || "");
    setPriority(task.priority);
    const newPeople: PersonEntry[] = (task.people || []).map((p) => ({`
);

content = content.replace(
  `        text: latest.title,
        description: latest.description,
        dueDate: latest.dueDate || null,
        people: normalizedPeople,
      };`,
  `        text: latest.title,
        description: latest.description,
        dueDate: latest.dueDate || null,
        priority: latest.priority,
        people: normalizedPeople,
      };`
);

content = content.replace(
  `      ...task,
      text: title,
      description,
      people: normalizedPeople,
      dueDate: dueDate || null,
    };`,
  `      ...task,
      text: title,
      description,
      people: normalizedPeople,
      priority,
      dueDate: dueDate || null,
    };`
);

content = content.replace(
  `  // unique ids for inputs (avoid duplicates when multiple editors are mounted)
  const dateId = \`task-date-\${task.id || 'editor'}\`;`,
  `  // unique ids for inputs (avoid duplicates when multiple editors are mounted)
  const dateId = \`task-date-\${task.id || 'editor'}\`;
  const priorityId = \`task-priority-\${task.id || 'editor'}\`;`
);

content = content.replace(
  `          <div className="editor-section date-section">
            <label htmlFor={dateId} className="desc-label">
              Due date
            </label>`,
  `          <div className="editor-section priority-section">
            <label htmlFor={priorityId} className="desc-label">
              Priority
            </label>
            <select
              id={priorityId}
              className="priority-select"
              value={priority || ""}
              onChange={(e) => {
                const newValue = e.target.value as "low" | "medium" | "high" | "";
                setPriority(newValue || undefined);
                onUpdateTask({ ...task, priority: newValue || undefined });
              }}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '100%', marginBottom: '16px' }}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="editor-section date-section">
            <label htmlFor={dateId} className="desc-label">
              Due date
            </label>`
);

fs.writeFileSync(file, content);
console.log('patched taskmodal fully');
