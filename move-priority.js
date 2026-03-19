const fs = require('fs');
let code = fs.readFileSync('packages/ui/src/TaskList/TaskRow.tsx', 'utf8');

const regex = /(\{type === "tasks" \? \([\s\S]*?\) : item\.priority \? \([\s\S]*?\) : null\})\s*<span[^>]*>\{item\.text\}<\/span>/;

if (regex.test(code)) {
    code = code.replace(regex, (match, p1) => {
        return `<span>{item.text}</span>\n              ${p1}`;
    });
    fs.writeFileSync('packages/ui/src/TaskList/TaskRow.tsx', code);
    console.log("Moved priority correctly!");
} else {
    // maybe it has a different structure
    const altRegex = /(\{type === "tasks" \? \([\s\S]*?\) : item\.priority \? \([\s\S]*?\) : null\})\s*(\{type === "tasks" && \([\s\S]*?className="material-icons editable-indicator"[\s\S]*?<\/span>\s*\)\})?/;
    
    // Let's just find the priority block and the item.text block and swap them manually if the simple regex works.
    console.log("Regex didn't match.");
}
