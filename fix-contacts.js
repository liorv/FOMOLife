const fs = require('fs');
let content = fs.readFileSync('components/contacts/ContactsPage.tsx', 'utf8');

content = content.replace('export default function ContactsPage({ canManage, currentUserId = \'\', currentUserEmail }: Props) {', 'export default function ContactsPage({ canManage, currentUserId = \'\', currentUserEmail, style, className }: Props) {');

content = content.replace(
  /return \(\n    <>\n      <div className="content-panel">\n        <div className=\{styles\.page\} style=\{\{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 \}\}>\n          \{\!displayReady \? \(\n            \/\/ Show nothing while waiting for framework acknowledgment to prevent layout flicker\n            <div style=\{\{ height: '100vh' \}\} \/>\n          \) : \(\n            <section className=\{styles\.shell\} style=\{\{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 \}\}>/m,
  'return (\n    <>\n    <div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display: !displayReady || style?.display === "none" ? "none" : (style?.display || "flex") }}>\n        <div className={styles.page} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>\n            <section className={styles.shell} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>'
);

content = content.replace(
  /            <\/section>\n          \)\}\n        <\/div>\n      <\/div>\n    <\/>/g,
  '            </section>\n        </div>\n    </div>\n    </>'
);

fs.writeFileSync('components/contacts/ContactsPage.tsx', content);
