import { IDatabaseProvider } from "./types";
import { SQLiteProvider } from "./providers/SQLiteProvider";
import { CloudflareD1Provider } from "./providers/CloudflareD1Provider";

class DatabaseProviderRegistry {
  private providers: Map<string, IDatabaseProvider> = new Map();

  constructor() {
    // Register core database providers
    this.registerProvider(new SQLiteProvider());
    this.registerProvider(new CloudflareD1Provider());
  }

  registerProvider(provider: IDatabaseProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IDatabaseProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      // Fallback to SQLite if requested provider not found
      return this.providers.get("sqlite")!;
    }
    return provider;
  }

  getAllProviders(): IDatabaseProvider[] {
    return Array.from(this.providers.values());
  }

  getDefaultProvider(): IDatabaseProvider {
    return this.getProvider("sqlite");
  }
}

export const dbRegistry = new DatabaseProviderRegistry();
