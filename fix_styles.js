const fs = require('fs');

// layout.css
let layoutContent = fs.readFileSync('styles/projects/layout.css', 'utf8');
layoutContent = layoutContent.replace(/  max-width: 800px;\n  overflow-y: auto;\n\}/g, '  max-width: 800px;\n}');
fs.writeFileSync('styles/projects/layout.css', layoutContent);

// projects.css
let projectsContent = fs.readFileSync('styles/projects/projects.css', 'utf8');
// restore project-editor deleted block? Actually let's just make sure it's correctly styled.
if (!projectsContent.includes('.project-editor {')) {
  projectsContent = 
`.project-editor-scroll-area {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.project-editor {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
}
` + projectsContent;
}
projectsContent = projectsContent.replace(/  flex: 1 0 auto;\n\}/g, '  flex: 1 1 auto;\n}');
fs.writeFileSync('styles/projects/projects.css', projectsContent);

// tabs.css
let tabsContent = fs.readFileSync('styles/projects/tabs.css', 'utf8');
tabsContent = tabsContent.replace(/  flex: 1 0 auto;\n  overflow: visible;\n  border-radius: 12px;\n\}/g, '  flex: 1 1 auto;\n  min-height: 0;\n  overflow: hidden;\n  border-radius: 12px;\n}');
tabsContent = tabsContent.replace(/  overflow-y: visible;\n  overflow-x: visible;\n\}/g, '  overflow-y: auto;\n  overflow-x: auto;\n}');
tabsContent = tabsContent.replace(/  flex: 1 0 auto;\n  overflow: visible; \/\* change from hidden \*\/\n\}/g, '  flex: 1 1 auto;\n  min-height: 0;\n  overflow: hidden;\n}');
tabsContent = tabsContent.replace(/  flex: 1 0 auto;\n  min-width: 0;\n  overflow: visible;/g, '  flex: 1 1 auto;\n  min-width: 0;\n  min-height: 0;\n  overflow: hidden;');
tabsContent = tabsContent.replace(/  flex: 1 0 auto;\n  overflow: visible;\n}/g, '  flex: 1 1 auto;\n  overflow: hidden;\n}');

// Restore bottom border on dashboard-project-header
tabsContent = tabsContent.replace(/  padding: 14px 20px 0;\n  background: var\(--color-surface\);\n  position: sticky;/g, '  padding: 14px 20px 0;\n  background: var(--color-surface);\n  border-bottom: 1px solid var(--color-border);\n  position: relative;'); // make it relative so it doesn't overlap scrollbars, since the scroll container is inside project-editor-scroll-area

fs.writeFileSync('styles/projects/tabs.css', tabsContent);
console.log('done styles');
