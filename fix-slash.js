const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'lib/llm/providers/groq.ts');
let content = fs.readFileSync(file, 'utf8');
content = content.replace("}\\`;", "}  `;");
fs.writeFileSync(file, content);
