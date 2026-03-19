const fs = require('fs');

function replaceFile(path, regex, replacement) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
}

replaceFile('styles/projects/tabs.css', /\.dashboard-body\s*\{[^}]+\}/, match => {
  return `.dashboard-body {
  display: flex;
  flex: 1 0 auto;
  overflow: visible;
}`;
});

replaceFile('styles/projects/tabs.css', /\.dashboard-content\s*\{[^}]+\}/, match => {
  return `.dashboard-content {
  flex: 1 0 auto;
  min-width: 0;
  overflow: visible;
  background: var(--color-bg);
  position: relative;
  display: flex;
  flex-direction: column;
}`;
});

replaceFile('styles/projects/tabs.css', /\.dashboard-content \.project-editor\s*\{[^}]+\}/, match => {
  return `.dashboard-content .project-editor {
  flex: 1 0 auto;
  overflow: visible;
}`;
});

console.log('done');
