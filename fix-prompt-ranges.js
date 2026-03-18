const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'lib/llm/providers/groq.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /const systemPrompt = `[\s\S]*?\]\n\s*\}\n`/g;

const newSysPrompt = `const systemPrompt = \`You are a highly efficient project management assistant.
Your entire purpose is to generate a structured project blueprint in valid JSON format matching the schema below EXACTLY.
Do NOT wrap the JSON in Markdown or backticks. Do not include any conversational text. Just output raw, valid JSON.

CRITICAL INSTRUCTION ON QUANTITY: 
The number of sub_projects and tasks MUST vary dynamically based on the project's logic and the user's requested Complexity Level. 
- "Simple" = 2-3 sub_projects, 2-5 tasks each
- "Standard" = 3-5 sub_projects, 4-8 tasks each
- "Detailed" = 4-8 sub_projects, 6-15 tasks each
DO NOT just output 3 tasks! Build a realistic, functional task list.

Schema:
{
  "project_name": "string",
  "sub_projects": [
    {
      "title": "string",
      "tasks": [
        {
          "description": "string",
          "priority": "Low" | "Medium" | "High",
          "deadline_offset_days": number
        } // Generate varying numbers of tasks per sub-project here!
      ]
    } // Generate varying numbers of sub-projects here!
  ]
}\`;`;

content = content.replace(regex, newSysPrompt);
fs.writeFileSync(file, content);
console.log("Replaced");
