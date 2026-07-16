import { ExecutionResult } from "@/types/playground";
import { LanguageRuntime } from "../runtimeManager";

let pyodidePromise: Promise<any> | null = null;

async function initPyodide(): Promise<any> {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    if (typeof window === "undefined") return null;

    if (!(window as any).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide from CDN"));
        document.head.appendChild(script);
      });
    }

    const pyodide = await (window as any).loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
    });
    return pyodide;
  })();

  return pyodidePromise;
}

function transpilePython(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];
  const indentStack: number[] = [0];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }
    
    if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
      result.push("");
      continue;
    }

    if (trimmed.startsWith("#")) {
      result.push(line.replace(/#/g, "//"));
      continue;
    }

    const indent = line.search(/\S/);

    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      result.push(" ".repeat(indentStack[indentStack.length - 1]) + "}");
    }

    let processed = trimmed;
    
    if (processed.startsWith("def ")) {
      processed = processed.replace(/^def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*:/, "function $1($2) {");
      indentStack.push(indent + 4);
    } 
    else if (processed.startsWith("for ") && processed.endsWith(":")) {
      const forRangeMatch = processed.match(/^for\s+([a-zA-Z0-9_]+)\s+in\s+range\(([^)]+)\)\s*:/);
      if (forRangeMatch) {
        const varName = forRangeMatch[1];
        const rangeArgs = forRangeMatch[2].split(",").map(s => s.trim());
        let start = "0";
        let end = rangeArgs[0];
        let step = "1";
        if (rangeArgs.length === 2) {
          start = rangeArgs[0];
          end = rangeArgs[1];
        } else if (rangeArgs.length === 3) {
          start = rangeArgs[0];
          end = rangeArgs[1];
          step = rangeArgs[2];
        }
        processed = `for (let ${varName} = ${start}; ${varName} < ${end}; ${varName} += ${step}) {`;
        indentStack.push(indent + 4);
      } else {
        const forListMatch = processed.match(/^for\s+([a-zA-Z0-9_]+)\s+in\s+([^:]+)\s*:/);
        if (forListMatch) {
          const varName = forListMatch[1];
          const iterable = forListMatch[2];
          processed = `for (let ${varName} of ${iterable}) {`;
          indentStack.push(indent + 4);
        }
      }
    } 
    else if (processed.startsWith("if ") && processed.endsWith(":")) {
      processed = processed.replace(/^if\s+(.+)\s*:/, "if ($1) {");
      indentStack.push(indent + 4);
    } else if (processed.startsWith("elif ") && processed.endsWith(":")) {
      processed = processed.replace(/^elif\s+(.+)\s*:/, "else if ($1) {");
      indentStack.push(indent + 4);
    } else if (processed.endsWith("else:") || processed.endsWith("else :")) {
      processed = "else {";
      indentStack.push(indent + 4);
    } 
    else if (processed.startsWith("while ") && processed.endsWith(":")) {
      processed = processed.replace(/^while\s+(.+)\s*:/, "while ($1) {");
      indentStack.push(indent + 4);
    }

    processed = processed.replace(/\blambda\s+([a-zA-Z0-9_,\s]+):\s*([^,)]+)/g, "($1) => $2");

    processed = processed.replace(/\bf"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      const inner = p1.replace(/\{([^{}]+)\}/g, "${$1}");
      return `\`${inner}\``;
    }).replace(/\bf'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1) => {
      const inner = p1.replace(/\{([^{}]+)\}/g, "${$1}");
      return `\`${inner}\``;
    });

    processed = processed.replace(/print\s*\((.*)\)/g, "console.log($1)");
    processed = processed.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false");
    processed = processed.replace(/\.append\s*\((.*)\)/g, ".push($1)");

    result.push(" ".repeat(indent) + processed);
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    result.push(" ".repeat(indentStack[indentStack.length - 1]) + "}");
  }

  const helperPrefix = `
const math = Math;
const datetime = {
  now: () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())} \${pad(d.getHours())}:\${pad(d.getMinutes())}:\${pad(d.getSeconds())}.\${String(d.getMilliseconds()).padStart(3, '0')}\`;
  }
};
function filter(fn, iterable) {
  return iterable.filter(fn);
}
function list(iterable) {
  return Array.from(iterable);
}
function len(x) {
  if (x && typeof x.length === 'number') return x.length;
  if (x && typeof x.size === 'number') return x.size;
  if (x && typeof x === 'object') return Object.keys(x).length;
  return 0;
}
function range(start, stop, step = 1) {
  if (stop === undefined) {
    stop = start;
    start = 0;
  }
  const arr = [];
  for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
    arr.push(i);
  }
  return arr;
}
`;

  return helperPrefix + "\n" + result.join("\n");
}

export const pythonRuntime: LanguageRuntime = {
  language: "python",

  async execute(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    const logs: string[] = [];

    try {
      const pyodidePromise = initPyodide();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout loading Pyodide")), 1200)
      );

      const pyodide = await Promise.race([pyodidePromise, timeoutPromise]);
      if (pyodide) {
        pyodide.setStdout({
          batched: (text: string) => {
            if (text) {
              logs.push(...text.split("\n").filter(l => l !== ""));
            }
          }
        });
        pyodide.setStderr({
          batched: (text: string) => {
            if (text) {
              logs.push(...text.split("\n").filter(l => l !== "").map(l => `[ERROR] ${l}`));
            }
          }
        });

        await pyodide.runPythonAsync(code);
        const timeMs = Math.round(performance.now() - startTime);
        return {
          logs,
          timeMs
        };
      } else {
        throw new Error("Pyodide not loaded");
      }
    } catch (err: any) {
      console.warn("Python execution via Pyodide failed or timed out, falling back to client-side sandboxed execution:", err.message);
      
      return new Promise((resolve) => {
        try {
          const transpiledJs = transpilePython(code);
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
