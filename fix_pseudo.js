const fs = require('fs');
let layout = fs.readFileSync('styles/projects/layout.css', 'utf8');

layout = layout.replace(/\.content-panel > :first-child\s*\{\s*margin-top: 20px;\s*\}/, '');

layout += `
.content-panel::before {
  content: "";
  display: block;
  flex: 0 0 20px;
  height: 20px;
  min-height: 20px;
}
`;

fs.writeFileSync('styles/projects/layout.css', layout);
console.log('done');
