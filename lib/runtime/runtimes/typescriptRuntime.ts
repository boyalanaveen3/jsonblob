import { ExecutionResult } from "@/types/playground";
import { LanguageRuntime } from "../runtimeManager";
import { javascriptRuntime } from "./javascriptRuntime";

function transpileTypeScript(code: string): string {
  let js = code;

  // 1. Remove interfaces: interface X { ... }
  js = js.replace(/interface\s+\w+\s*\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\}/g, "");

  // 2. Remove type aliases: type X = ... ;
  js = js.replace(/type\s+\w+\s*=\s*[^;]+;/g, "");

  // 3. Remove type assertions: "as string", "as any", "as Snippet[]"
  js = js.replace(/\s+as\s+[A-Za-z0-9_<>\[\]]+/g, "");

  // 4. Remove type annotations on variable declarations and parameters
  js = js.replace(/(const|let|var)\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_<>\[\]\{\}\s|&]+)(?=\s*=|\s*;|\s*,)/g, "$1 $2");
  
  // 5. Remove function return type annotations: function x(): string {
  js = js.replace(/(function\s+[A-Za-z0-9_]+\s*\([^)]*\))\s*:\s*[A-Za-z0-9_<>\[\]\s|&]+(?=\s*\{)/g, "$1");

  // 6. Remove parameter types in function signatures: (param: string) -> (param)
  js = js.replace(/(\(|\,\s*)([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_<>\[\]\{\}\s|&]+)(?=\s*\)|\s*\,|\s*\=)/g, "$1$2");

  return js;
}

async function compileTypeScript(code: string): Promise<{ jsCode: string; diagnostics: string[] }> {
  if (typeof window !== "undefined" && (window as any).monaco) {
    try {
      const monaco = (window as any).monaco;
      const editor = (window as any).currentEditor;
      if (editor) {
        const model = editor.getModel();
        if (model) {
          const modelLang = typeof model.getLanguageId === "function" ? model.getLanguageId() : (typeof model.getModeId === "function" ? model.getModeId() : "");
          if (modelLang === "typescript") {
            const worker = await monaco.languages.typescript.getTypeScriptWorker();
            const client = await worker(model.uri);
            const emitResult = await client.getEmitOutput(model.uri.toString());
            
            // Get compiler diagnostics
            const syntactic = await client.getSyntacticDiagnostics(model.uri.toString());
            const semantic = await client.getSemanticDiagnostics(model.uri.toString());
            const allDiagnostics = [...syntactic, ...semantic];
            
            const diagnostics = allDiagnostics.map((d: any) => {
              const message = typeof d.messageText === "string" ? d.messageText : d.messageText.messageText;
              return `[TypeScript Compiler Error] ${message}`;
            });

            if (emitResult.outputFiles && emitResult.outputFiles.length > 0) {
              return {
                jsCode: emitResult.outputFiles[0].text,
                diagnostics
              };
            }
          }
        }
      }
    } catch (err: any) {
      console.warn("Failed to compile TS via Monaco worker, falling back:", err);
    }
  }

  // Fallback to regex-based transpilation
  return {
    jsCode: transpileTypeScript(code),
    diagnostics: []
  };
}

export const typescriptRuntime: LanguageRuntime = {
  language: "typescript",

  async execute(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    const { jsCode, diagnostics } = await compileTypeScript(code);

    if (diagnostics.length > 0) {
      const timeMs = Math.round(performance.now() - startTime);
      return {
        logs: diagnostics.map(d => `[ERROR] ${d}`),
        compilationError: diagnostics.join("\n"),
        timeMs
      };
    }

    const runResult = await javascriptRuntime.execute(jsCode);
    const totalTimeMs = Math.round(performance.now() - startTime);

    return {
      ...runResult,
      timeMs: totalTimeMs
    };
  }
};
