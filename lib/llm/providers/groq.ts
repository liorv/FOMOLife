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

    const jsonModeSystemPrompt = `You are FOMO Helper, a helpful project assistant.
You receive the current project as JSON. When the user asks you to make changes, return the COMPLETE modified project JSON with the changes applied.
ALWAYS respond with EXACTLY this format (no markdown, no code blocks, STRICTLY valid JSON with double-quoted keys):
{ "text": "Brief human-readable description of what you changed", "modified_project": { ...complete project... } }

Rules for modified_project:
- It MUST have the same top-level structure as the input: { "name", "goal", "description", "end_date", "special_instructions", "sub_projects": [ { "id", "title", "tasks": [ { "id", "title", "effort" } ] } ] }
- KEEP ALL existing "id" fields exactly as received — never change, omit, re-order, or invent IDs
- Only modify fields the user explicitly asked to change; preserve everything else verbatim
- "effort" is a decimal number of days (0.5 = half day, 1 = one day, 2 = two days); null if unset
- "goal", "description", "special_instructions" are plain text strings or null; "end_date" is an ISO date string (YYYY-MM-DD) or null
- When the user asks to ADD a new list/category of items (movies, books, songs, ideas, recipes, etc.), create a brand NEW object in sub_projects with a new unique "id" (format: "ai-sub-<timestamp>"), appropriate "title", and populate it with 5-10 relevant items as tasks. Generate specific, high-quality recommendations based on the request. For example, if asked for "80s movies", include actual movie titles like "Back to the Future (1985)", "The Breakfast Club (1985)", etc. Do NOT add unrelated content to existing sub_projects.
- New tasks added by you get a new unique "id" (format: "ai-<timestamp>-<random>")
- If the user is asking an informational question and no changes are needed, answer in "text" and set "modified_project" to null
- NEVER mention raw UUIDs in your "text" field — use human-readable names only
- Output STRICTLY valid JSON: all keys and string values MUST use double quotes ("), never single quotes or unquoted identifiers`;

    const systemPrompt = `You are FOMO Helper, a helpful project assistant. Answer the user's question or request directly.
If the user asks WHY something is recommended or asks for details/reasoning, provide a comprehensive, detailed explanation in your "text" field. Do not be overly brief if an explanation is requested.
If the user asks for or implies a project change (e.g. adding tasks, removing items, editing names, checking off tasks), YOU MUST execute the changes immediately by providing the actionable options in your "actions" array. NEVER claim you have removed or updated tasks without actually appending the corresponding actions.
In your "text" field, ALWAYS describe exactly what changes are about to be applied — list each specific change (e.g. "I will set effort to 3h for 'Task A', 2h for 'Task B', ..."). The user needs to understand the changes BEFORE clicking Apply. Never use vague text like "Here are the actions" or "I will make the following changes" without listing the specifics. NEVER mention raw task IDs (UUIDs) in your "text" field or "label" fields — always refer to tasks and subprojects by their human-readable title/name only.
If no changes are needed or the user is just asking an informational question, answer the question fully and do not suggest any actions (return an empty array for "actions").
Do NOT just echo or summarize what the user said – actually answer their question or perform the task!
Do NOT output generic actions without specific content. NEVER include or output the project state or raw JSON context back to the user. The ONLY way to modify the project is by suggesting actions in the "actions" array. Each action's \`label\` must contain the specific item's name so the user knows exactly what is being modified. For a batch_update action, provide a concise label describing what it does, e.g. "Add effort to 5 tasks" or "Move 3 tasks to Done". For batch updates, ensure each item in the payload actions array has its 'taskId', 'title', or 'description' explicitly set so the UI can communicate what was changed.
You MUST ALWAYS format your entire response as a single valid JSON object with EXACTLY these keys: { "text": "Your conversational answer here...", "actions": [{"type":"string","label":"string","payload":{}}] }. 
Do NOT wrap the JSON in markdown code blocks (\`\`\`json) and do NOT output any plain text outside the JSON object. If you have no actions to suggest, return an empty array for "actions".
The ONLY allowed action types are:
- "add_subproject" (payload: { "title": "string" })
- "remove_subproject" (payload: { "subprojectId": "string" })
- "add_task" (payload: { "subprojectId": "string (name of list or subproject)", "title": "string" })
- "remove_task" (payload: { "subprojectId": "string", "taskId": "string (MUST provide actual task ID from context)" })
- "edit_task" (payload: { "subprojectId": "string", "taskId": "string (MUST use the exact \`id\` field from the task in context)", "title": "string (new title)", "description": "string (new description)", "effort": "number of days as a decimal, e.g. 0.5 for half a day, 1 for one day, 2 for two days" })
- "move_task" (payload: { "taskId": "string (MUST provide actual task ID from context)", "toSubprojectId": "string (name or id of destination subproject — may be new)" })
- "batch_update" (payload: { "actions": [{ "type": "string", "payload": {} }] })
When adding/editing MULTIPLE items to a list, use a SINGLE batch_update action containing an array of add_task/edit_task actions, rather than repeating the same top-level label repeatedly.
When MOVING tasks to another subproject (existing or new), use a SINGLE batch_update containing multiple move_task actions — one per task. Do NOT use a combination of add_task + remove_task for moving; always use move_task. If the destination subproject does not exist yet, move_task will create it automatically.
When editing an existing task, YOU MUST provide its exact existing \`taskId\` from the context.`;

    const activeSystemPrompt = request.jsonMode ? jsonModeSystemPrompt : systemPrompt;

    // Build message turns: system, then alternating history, then the current user message
    // History entries contain {role, text}; map to OpenAI format
    const historyMessages = (request.history || []).map((h: { role: string; text: string }) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.text || '').slice(0, 400),
    }));
    const userPrompt = `User message: ${request.message}\n\nProject context: ${request.context || '{}'}`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: activeSystemPrompt },
          ...historyMessages,
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 1024,
        // Enforce valid JSON output when in JSON mode
        ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
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

    // Try parse JSON first, then fall back to extracting embedded JSON, then plain text
    let parsed: any = null;

    // Last-resort: add double quotes around bare JS-style keys (e.g. {text: "..."})
    const fixUnquotedKeys = (s: string) =>
      s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

    const tryParse = (s: string) => {
      try { return JSON.parse(s); } catch (_) {}
      try { return JSON.parse(fixUnquotedKeys(s)); } catch (_) {}
      return null;
    };

    parsed = tryParse(content);
    if (!parsed) {
      // LLM sometimes emits leading/trailing text around the JSON object
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        parsed = tryParse(content.slice(jsonStart, jsonEnd + 1));
      }
    }
    if (parsed) {
      return {
        text: String(parsed.text || ''),
        actions: Array.isArray(parsed.actions) ? parsed.actions : undefined,
        modified_project: parsed.modified_project ?? undefined,
      };
    }
    return { text: String(content) };
  }
}
