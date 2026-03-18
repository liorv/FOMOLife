const fs = require('fs');
const file = 'packages/ui/src/TaskList/TaskModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  const [priority, setPriority] = useState<"low" | "medium" | "high" | undefined>(task.priority);\n  const [priority, setPriority] = useState<"low" | "medium" | "high" | undefined>(task.priority);`,
  `  const [priority, setPriority] = useState<"low" | "medium" | "high" | undefined>(task.priority);`
);

fs.writeFileSync(file, content);
console.log('fixed dups');
