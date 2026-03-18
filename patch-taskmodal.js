const fs = require('fs');
const file = 'packages/ui/src/TaskList/TaskModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  const [dueDate, setDueDate] = useState(task.dueDate || "");`,
  `  const [dueDate, setDueDate] = useState(task.dueDate || "");\n  const [priority, setPriority] = useState<"low" | "medium" | "high" | undefined>(task.priority);`
);

content = content.replace(
  `    dueDate: task.dueDate || "",\n    people: initialPeople,\n  });`,
  `    dueDate: task.dueDate || "",\n    people: initialPeople,\n    priority: task.priority,\n  });`
);

content = content.replace(
  `  useEffect(() => {\n    latestRef.current = { title, description, dueDate, people };\n  }, [title, description, dueDate, people]);`,
  `  useEffect(() => {\n    latestRef.current = { title, description, dueDate, people, priority };\n  }, [title, description, dueDate, people, priority]);`
);

content = content.replace(
  `    setDueDate(task.dueDate || "");\n    const newPeople: PersonEntry[] = (task.people || []).map((p) => ({`,
  `    setDueDate(task.dueDate || "");\n    setPriority(task.priority);\n    const newPeople: PersonEntry[] = (task.people || []).map((p) => ({`
);

content = content.replace(
  `  }, [task.id, task.text, task.description, task.dueDate, JSON.stringify(task.people)]);`,
  `  }, [task.id, task.text, task.description, task.dueDate, task.priority, JSON.stringify(task.people)]);`
);

content = content.replace(
  `        dueDate: latest.dueDate || null,\n        people: normalizedPeople,\n      };\n      onUpdateTask(updatedTask);`,
  `        dueDate: latest.dueDate || null,\n        people: normalizedPeople,\n        priority: latest.priority,\n      };\n      onUpdateTask(updatedTask);`
);

content = content.replace(
  `      description,\n      people: normalizedPeople,\n      dueDate: dueDate || null,\n    };\n    onUpdateTask(updated);`,
  `      description,\n      people: normalizedPeople,\n      dueDate: dueDate || null,\n      priority,\n    };\n    onUpdateTask(updated);`
);

content = content.replace(
  `  // unique ids for inputs (avoid duplicates when multiple editors are mounted)\n  const dateId = \`task-date-\${task.id || 'editor'}\`;`,
  `  // unique ids for inputs (avoid duplicates when multiple editors are mounted)\n  const dateId = \`task-date-\${task.id || 'editor'}\`;\n  const priorityId = \`task-priority-\${task.id || 'editor'}\`;`
);

content = content.replace(
  `          <div className="editor-section date-section">\n            <label htmlFor={dateId} className="desc-label">\n              Due date\n            </label>`,
  `          <div className="editor-section date-section">\n            <label htmlFor={priorityId} className="desc-label">\n              Priority\n            </label>\n            <select\n              id={priorityId}\n              className="priority-select"\n              value={priority || ""}\n              onChange={(e) => {\n                const newValue = e.target.value as "low" | "medium" | "high" | undefined;\n                setPriority(newValue || undefined);\n                onUpdateTask({ ...task, priority: newValue || undefined });\n              }}\n            >\n              <option value="">None</option>\n              <option value="low">Low</option>\n              <option value="medium">Medium</option>\n              <option value="high">High</option>\n            </select>\n          </div>\n\n          <div className="editor-section date-section">\n            <label htmlFor={dateId} className="desc-label">\n              Due date\n            </label>`
);

fs.writeFileSync(file, content);
console.log('patched TaskModal.tsx');
