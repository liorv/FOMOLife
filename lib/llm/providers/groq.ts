import { GenerateBlueprintRequest, GenerateBlueprintResponse, ILLMProvider } from '../types';

export class GroqProvider implements ILLMProvider {
  private apiKey: string;
  // Groq provides an OpenAI-compatible endpoint
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  async generateBlueprint(request: GenerateBlueprintRequest): Promise<GenerateBlueprintResponse> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not defined. Please check your environment variables.");
    }

            const systemPrompt = `You are a highly efficient project management assistant.
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
}  `;

    const userPrompt = `Please create a project blueprint based on the following rules:
Goal: ${request.goal}
Complexity Level: ${request.complexity} (Scale from Simple -> Detailed)
${request.targetDate ? "Target Completion Date: " + request.targetDate + "\n" : ""}
${request.context ? "Context Constraints: " + request.context + "\n" : ""}

CRITICAL INSTRUCTION: Do NOT artificially limit the number of tasks or subprojects. Generate the appropriate, realistic, and comprehensive number of tasks required to actually complete the project milestone based on the requested complexity. Ensure each sub project has detailed and sufficient steps.
Calculate deadline_offset_days as intelligent milestones.`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Llama 3 is fast, we will use an active Llama 3.1 or 3.3 model point.
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2, // low temp for structured predictable output
        response_format: { type: "json_object" } // Tell Groq we want strict JSON
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: [${response.status}] ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response returned from Groq API.");
    }

    try {
      // The payload must parse back strictly to our interface
      const parsed = JSON.parse(content) as GenerateBlueprintResponse;
      return parsed;
    } catch (err) {
      console.error("Failed to parse JSON response:", content);
      throw new Error("Failed to parse JSON response from LLM provider");
    }
  }
}
