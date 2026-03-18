const fs = require('fs');
const files = [
    'components/projects/ProjectsPage.tsx',
    'components/tasks/TasksPage.tsx',
    'components/contacts/ContactsPage.tsx'
];
for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Remove minHeight from the wrapper
    content = content.replace(/minHeight: '100%', /g, '');
    content = content.replace(/minHeight: "100%"/g, 'height: 0'); // For the fallback empty div, not really important but let's say height: 0 or just remove it
    
    fs.writeFileSync(file, content);
}
console.log('Removed minHeight: 100%');
