const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'lib/llm/providers/groq.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /const userPrompt = [\s\S]*?intelligent milestones.`;/;
const newPrompt = `const userPrompt = \`Please create a project blueprint based on the following rules:
Goal: \${request.goal}
Complexity Level: \${request.complexity} (Scale from Simple -> Detailed)
\${request.targetDate ? \\\`Target Completion Date: \${request.targetDate}\\\\n\\\` : ''}
\${request.context ? \\\`Context Constraints: \${request.context}\\\\n\\\` : ''}

CRITICAL INSTRUCTION: Do NOT artificially limit the number of tasks or subprojects. Generate the appropriate, realistic, and comprehensive number of tasks required to actually complete the project milestone based on the requested complexity. Ensure each sub project has detailed and sufficient steps.
Calculate deadline_offset_days as intelligent milestones.\`;`;

content = content.replace(regex, newPrompt);
fs.writeFileSync(file, content);
