const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app/globals.css');
let content = fs.readFileSync(file, 'utf8');

// remove padding down on framework container
content = content.replace("padding-bottom: var(--nav-height);", "");
content = content.replace("background: #f8fafc;\n}", "background: #f8fafc;\n  padding-bottom: var(--nav-height);\n}"); // re-add incase it got mangled

fs.writeFileSync(file, content);
