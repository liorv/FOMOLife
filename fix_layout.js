const fs = require('fs');

let layout = fs.readFileSync('styles/projects/layout.css', 'utf8');
layout = layout.replace(/\.content-panel\s*\{[^}]+\}/, `\.content-panel {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  max-width: 800px;
  overflow-y: auto;
}`);
fs.writeFileSync('styles/projects/layout.css', layout);

let tabs = fs.readFileSync('styles/projects/tabs.css', 'utf8');
tabs = tabs.replace(/\.projects-dashboard\s*\{[^}]+\}/, match => {
  return match.replace(/flex: [^;]+;/, 'flex: 1 0 auto;')
              .replace(/margin-top: [^;]+;/, '')
              .replace(/display: flex;/, 'display: flex;\n  margin-top: 20px;');
});
fs.writeFileSync('styles/projects/tabs.css', tabs);

let projects = fs.readFileSync('styles/projects/projects.css', 'utf8');
projects = projects.replace(/\.project-editor-scroll-area\s*\{[^}]+\}/, `\.project-editor-scroll-area {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
}`);
// Remove overflow: hidden from .project-editor, make it 1 0 auto
projects = projects.replace(/\.project-editor\s*\{[^}]+\}/, `\.project-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1 0 auto;
}`);
fs.writeFileSync('styles/projects/projects.css', projects);

console.log('done');
