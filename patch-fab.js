const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsDashboard.tsx', 'utf8');

code = code.replace(
  /<button[\s\S]*?Create with AI\s*<\/button>/,
  '{!selectedProject && (\n              $&\n            )}'
);

fs.writeFileSync('components/projects/ProjectsDashboard.tsx', code);
