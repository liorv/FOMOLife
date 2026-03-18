const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'components/projects/ProjectsPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// There might be inline limits on ProjectsPage
content = content.replace("style={{ display: 'flex', flexDirection: 'column', height: '100%' }}", "style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}");
content = content.replace("style={{ flex: 1, minHeight: 0 }}", "style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}");

fs.writeFileSync(file, content);
