const fs = require('fs');
let content = fs.readFileSync('components/tasks/TasksPage.tsx', 'utf8');

content = content.replace(
  /return \(\n    <>\n      \{\!displayReady \? \(\n        <div style=\{\{ height: 0 \}\} \/>\n      \) : \(\n        <div className="content-panel">/m,
  'return (\n    <div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display: !displayReady || style?.display === "none" ? "none" : (style?.display || "flex") }}>'
);

content = content.replace(
  /        <\/div>\n      \)\}\n    <\/>/g,
  '    </div>'
);

fs.writeFileSync('components/tasks/TasksPage.tsx', content);

let projContent = fs.readFileSync('components/projects/ProjectsPage.tsx', 'utf8');

projContent = projContent.replace(
  /return \(\n    <>\n      \{\!displayReady \? \(\n        <div style=\{\{ height: 0 \}\} \/>\n      \) : \(\n        <div className="content-panel">/m,
  'return (\n    <div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display: !displayReady || style?.display === "none" ? "none" : (style?.display || "flex") }}>'
);

projContent = projContent.replace(
  /        <\/div>\n      \)\}\n    <\/>/g,
  '    </div>'
);

fs.writeFileSync('components/projects/ProjectsPage.tsx', projContent);

let contContent = fs.readFileSync('components/contacts/ContactsPage.tsx', 'utf8');

contContent = contContent.replace(
  /return \(\n    <>\n      <div className="content-panel">\n        <div className=\{styles\.page\} style=\{\{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 \}\}>\n          \{\!displayReady \? \(\n            \/\/ Show nothing while waiting for framework acknowledgment to prevent layout flicker\n            <div style=\{\{ height: '100vh' \}\} \/>\n          \) : \(\n            <section className=\{styles\.shell\} style=\{\{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 \}\}>/m,
  'return (\n    <div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display: !displayReady || style?.display === "none" ? "none" : (style?.display || "flex") }}>\n        <div className={styles.page} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>\n            <section className={styles.shell} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>'
);

contContent = contContent.replace(
  /            <\/section>\n          \)\}\n        <\/div>\n      <\/div>\n    <\/>/g,
  '            </section>\n        </div>\n    </div>'
);

fs.writeFileSync('components/contacts/ContactsPage.tsx', contContent);
