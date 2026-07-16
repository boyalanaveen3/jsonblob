import { ExecutionResult } from "@/types/playground";
import { LanguageRuntime } from "../runtimeManager";

function transpileJava(code: string): string {
  let js = code;

  // 1. Replace System.out.println / System.out.print / System.err.println
  js = js.replace(/System\.out\.println\s*\((.*)\)/g, "console.log($1)");
  js = js.replace(/System\.out\.print\s*\((.*)\)/g, "console.log($1)");
  js = js.replace(/System\.err\.println\s*\((.*)\)/g, "console.error($1)");

  // 2. Replace variable declarations: Type name = value; or Type name;
  js = js.replace(/\b(?:int|double|float|boolean|char|String|long|short|byte|var|[A-Z][A-Za-z0-9_]*)(?:<[A-Za-z0-9_,\s<>]+>)?(?:\[\])?\s+([A-Za-z0-9_]+)\s*(=|;)/g, "let $1 $2");

  // 3. Strip public / private / protected modifiers
  js = js.replace(/\b(public|private|protected)\b/g, "");

  // 4. Parse braces and strip all class/interface declarations line-by-line
  const lines = js.split("\n");
  const resultLines: string[] = [];
  let braceCount = 0;
  const classClosingBraceDepths: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Strip Java import statements
    if (trimmed.startsWith("import ")) {
      resultLines.push("");
      continue;
    }

    // Check if this line starts a class or interface
    const isClassDecl = /\b(?:class|interface)\s+[A-Za-z0-9_]+/.test(trimmed) && trimmed.endsWith("{");
    let processedLine = line;

    if (isClassDecl) {
      // Strip class declaration line
      processedLine = line.replace(/\b(?:class|interface)\s+[A-Za-z0-9_]+\s*\{/, "/* class/interface body */");
      classClosingBraceDepths.push(braceCount);
      braceCount++;
    } else {
      // Track braces in this line to identify class closing braces
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (classClosingBraceDepths.length > 0 && classClosingBraceDepths[classClosingBraceDepths.length - 1] === braceCount) {
            classClosingBraceDepths.pop();
            processedLine = processedLine.substring(0, charIndex) + "/* end class */" + processedLine.substring(charIndex + 1);
          }
        }
      }
    }
    resultLines.push(processedLine);
  }
  js = resultLines.join("\n");

  // 5. Replace method definitions: Type name(args) { -> function name(args) {
  js = js.replace(/(?:static\s+)?([A-Za-z0-9_<>\[\]]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[A-Za-z0-9_,\s]+)?\s*(?=\{)/g, (match, returnType, methodName, paramList) => {
    if (["if", "while", "for", "switch", "catch", "return", "new"].includes(returnType)) {
      return match;
    }
    const params = paramList.trim() ? paramList.split(",") : [];
    const strippedParams = params.map((p: string) => {
      const parts = p.trim().split(/\s+/);
      return parts[parts.length - 1];
    });
    return `function ${methodName}(${strippedParams.join(", ")}) `;
  });

  // 5b. Replace constructor definitions: ClassName(args) { -> function ClassName(args) {
  js = js.replace(/([A-Z][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?=\{)/g, (match, className, paramList) => {
    const params = paramList.trim() ? paramList.split(",") : [];
    const strippedParams = params.map((p: string) => {
      const parts = p.trim().split(/\s+/);
      return parts[parts.length - 1];
    });
    return `function ${className}(${strippedParams.join(", ")}) `;
  });

  // 6. Replace Java array initialization: new int[]{1, 2} -> [1, 2]
  js = js.replace(/new\s+[A-Za-z0-9_]+(?:\[\])?\s*\{/g, "[");
  js = js.replace(/=\s*\{([^}]+)\}/g, "= [$1]");

  // 7. Transpile Java's enhanced for loop: for (Type var : iterable) -> for (let var of iterable)
  js = js.replace(/\bfor\s*\(\s*(?:[A-Za-z0-9_<>\[\]]+)\s+([A-Za-z0-9_]+)\s*:\s*([^)]+)\)/g, "for (let $1 of $2)");

  // 8. Always trigger main() at the end if present
  if (/\bfunction\s+main\b/.test(js)) {
    js += "\nmain();";
  }

  const javaPrefix = `
Array.prototype.size = function() { return this.length; };
Array.prototype.get = function(index) { return this[index]; };
Array.prototype.add = function(item) { this.push(item); return true; };

const Arrays = {
  asList: (...args) => args
};
const ArrayList = Array;
const List = Array;
const Integer = {
  parseInt: (s) => parseInt(s, 10),
  toString: (i) => String(i),
};
const Double = {
  parseDouble: (s) => parseFloat(s),
  toString: (d) => String(d),
};
`;

  return javaPrefix + "\n" + js;
}

export const javaRuntime: LanguageRuntime = {
  language: "java",

  async execute(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          language: "java",
          version: "15.0.2",
          files: [
            {
              name: "Main.java",
              content: code
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Piston API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const timeMs = Math.round(performance.now() - startTime);

      const logs: string[] = [];
      let error: string | undefined = undefined;
      let compilationError: string | undefined = undefined;

      if (data.run) {
        const stdout = data.run.stdout || "";
        const stderr = data.run.stderr || "";

        if (stdout) {
          logs.push(...stdout.split("\n").filter((l: string) => l !== ""));
        }

        if (stderr) {
          const stderrLines = stderr.split("\n").filter((l: string) => l !== "");
          if (data.run.code !== 0) {
            if (stderr.includes("error:") || stderr.includes("Main.java:")) {
              compilationError = stderr;
            } else {
              error = stderr;
            }
          }
          logs.push(...stderrLines.map((l: string) => `[ERROR] ${l}`));
        }
      }

      return {
        logs,
        error,
        compilationError,
        timeMs
      };
    } catch (err: any) {
      console.warn("Java remote execution failed, falling back to client-side sandboxed execution:", err.message);
      
      return new Promise((resolve) => {
        try {
          const transpiledJs = transpileJava(code);
          const workerCode = `
            self.onmessage = function(e) {
              const code = e.data;
              const logs = [];

              const customConsole = {
                log: (...args) => {
                  logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
                },
                warn: (...args) => {
                  logs.push("[WARN] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
                },
                error: (...args) => {
                  logs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
                }
              };

              try {
                const executor = new Function("console", code);
                executor(customConsole);
                self.postMessage({ success: true, logs });
              } catch (err) {
                self.postMessage({ success: false, error: err.message, logs });
              }
            };
          `;

          const blob = new Blob([workerCode], { type: "application/javascript" });
          const workerUrl = URL.createObjectURL(blob);
          const worker = new Worker(workerUrl);

          const timeout = setTimeout(() => {
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
            const timeMs = Math.round(performance.now() - startTime);
            resolve({
              logs: ["Execution timed out after 3.0 seconds (Possible infinite loop detected)."],
              error: "TimeoutError",
              timeMs,
            });
          }, 3000);

          worker.onmessage = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);

            const timeMs = Math.round(performance.now() - startTime);
            const { success, logs, error } = e.data;

            resolve({
              logs,
              error: success ? undefined : error || "Unknown runtime error",
              timeMs,
            });
          };

          worker.onerror = (err) => {
            clearTimeout(timeout);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);

            const timeMs = Math.round(performance.now() - startTime);
            resolve({
              logs: [],
              error: err.message || "Worker initialization error",
              timeMs,
            });
          };

          worker.postMessage(transpiledJs);
        } catch (e: any) {
          const timeMs = Math.round(performance.now() - startTime);
          resolve({
            logs: [`[ERROR] Transpilation failed: ${e.message}`],
            error: e.message,
            timeMs
          });
        }
      });
    }
  }
};
