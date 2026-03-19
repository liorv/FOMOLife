const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsDashboard.tsx', 'utf8');

// I might have replaced `export interface ProjectsDashboardProps {` previously 
// let's look for type ProjectsDashboardProps = {
if (code.includes('type ProjectsDashboardProps = {')) {
    code = code.replace(/type ProjectsDashboardProps = {/, 'type ProjectsDashboardProps = {\n  onReprioritize?: (projectId: string) => void;');
} else if (code.includes('interface ProjectsDashboardProps {')) {
    if (code.includes('onReprioritize?: (projectId: string) => void;')) {
        // Already there... wait.
    } else {
        code = code.replace(/interface ProjectsDashboardProps \{/, 'interface ProjectsDashboardProps {\n  onReprioritize?: (projectId: string) => void;');
    }
}
fs.writeFileSync('components/projects/ProjectsDashboard.tsx', code);
