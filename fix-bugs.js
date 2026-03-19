const fs = require('fs');

// 1. Fix TaskModal.tsx
let modalContent = fs.readFileSync('packages/ui/src/TaskList/TaskModal.tsx', 'utf8');

const priorityRegex = /<div className="editor-section priority-section">[\s\S]*?<\/select>\s*<\/div>/;
modalContent = modalContent.replace(priorityRegex, '');

// The effort section is duplicated. I will match the first one and replace both? 
// No, I'll match the first one and replace it with empty, leaving the second.
const effortRegex = /<div className="editor-section effort-section"\s+style={{ marginTop:\s*'16px'\s*}}>[\s\S]*?<\/div>\n/;
modalContent = modalContent.replace(effortRegex, '');

fs.writeFileSync('packages/ui/src/TaskList/TaskModal.tsx', modalContent);

console.log("Fixed TaskModal.tsx");
