import { IAIProvider } from "./types";
import { GeminiAIProvider } from "./providers/GeminiAIProvider";

class AIProviderRegistry {
  private providers: Map<string, IAIProvider> = new Map();

  constructor() {
    this.registerProvider(new GeminiAIProvider());
  }

  registerProvider(provider: IAIProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IAIProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      return this.providers.get("gemini")!;
    }
    return provider;
  }

  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  getDefaultProvider(): IAIProvider {
    return this.getProvider("gemini");
  }
}

export const aiRegistry = new AIProviderRegistry();
