import { LanguageAdapter, ExecutionResult, ValidationResult } from "@/types/playground";
import { runtimeManager } from "../runtimeManager";

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
    
    // Strip Python imports so they do not cause JS syntax errors
    if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
      result.push("");
      continue;
    }

    if (trimmed.startsWith("#")) {
      result.push(line.replace(/#/g, "//"));
      continue;
    }

    // Measure indentation (spaces)
    const indent = line.search(/\S/);

    // If indentation decreases, close blocks
    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      result.push(" ".repeat(indentStack[indentStack.length - 1]) + "}");
    }

    let processed = trimmed;
    
    // Replace def name(args):
    if (processed.startsWith("def ")) {
      processed = processed.replace(/^def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*:/, "function $1($2) {");
      indentStack.push(indent + 4);
    } 
    // Replace for ... in range(...):
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
    // Replace if / elif / else:
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
    // Replace while:
    else if (processed.startsWith("while ") && processed.endsWith(":")) {
      processed = processed.replace(/^while\s+(.+)\s*:/, "while ($1) {");
      indentStack.push(indent + 4);
    }

    // Replace lambda x: expression -> (x) => expression
    processed = processed.replace(/\blambda\s+([a-zA-Z0-9_,\s]+):\s*([^,)]+)/g, "($1) => $2");

    // Replace Python f-strings f"..." or f'...' with JS template literals `...`
    processed = processed.replace(/\bf"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      const inner = p1.replace(/\{([^{}]+)\}/g, "${$1}");
      return `\`${inner}\``;
    }).replace(/\bf'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1) => {
      const inner = p1.replace(/\{([^{}]+)\}/g, "${$1}");
      return `\`${inner}\``;
    });

    // Replace print(...) -> console.log(...)
    processed = processed.replace(/print\s*\((.*)\)/g, "console.log($1)");

    // Convert boolean: True -> true, False -> false
    processed = processed.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false");

    // Convert list append to push
    processed = processed.replace(/\.append\s*\((.*)\)/g, ".push($1)");

    result.push(" ".repeat(indent) + processed);
  }

  // Close any remaining blocks
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

export const pythonAdapter: LanguageAdapter = {
  language: "python",
  extension: "py",

  async run(code: string): Promise<ExecutionResult> {
    try {
      const runtime = runtimeManager.getRuntime("python");
      if (!runtime) throw new Error("Python runtime not registered");
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
    // Indentation is semantic in Python; return raw code to prevent breaking
    return code;
  },

  validate(code: string): ValidationResult {
    try {
      const transpiled = transpilePython(code);
      new Function(transpiled);
      return { valid: true };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || "Python Syntax Error",
      };
    }
  },
};
