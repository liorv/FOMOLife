const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const lines = envContent.split('\n');
let KEY = '';
let MODEL = 'llama-3.1-8b-instant';

for (const line of lines) {
  if (line.startsWith('GROQ_API_KEY=')) {
    KEY = line.split('=')[1].trim();
  }
}

console.log("Using Key:", KEY.substring(0,5) + "...");
console.log("Using Model:", MODEL);

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

const userPrompt = `Goal: Set up a new blog\nComplexity Level: Simple`;

fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: MODEL,
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
