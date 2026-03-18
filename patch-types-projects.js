const fs = require('fs');
const file = 'packages/types/src/project.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  /** People assigned to this task */\n  people: ProjectTaskPerson[];\n}`,
  `  /** People assigned to this task */\n  people: ProjectTaskPerson[];\n  /** Task priority */\n  priority?: "low" | "medium" | "high";\n}`
);

fs.writeFileSync(file, content);
console.log('patched project.ts');
