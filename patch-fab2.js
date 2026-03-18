const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsDashboard.tsx', 'utf8');

const regex = /(<button[\s\S]*?Create with AI\s*<\/button>)/;
code = code.replace(
  regex,
  '{!selectedProject && (\n              $1\n            )}'
);

fs.writeFileSync('components/projects/ProjectsDashboard.tsx', code);
