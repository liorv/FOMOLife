const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsDashboard.tsx', 'utf8');

// 1. Add onReprioritize to props
code = code.replace(/export interface ProjectsDashboardProps \{/, 'export interface ProjectsDashboardProps {\n  onReprioritize?: (projectId: string) => void;');
code = code.replace(/onTitleChange,/, 'onTitleChange,\n  onReprioritize,');

// 2. Add button in FAB
// The FAB section is around: `{selectedProject ? 'Create Subproject' : 'Create Project'}`
const buttonRegex = /<button\s+style=\{\{[\s\S]*?\}\}\s+onClick=\{\(\) => \{\s+setIsFabMenuOpen\(false\);\s+if \(selectedProject\) \{\s+onAddSubproject\?\.\(selectedProject\.id, ''\);\s+\}\s+else\s+\{\s+onAddProject\?\.\(\);\s+\}\s+\}\}[\s\S]*?<\/button>/;

const newButton = `
              {selectedProject && onReprioritize && (
                <button
                  style={{
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    padding: '10px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#333',
                    fontFamily: 'inherit',
                  }}
                  onClick={() => {
                    setIsFabMenuOpen(false);
                    onReprioritize(selectedProject.id);
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '18px', color: '#666' }}>
                    sort
                  </span>
                  Re-prioritize
                </button>
              )}
`;

code = code.replace(buttonRegex, (match) => match + '\n' + newButton);

fs.writeFileSync('components/projects/ProjectsDashboard.tsx', code);
console.log('Patched ProjectsDashboard.tsx');
