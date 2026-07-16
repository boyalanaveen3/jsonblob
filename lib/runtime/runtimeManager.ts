import { ExecutionResult } from "@/types/playground";
import { javascriptRuntime } from "./runtimes/javascriptRuntime";
import { typescriptRuntime } from "./runtimes/typescriptRuntime";
import { pythonRuntime } from "./runtimes/pythonRuntime";
import { javaRuntime } from "./runtimes/javaRuntime";

export interface LanguageRuntime {
  language: string;
  execute(code: string): Promise<ExecutionResult>;
}

class RuntimeManager {
  private runtimes = new Map<string, LanguageRuntime>();

  registerRuntime(runtime: LanguageRuntime) {
    this.runtimes.set(runtime.language.toLowerCase(), runtime);
  }

  getRuntime(language: string): LanguageRuntime | undefined {
    return this.runtimes.get(language.toLowerCase());
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.runtimes.keys());
  }
}

export const runtimeManager = new RuntimeManager();

// Register runtimes
runtimeManager.registerRuntime(javascriptRuntime);
runtimeManager.registerRuntime(typescriptRuntime);
runtimeManager.registerRuntime(pythonRuntime);
runtimeManager.registerRuntime(javaRuntime);
