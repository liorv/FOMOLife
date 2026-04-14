import { ILLMProvider, GenerateChatRequest, GenerateChatResponse } from '../types';

export class MockProvider implements ILLMProvider {
  async generateChat(request: GenerateChatRequest): Promise<GenerateChatResponse> {
    // Very simple conversational fallback for testing/dev
    const msg = (request.message || '').toLowerCase();

    if (msg.includes('tv') || msg.includes('show') || msg.includes('watch')) {
      return {
        text: `Here are three great TV shows you might enjoy:\n1) Breaking Bad\n2) The Expanse\n3) Fleabag`,
      };
    }

    // default conversational reply
    return {
      text: `Thanks for your message. I can suggest project edits or answer questions. Try saying "Add a QA subproject" or ask a general question like "what to watch".`,
    };
  }
}
