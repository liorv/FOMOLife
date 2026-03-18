const fs = require('fs');
const file = 'packages/types/src/task.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  people?: import("./project").ProjectTaskPerson[];\n}`,
  `  people?: import("./project").ProjectTaskPerson[];\n  /** Task priority */\n  priority?: "low" | "medium" | "high";\n}`
);

fs.writeFileSync(file, content);
console.log('patched task.ts');
