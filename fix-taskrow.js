const fs = require('fs');

let rowContent = fs.readFileSync('packages/ui/src/TaskList/TaskRow.tsx', 'utf8');

const spanRegex = /<span className=\{`task-text[^>]*>\s*\{item\.text\}\s*<\/span>/;
const spanMatch = rowContent.match(spanRegex);
if (spanMatch) {
  const spanHtml = spanMatch[0];
  rowContent = rowContent.replace(spanRegex, '');
  
  const priorityRegex = /\{onTaskUpdate \? \([\s\S]*?<div className="priority-wrapper"[\s\S]*?\) : null\}/;
  const priMatch = rowContent.match(priorityRegex);
  if (priMatch) {
    rowContent = rowContent.replace(priorityRegex, spanHtml + '\n                ' + priMatch[0]);
  }
}

fs.writeFileSync('packages/ui/src/TaskList/TaskRow.tsx', rowContent);

console.log("Fixed TaskRow.tsx");
