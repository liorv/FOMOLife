const fs = require('fs');

const files = [
    'components/projects/ProjectsPage.tsx',
    'components/tasks/TasksPage.tsx',
    'components/contacts/ContactsPage.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Add paddingTop to the wrapper to make it uniform across all tabs
    content = content.replace(/paddingBottom: '40px'/g, "paddingTop: '40px', paddingBottom: '40px'");
    
    fs.writeFileSync(file, content);
}
console.log('Fixed wrapper padding in all 3 tabs');
