require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GROQ_API_KEY;

const systemPrompt = `You are a highly efficient project management assistant.
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
}`;

const userPrompt = `Please create a project blueprint based on the following rules:
Goal: Set up a new blog
Complexity Level: Simple
Ensure the number of subprojects and tasks matches the complexity requested. Calculate deadline_offset_days as intelligent milestones.`;

fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2, // low temp for structured predictable output
    response_format: { type: "json_object" }
  })
}).then(async res => {
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}).catch(console.error);
