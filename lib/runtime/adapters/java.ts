import { LanguageAdapter, ExecutionResult, ValidationResult } from "@/types/playground";
import { runtimeManager } from "../runtimeManager";
import { javascriptAdapter } from "./javascript";

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

export const javaAdapter: LanguageAdapter = {
  language: "java",
  extension: "java",

  async run(code: string): Promise<ExecutionResult> {
    try {
      const runtime = runtimeManager.getRuntime("java");
      if (!runtime) throw new Error("Java runtime not registered");
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
    // Java formatting uses the same curly braces and structure as JavaScript
    return javascriptAdapter.format(code);
  },

  validate(code: string): ValidationResult {
    try {
      const transpiled = transpileJava(code);
      new Function(transpiled);
      return { valid: true };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || "Java Syntax Error",
      };
    }
  },
};
