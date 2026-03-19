const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsDashboard.tsx', 'utf8');

code = code.replace(/export interface ProjectsDashboardProps \{/, 'export interface ProjectsDashboardProps {\n  onReprioritize?: (projectId: string) => void;');

fs.writeFileSync('components/projects/ProjectsDashboard.tsx', code);
