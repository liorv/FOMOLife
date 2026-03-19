const fs = require('fs');
let content = fs.readFileSync('components/projects/ProjectEditor.tsx', 'utf8');

content = content.replace(/      \{\$0\}\n/, '');

fs.writeFileSync('components/projects/ProjectEditor.tsx', content);
