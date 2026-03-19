const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsPage.tsx', 'utf8');

code = code.replace(/const prioWeight = \{ high: 3, medium: 2, low: 1 \};/, 'const prioWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };');

fs.writeFileSync('components/projects/ProjectsPage.tsx', code);
