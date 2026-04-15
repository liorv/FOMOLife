import { ILLMProvider, GenerateChatRequest, GenerateChatResponse } from '../types';

export class MockProvider implements ILLMProvider {
  async generateChat(request: GenerateChatRequest): Promise<GenerateChatResponse> {
    // Stub fallback used when no real LLM provider is configured.
    // Gives a neutral response that doesn't confuse users with irrelevant content.
    const projectName = (() => {
      try {
        const ctx = JSON.parse(request.context || '{}');
        return ctx.name || ctx.title || null;
      } catch { return null; }
    })();

    const projectHint = projectName ? ` for "${projectName}"` : '';
    return {
      text: `AI assistant is not configured${projectHint}. Please set the GROQ_API_KEY environment variable to enable AI features.`,
      actions: [],
    };
  }
}
