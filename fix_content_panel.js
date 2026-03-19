const fs = require('fs');

let layout = fs.readFileSync('styles/projects/layout.css', 'utf8');

// append generic first-child margin
layout += `
.content-panel > :first-child {
  margin-top: 20px;
}
`;

fs.writeFileSync('styles/projects/layout.css', layout);

// remove explicit margin-top: 20px from .projects-dashboard
let tabs = fs.readFileSync('styles/projects/tabs.css', 'utf8');
tabs = tabs.replace('  margin-top: 20px;\n', '');
fs.writeFileSync('styles/projects/tabs.css', tabs);

console.log('done');
