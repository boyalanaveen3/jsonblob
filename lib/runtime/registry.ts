import { LanguageAdapter } from "@/types/playground";
import { javascriptAdapter } from "./adapters/javascript";
import { typescriptAdapter } from "./adapters/typescript";
import { pythonAdapter } from "./adapters/python";
import { javaAdapter } from "./adapters/java";

const adapters = new Map<string, LanguageAdapter>();

// Register default adapters
registerAdapter(javascriptAdapter);
registerAdapter(typescriptAdapter);
registerAdapter(pythonAdapter);
registerAdapter(javaAdapter);

export function registerAdapter(adapter: LanguageAdapter) {
  adapters.set(adapter.language.toLowerCase(), adapter);
}

export function getAdapter(language: string): LanguageAdapter | undefined {
  return adapters.get(language.toLowerCase());
}

export function getSupportedLanguages(): string[] {
  return Array.from(adapters.keys());
}
