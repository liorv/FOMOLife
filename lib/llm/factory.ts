import { ILLMProvider } from './types';
import { GroqProvider } from './providers/groq';
import { MockProvider } from './providers/mock';

export class LLMFactory {
  /**
   * Returns the correct LLM provider implementation based on environment configuration.
   */
  static getProvider(): ILLMProvider {
    const providerType = (process.env.LLM_PROVIDER || '').toLowerCase();

    // Use Groq if explicitly configured OR if the API key is present
    if (providerType === 'groq' || (!providerType && process.env.GROQ_API_KEY)) {
      return new GroqProvider();
    }

    // Default to mock for tests or unconfigured environments
    return new MockProvider();
  }
}
