const fs = require('fs');
let content = fs.readFileSync('components/tasks/TasksPage.tsx', 'utf8');

content = content.replace(
  /<div className=\{\} style=\{\{ \.\.\.\(style \|\| \{\}\), display:/,
  '<div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display:'
);

fs.writeFileSync('components/tasks/TasksPage.tsx', content);

let projContent = fs.readFileSync('components/projects/ProjectsPage.tsx', 'utf8');

projContent = projContent.replace(
  /<div className=\{\} style=\{\{ \.\.\.\(style \|\| \{\}\), display:/,
  '<div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display:'
);

fs.writeFileSync('components/projects/ProjectsPage.tsx', projContent);

let contContent = fs.readFileSync('components/contacts/ContactsPage.tsx', 'utf8');

contContent = contContent.replace(
  /<div className=\{\} style=\{\{ \.\.\.\(style \|\| \{\}\), display:/,
  '<div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display:'
);

fs.writeFileSync('components/contacts/ContactsPage.tsx', contContent);
