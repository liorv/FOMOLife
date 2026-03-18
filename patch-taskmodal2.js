const fs = require('fs');
const file = 'packages/ui/src/TaskList/TaskModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/handleCreateAndAdd\(q\)/g, '// handleCreateAndAdd(q)');
content = content.replace(/onClick=\{\(\) => handleCreateAndAdd\(newName\)\}/g, '/* onClick disabled */');
content = content.replace(/Add "\{newName\}"/g, 'Contact "{newName}" not found');
content = content.replace(/create and add to task/g, 'Must be invited first');

fs.writeFileSync(file, content);
console.log('patched');
