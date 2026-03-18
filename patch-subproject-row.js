const fs = require('fs');

let content = fs.readFileSync('packages/ui/src/SubprojectRow.tsx', 'utf8');

const target = `{sub.isProjectLevel ? "assignment_turned_in" : "folder"}`;
const replacement = `{sub.tasks && sub.tasks.length > 0 && sub.tasks.every(t => t.done) ? "check_circle" : (sub.isProjectLevel ? "assignment_turned_in" : "folder")}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('packages/ui/src/SubprojectRow.tsx', content);
    console.log('Successfully updated SubprojectRow.tsx');
} else {
    console.log('Target not found in SubprojectRow.tsx');
}
