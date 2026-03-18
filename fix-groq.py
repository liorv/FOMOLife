import re

with open('lib/llm/providers/groq.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_sys_prompt = """    const systemPrompt = `You are a highly efficient project management assistant.
Your entire purpose is to generate a structured project blueprint in valid JSON format matching the schema below EXACTLY.
Do NOT wrap the JSON in Markdown or backticks. Do not include any conversational text. Just output raw, valid JSON.
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
        }
      ]
    }
  ]
}`;"""

new_sys_prompt = """    const systemPrompt = `You are a highly efficient project management assistant.
Your entire purpose is to generate a structured project blueprint in valid JSON format matching the schema below EXACTLY.
Do NOT wrap the JSON in Markdown or backticks. Do not include any conversational text. Just output raw, valid JSON.

CRITICAL INSTRUCTION ON QUANTITY AND GRANULARITY: 
1. The number of sub_projects and tasks MUST vary dynamically based on the project's logic and the user's requested Complexity Level. 
   - "Simple" = 2-3 sub_projects, 2-5 tasks each
   - "Standard" = 3-5 sub_projects, 4-8 tasks each
   - "Detailed" = 4-8 sub_projects, 6-15 tasks each
   DO NOT just output 3 tasks! Build a realistic, functional task list.
2. Keep each task description short and concise (1 single action/instruction per task). Do not combine multiple steps into one task. Break compound steps down into multiple individual tasks.

Schema:
{
  "project_name": "string",
  "sub_projects": [
    {
      "title": "string",
      "tasks": [
        {
          "description": "string", // SHORT, single instruction
          "priority": "Low" | "Medium" | "High",
          "deadline_offset_days": number
        }
      ]
    }
  ]
}\`;"""

# Clean up whitespace issues for matching
match_pattern = re.compile(r'const systemPrompt = `[\s\S]*?`\n?;\s*const userPrompt')

replacement = new_sys_prompt + "\n\n    const userPrompt"

text = match_pattern.sub(replacement, text)

with open('lib/llm/providers/groq.ts', 'w', encoding='utf-8') as f:
    f.write(text)

