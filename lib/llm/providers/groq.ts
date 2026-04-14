import { ILLMProvider, GenerateChatRequest, GenerateChatResponse } from '../types';

export class GroqProvider implements ILLMProvider {
  private apiKey: string;
  // Groq provides an OpenAI-compatible endpoint
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  // generateBlueprint removed — use generateChat instead

  async generateChat(request: GenerateChatRequest): Promise<GenerateChatResponse> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not defined. Please check your environment variables.");
    }

    const systemPrompt = `You are FOMO Helper, a helpful project assistant. Answer the user's question or request directly.
If the user asks WHY something is recommended or asks for details/reasoning, provide a comprehensive, detailed explanation in your "text" field. Do not be overly brief if an explanation is requested.
If the user asks for or implies a project change, suggest a short list of actionable options the UI can render. If the user agrees to your previous suggestions, respond by proactively providing the actions array to implement those suggestions.
If no changes are needed or the user is just asking an informational question, answer the question fully and do not suggest any actions (return an empty array for "actions").
Do NOT just echo or summarize what the user said – actually answer their question or perform the task!
Do NOT output generic actions like "Add task" or "Edit task" without specific content.NEVER include or output the project state or raw JSON context back to the user. The ONLY way to modify the project is by suggesting actions in the "actions" array.Each action's \`label\` must contain the specific item's name so the user knows exactly what is being modified (e.g. "Remove 'The Expanse'" instead of "Remove task with 'the'"). For multi-item or bulk actions, provide a single generic label like "Remove 3 shows". For batch updates, ensure each item in the payload actions array has its 'title' or 'description' explicitly set so the UI can communicate what was changed.
You MUST ALWAYS format your entire response as a single valid JSON object with EXACTLY these keys: { "text": "Your conversational answer here...", "actions": [{"type":"string","label":"string","payload":{}}] }. 
Do NOT wrap the JSON in markdown code blocks (\`\`\`json) and do NOT output any plain text outside the JSON object. If you have no actions to suggest, return an empty array for "actions".
The ONLY allowed action types are:
- "add_subproject" (payload: { "title": "string" })
- "remove_subproject" (payload: { "subprojectId": "string" })
- "add_task" (payload: { "subprojectId": "string (name of list or subproject)", "title": "string" })
- "remove_task" (payload: { "subprojectId": "string", "taskId": "string" })
- "edit_task" (payload: { "subprojectId": "string", "taskId": "string", "title": "string", "description": "string" })
- "batch_update" (payload: { "actions": [{ "type": "string", "payload": {} }] })
When adding MULTIPLE items to a list, use a SINGLE batch_update action containing an array of add_task actions, rather than repeating the same top-level label repeatedly.
When adding items to a new list, just use add_task with the new list name as the subprojectId; it will be created automatically. Do NOT use any other action types.`;

    const userPrompt = `User message: ${request.message}\n\nProject context: ${request.context || '{}'}\n\nHistory: ${JSON.stringify(request.history || [])}`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: [${response.status}] ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq chat');
    }

    // Try parse JSON first, otherwise treat as plain text
    try {
      const parsed = JSON.parse(content);
      return {
        text: String(parsed.text || ''),
        actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
      };
    } catch (e) {
      return { text: String(content) };
    }
  }
}
