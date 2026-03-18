const fs = require('fs');
const file = '../types/src/project.ts';
let content = fs.readFileSync(file, 'utf8');

// Debug check
if (!content.includes('people: ProjectTaskPerson[];')) {
    console.log('pattern not found');
    process.exit(1);
}

content = content.replace(
  /  people: ProjectTaskPerson\[\];\n\}/g,
  `  people: ProjectTaskPerson[];\n  /** Task priority */\n  priority?: "low" | "medium" | "high";\n}`
);

fs.writeFileSync(file, content);
console.log('patched project.ts again effectively');
