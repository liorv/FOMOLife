const fs = require('fs');
const file = 'src/TaskList/TaskModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('else // // handleCreateAndAdd(q);', '/* else no-op */');

fs.writeFileSync(file, content);
console.log('fixed');
