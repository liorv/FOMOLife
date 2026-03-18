const fs = require('fs');
const file = '../types/src/project.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "  people: ProjectTaskPerson[];\n}",
  "  people: ProjectTaskPerson[];\n  priority?: \"low\" | \"medium\" | \"high\";\n}"
);
fs.writeFileSync(file, content);
