import { ILLMProvider } from './types';
import { GroqProvider } from './providers/groq';
import { MockProvider } from './providers/mock';

export class LLMFactory {
  /**
   * Returns the correct LLM provider implementation based on environment configuration.
   */
  static getProvider(): ILLMProvider {
    // Determine provider from .env configuration
    const providerType = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
    
    switch (providerType) {
      case 'groq':
        return new GroqProvider();
      case 'mock':
      default:
        // Default to safe mock behavior for tests or unconfigured environments
        return new MockProvider();
    }
  }
}
