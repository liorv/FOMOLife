const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app/globals.css');
let content = fs.readFileSync(file, 'utf8');

// Stop main layout from scrolling the whole page
content = content.replace("  overflow: auto;", "  overflow: hidden;\n  height: 100vh; /* Lock to viewport */\n  height: 100dvh;");

// In frame-container or host-pane, allow scrolling
const hostPaneRegex = /\.host-pane \{\s*min-width: 0;\s*min-height: 0;\s*background: #fff;\s*\}/;
const newHostPane = `.host-pane {\n  min-width: 0;\n  min-height: 0;\n  background: #fff;\n  overflow-y: auto; /* Enable vertical scroll inside content area */\n  height: 100%;\n}`;

if (content.match(hostPaneRegex)) {
    content = content.replace(hostPaneRegex, newHostPane);
} else {
    // try a weaker regex
    content = content.replace(/\.host-pane\s*\{[^}]+\}/, newHostPane);
}

fs.writeFileSync(file, content);
console.log("Updated layout CSS");
