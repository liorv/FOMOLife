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

CRITICAL INSTRUCTIONS:
1. ADHERE STRICTLY TO THE USER'S GOAL: Only generate tasks and subprojects that are absolutely necessary to achieve the exact goal stated. Do NOT add extra features, nice-to-haves, or over-engineer the solution. If the goal is simple, keep the project simple.
2. AVOID UNNECESSARY COMPLEXITY: Do not create tasks for things not mentioned in the goal. Do not assume additional requirements. Stick to what's explicitly stated or directly implied.
3. TASK QUANTITY GUIDELINES (be conservative):
   - "Simple" = 1-2 sub_projects, 2-4 tasks each (total 4-8 tasks max)
   - "Standard" = 2-3 sub_projects, 3-5 tasks each (total 6-15 tasks max)  
   - "Detailed" = 3-4 sub_projects, 4-6 tasks each (total 12-24 tasks max)
   If the goal can be achieved with fewer tasks, use fewer. Quality over quantity.
4. Keep each task description short and concise (1 single action/instruction per task). Do not combine multiple steps into one task.
5. Every task MUST have an "effort" property, defined as a number representing days of work (e.g. 0.5, 1, 3). Do NOT omit it.
6. Set "priority" to exactly one of: "Low", "Medium", "High". Priority represents the task's importance to the overall project success.
7. AVOID generic planning/research tasks. Focus on SPECIFIC, ACTIONABLE tasks that directly contribute to the stated goal.
${request.isForExistingProject ? '8. This is for an EXISTING project. REVIEW all existing tasks and subprojects. ONLY keep tasks that are still beneficial and directly contribute to achieving the new goal. REMOVE any tasks that are no longer relevant, redundant, or not aligned with the goal. Then add any additional tasks needed to complete the goal. Return the COMPLETE optimized project structure - do not just add new content.' : ''}

Schema:
{
  "project_name": "string",
  "goal": "string",
  "sub_projects": [
    {
      "title": "string",
      "tasks": [
        {
          "description": "string",
          "priority": "Low",
          "effort": 1.5,
          "deadline_offset_days": 2,
          "done": false
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
${request.existingSubprojects ? `\nEXISTING PROJECT STRUCTURE:\n${JSON.stringify(request.existingSubprojects, null, 2)}\n\nREVIEW all existing tasks and subprojects. Keep only those that are beneficial and directly contribute to the new goal. Remove any tasks that are no longer relevant or not aligned with the goal. Add new tasks only if needed to complete the goal. Return the COMPLETE optimized project structure.` : ""}

CRITICAL INSTRUCTION: Adhere STRICTLY to the stated goal. Only include tasks and subprojects that are absolutely necessary to achieve the goal. Do NOT add extra features, over-engineer, or include tasks not directly related to the goal. If the goal is simple, keep the project simple with minimal necessary tasks. Be conservative - fewer focused tasks are better than many unnecessary ones.
Calculate deadline_offset_days as intelligent milestones based only on the tasks you've included.`;

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
