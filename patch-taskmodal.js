const fs = require('fs');

const file = 'packages/ui/src/TaskList/TaskModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// remove duplicated effort section. The first one is around lines 255-273. The second is around 277-295.
const effortRegex = /<div className="editor-section effort-section" style={{ marginTop: '16px' }}>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
// Wait, the effort-section is an entire block. Let's do it carefully.
