const fs = require('fs');

function replaceFile(path, regex, replacement) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
}

replaceFile('styles/projects/tabs.css', /\.projects-dashboard {[^}]+}/, (match) => {
  return match.replace('flex: 1 0 auto;', 'flex: 1 1 auto;\n  min-height: 0;');
});

replaceFile('styles/projects/tabs.css', /\.dashboard-body {[^}]+}/, (match) => {
  return match.replace('flex: 1 0 auto;', 'flex: 1 1 auto;\n  min-height: 0;');
});

replaceFile('styles/projects/tabs.css', /\.dashboard-content {[^}]+}/, (match) => {
  return match.replace('flex: 1 0 auto;', 'flex: 1 1 auto;\n  min-height: 0;');
});

replaceFile('styles/projects/tabs.css', /\.dashboard-content \.project-editor {[^}]+}/, (match) => {
  return match.replace('flex: 1 0 auto;', 'flex: 1 1 auto;\n  min-height: 0;\n  overflow: hidden;');
});

console.log('done');
