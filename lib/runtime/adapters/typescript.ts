import { LanguageAdapter, ExecutionResult, ValidationResult } from "@/types/playground";
import { runtimeManager } from "../runtimeManager";

// Helper to strip TypeScript type annotations, interfaces, and casts to get clean runnable JS
function transpileTypeScript(code: string): string {
  let js = code;

  // 1. Remove interfaces: interface X { ... }
  js = js.replace(/interface\s+\w+\s*\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\}/g, "");

  // 2. Remove type aliases: type X = ... ;
  js = js.replace(/type\s+\w+\s*=\s*[^;]+;/g, "");

  // 3. Remove type assertions: "as string", "as any", "as Snippet[]"
  js = js.replace(/\s+as\s+[A-Za-z0-9_<>\[\]]+/g, "");

  // 4. Remove type annotations on variable declarations and parameters
  // Handles let x: number = 5, function foo(a: string): void
  // Using a simplified regex pattern that strips typical annotations
  js = js.replace(/(const|let|var)\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_<>\[\]\{\}\s|&]+)(?=\s*=|\s*;|\s*,)/g, "$1 $2");
  
  // 5. Remove function return type annotations: function x(): string {
  js = js.replace(/(function\s+[A-Za-z0-9_]+\s*\([^)]*\))\s*:\s*[A-Za-z0-9_<>\[\]\s|&]+(?=\s*\{)/g, "$1");

  // 6. Remove parameter types in function signatures: (param: string) -> (param)
  js = js.replace(/(\(|\,\s*)([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_<>\[\]\{\}\s|&]+)(?=\s*\)|\s*\,|\s*\=)/g, "$1$2");

  return js;
}

export const typescriptAdapter: LanguageAdapter = {
  language: "typescript",
  extension: "ts",

  async run(code: string): Promise<ExecutionResult> {
    try {
      const runtime = runtimeManager.getRuntime("typescript");
      if (!runtime) throw new Error("TypeScript runtime not registered");
      return await runtime.execute(code);
    } catch (err: any) {
      return {
        logs: [],
        error: `Transpilation Error: ${err.message}`,
        timeMs: 0,
      };
    }
  },

  async format(code: string): Promise<string> {
    // Utilize the core formatting logic
    return javascriptAdapter.format(code);
  },

  validate(code: string): ValidationResult {
    try {
      const transpiled = transpileTypeScript(code);
      new Function(transpiled);
      return { valid: true };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || "TS Syntax Error",
      };
    }
  },
};
