import { LanguageAdapter, ExecutionResult, ValidationResult } from "@/types/playground";
import { runtimeManager } from "../runtimeManager";


export const javascriptAdapter: LanguageAdapter = {
  language: "javascript",
  extension: "js",

  async run(code: string): Promise<ExecutionResult> {
    try {
      const runtime = runtimeManager.getRuntime("javascript");
      if (!runtime) throw new Error("JavaScript runtime not registered");
      return await runtime.execute(code);
    } catch (err: any) {
      return {
        logs: [],
        error: `Execution Error: ${err.message}`,
        timeMs: 0,
      };
    }
  },

  async format(code: string): Promise<string> {
    // A clean, lightweight formatter for JavaScript
    try {
      let indentLevel = 0;
      const lines = code.split("\n");
      const formattedLines = lines.map((line) => {
        let trimmed = line.trim();
        
        // If line starts with a closing brace, decrease indent level first
        if (trimmed.startsWith("}") || trimmed.startsWith("]")) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        const indentedLine = "  ".repeat(indentLevel) + trimmed;

        // Count opening vs closing braces
        const openBraces = (trimmed.match(/\{|\[/g) || []).length;
        const closeBraces = (trimmed.match(/\}|\]/g) || []).length;
        indentLevel += openBraces - closeBraces;

        return indentedLine;
      });

      return formattedLines.join("\n");
    } catch {
      return code;
    }
  },

  validate(code: string): ValidationResult {
    try {
      new Function(code);
      return { valid: true };
    } catch (err: any) {
      // Find line number in error if available
      let line: number | undefined;
      const match = err.stack?.match(/<anonymous>:(\d+):/);
      if (match) {
        line = parseInt(match[1], 10);
      }
      return {
        valid: false,
        error: err.message || "Syntax Error",
        line,
      };
    }
  },
};
