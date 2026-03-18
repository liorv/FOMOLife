const fs = require('fs');

const files = [
    'components/projects/ProjectsPage.tsx',
    'components/tasks/TasksPage.tsx',
    'components/contacts/ContactsPage.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace `<main className="main-layout">` with `<div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>`
    content = content.replace(/<main className="main-layout">/g, `<div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '40px' }}>`);
    content = content.replace(/<\/main>/g, `</div>`);
    
    // Also remove the `height: "100vh"` from the fallback
    content = content.replace(/height: "100vh"/g, `minHeight: "100%"`);
    
    fs.writeFileSync(file, content);
}
console.log('Fixed wrapper in all 3 tabs');
