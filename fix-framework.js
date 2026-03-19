const fs = require('fs');
let content = fs.readFileSync('components/FrameworkHost.tsx', 'utf8');

content = content.replace(
  /    if \(tab.key === 'tasks'\) \{\n      return <div key="tasks" style=\{style\}><TasksPage canManage=\{true\} \/><\/div>;\n    \}\n    if \(tab.key === 'projects'\) \{\n      return <div key="projects" style=\{style\}><ProjectsPage canManage=\{true\} \/><\/div>;\n    \}\n    if \(tab.key === 'people'\) \{\n      return <div key="contacts" style=\{style\}><ContactsPage canManage=\{true\} currentUserId=\{userId\} currentUserEmail=\{userEmail \?\? ''\} \/><\/div>;\n    \}/,
  `    if (tab.key === 'tasks') {
      return <TasksPage key="tasks" canManage={true} style={style} />;
    }
    if (tab.key === 'projects') {
      return <ProjectsPage key="projects" canManage={true} style={style} />;
    }
    if (tab.key === 'people') {
      return <ContactsPage key="contacts" canManage={true} currentUserId={userId} currentUserEmail={userEmail ?? ""} style={style} />;
    }`
);

fs.writeFileSync('components/FrameworkHost.tsx', content);
