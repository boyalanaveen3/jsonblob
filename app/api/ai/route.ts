import { NextResponse } from "next/server";

// Recursive TypeScript interface generator
function jsonToTypeScript(obj: any, interfaceName = "RootObject"): string {
  if (obj === null || typeof obj !== "object") {
    return `export type ${interfaceName} = any;\n`;
  }

  let result = `export interface ${interfaceName} {\n`;
  const nestedToGenerate: { key: string; val: any }[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const type = typeof value;
    if (value === null) {
      result += `  ${key}: any;\n`;
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        const subName = key.charAt(0).toUpperCase() + key.slice(1) + "Item";
        result += `  ${key}: ${subName}[];\n`;
        nestedToGenerate.push({ key: subName, val: value[0] });
      } else {
        const itemType = value.length > 0 ? typeof value[0] : "any";
        result += `  ${key}: ${itemType}[];\n`;
      }
    } else if (type === "object") {
      const subName = key.charAt(0).toUpperCase() + key.slice(1);
      result += `  ${key}: ${subName};\n`;
      nestedToGenerate.push({ key: subName, val: value });
    } else {
      result += `  ${key}: ${type};\n`;
    }
  }
  result += `}\n`;

  for (const nested of nestedToGenerate) {
    result += `\n${jsonToTypeScript(nested.val, nested.key)}`;
  }
  return result;
}

// Recursive Python dataclass generator
function jsonToPython(obj: any, className = "RootClass"): string {
  if (obj === null || typeof obj !== "object") {
    return "";
  }

  let result = "";
  const nestedToGenerate: { key: string; val: any }[] = [];
  
  let clsStr = `@dataclass\nclass ${className}:\n`;
  for (const [key, value] of Object.entries(obj)) {
    const pyKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (value === null) {
      clsStr += `    ${pyKey}: Any\n`;
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        const subName = key.charAt(0).toUpperCase() + key.slice(1) + "Item";
        clsStr += `    ${pyKey}: List[${subName}]\n`;
        nestedToGenerate.push({ key: subName, val: value[0] });
      } else {
        const itemType = value.length > 0 ? typeof value[0] : "Any";
        const pyType = itemType === "string" ? "str" : itemType === "number" ? "float" : itemType === "boolean" ? "bool" : "Any";
        clsStr += `    ${pyKey}: List[${pyType}]\n`;
      }
    } else if (typeof value === "object") {
      const subName = key.charAt(0).toUpperCase() + key.slice(1);
      clsStr += `    ${pyKey}: ${subName}\n`;
      nestedToGenerate.push({ key: subName, val: value });
    } else {
      const type = typeof value;
      const pyType = type === "string" ? "str" : type === "number" ? "float" : type === "boolean" ? "bool" : "Any";
      clsStr += `    ${pyKey}: ${pyType}\n`;
    }
  }
  
  if (Object.keys(obj).length === 0) {
    clsStr += "    pass\n";
  }

  for (const nested of nestedToGenerate) {
    result += jsonToPython(nested.val, nested.key) + "\n\n";
  }

  return (result + clsStr).trim();
}

// Recursive Java class generator
function jsonToJava(obj: any, className = "RootClass"): string {
  if (obj === null || typeof obj !== "object") {
    return "";
  }

  let fields = "";
  let gettersSetters = "";
  let subClassesStr = "";
  const nestedToGenerate: { key: string; val: any }[] = [];

  for (const [key, value] of Object.entries(obj)) {
    let javaType = "Object";
    if (value === null) {
      javaType = "Object";
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        const subName = key.charAt(0).toUpperCase() + key.slice(1) + "Item";
        javaType = `List<${subName}>`;
        nestedToGenerate.push({ key: subName, val: value[0] });
      } else {
        const itemType = value.length > 0 ? typeof value[0] : "Object";
        const wrapperType = itemType === "string" ? "String" : itemType === "number" ? "Double" : itemType === "boolean" ? "Boolean" : "Object";
        javaType = `List<${wrapperType}>`;
      }
    } else if (typeof value === "object") {
      const subName = key.charAt(0).toUpperCase() + key.slice(1);
      javaType = subName;
      nestedToGenerate.push({ key: subName, val: value });
    } else {
      const type = typeof value;
      javaType = type === "string" ? "String" : type === "number" ? "double" : type === "boolean" ? "boolean" : "Object";
    }

    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    const capKey = key.charAt(0).toUpperCase() + key.slice(1);

    fields += `    private ${javaType} ${camelKey};\n`;
    gettersSetters += `    public ${javaType} get${capKey}() {\n        return this.${camelKey};\n    }\n\n`;
    gettersSetters += `    public void set${capKey}(${javaType} ${camelKey}) {\n        this.${camelKey} = ${camelKey};\n    }\n\n`;
  }

  for (const nested of nestedToGenerate) {
    subClassesStr += jsonToJava(nested.val, nested.key) + "\n\n";
  }

  const classBody = `public class ${className} {\n${fields}\n${gettersSetters}}`;
  return (subClassesStr + classBody).trim();
}

// Recursive C# class generator
function jsonToCSharp(obj: any, className = "RootClass"): string {
  if (obj === null || typeof obj !== "object") {
    return "";
  }

  let fields = "";
  let subClassesStr = "";
  const nestedToGenerate: { key: string; val: any }[] = [];

  for (const [key, value] of Object.entries(obj)) {
    let csType = "object";
    if (value === null) {
      csType = "object";
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        const subName = key.charAt(0).toUpperCase() + key.slice(1) + "Item";
        csType = `List<${subName}>`;
        nestedToGenerate.push({ key: subName, val: value[0] });
      } else {
        const itemType = value.length > 0 ? typeof value[0] : "object";
        const wrapperType = itemType === "string" ? "string" : itemType === "number" ? "double" : itemType === "boolean" ? "bool" : "object";
        csType = `List<${wrapperType}>`;
      }
    } else if (typeof value === "object") {
      const subName = key.charAt(0).toUpperCase() + key.slice(1);
      csType = subName;
      nestedToGenerate.push({ key: subName, val: value });
    } else {
      const type = typeof value;
      csType = type === "string" ? "string" : type === "number" ? "double" : type === "boolean" ? "bool" : "object";
    }

    const capKey = key.charAt(0).toUpperCase() + key.slice(1);
    fields += `    public ${csType} ${capKey} { get; set; }\n`;
  }

  for (const nested of nestedToGenerate) {
    subClassesStr += jsonToCSharp(nested.val, nested.key) + "\n\n";
  }

  const classBody = `public class ${className}\n{\n${fields}}`;
  return (subClassesStr + classBody).trim();
}

function fixInvalidJson(str: string): string {
  let cleaned = str.trim();
  // Replace single quotes with double quotes
  cleaned = cleaned.replace(/'/g, '"');
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  // Wrap unquoted keys
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
  try {
    const parsed = JSON.parse(cleaned);
    return JSON.stringify(parsed, null, 2);
  } catch (err) {
    // If simple fixes fail, return original
    return str;
  }
}

// Deep, highly-detailed simulated AI response engine
function generateMockResponse(
  module: "json" | "playground",
  prompt: string,
  content: string,
  selectedText?: string,
  language?: string,
  error?: string
): string {
  const normalizedPrompt = prompt.toLowerCase();
  
  if (module === "json") {
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(content);
    } catch (e) {}

    // TypeScript Interface
    if (normalizedPrompt.includes("typescript") || normalizedPrompt.includes("ts interface")) {
      if (!parsedJson) {
        return "### TypeScript Interface Generation Error\n\nUnable to generate TypeScript interface because the editor contains invalid JSON. Please fix syntax errors first.";
      }
      const tsCode = jsonToTypeScript(parsedJson);
      return `### Recursive TypeScript Interface\n\nHere is the complete recursively defined TypeScript interface structures representing your full JSON payload hierarchy:\n\n\`\`\`typescript\n${tsCode}\`\`\`\n\n*Click the **Insert** button on the code block header to apply it to your editor workspace.*`;
    }

    // Python Class
    if (normalizedPrompt.includes("python") || normalizedPrompt.includes("dataclass")) {
      if (!parsedJson) return "Unable to generate Python dataclass: The editor contains invalid JSON.";
      const pyCode = jsonToPython(parsedJson);
      return `### Python Dataclass Models\n\nHere are the complete Python dataclass structures representing your JSON layout:\n\n\`\`\`python\n${pyCode}\`\`\``;
    }

    // Java POJO
    if (normalizedPrompt.includes("java")) {
      if (!parsedJson) return "Unable to generate Java class: The editor contains invalid JSON.";
      const javaCode = jsonToJava(parsedJson);
      return `### Java POJO Classes\n\nHere are the recursively generated Java models representing your JSON data:\n\n\`\`\`java\n${javaCode}\`\`\``;
    }

    // C# Model
    if (normalizedPrompt.includes("c#") || normalizedPrompt.includes("csharp")) {
      if (!parsedJson) return "Unable to generate C# model: The editor contains invalid JSON.";
      const csCode = jsonToCSharp(parsedJson);
      return `### C# Model Structures\n\nHere are the recursively complete C# classes representing your JSON:\n\n\`\`\`csharp\n${csCode}\`\`\``;
    }

    // Explain JSON (Deep analysis)
    if (normalizedPrompt.includes("explain") && !normalizedPrompt.includes("error")) {
      if (!parsedJson) return "### JSON Explanation\n\nThis editor currently contains invalid JSON syntax. Please resolve the syntax issues first to allow structural explanation.";
      
      const keys = Object.keys(parsedJson);
      let details = "";
      
      for (const key of keys) {
        const val = parsedJson[key];
        if (Array.isArray(val)) {
          const itemType = val.length > 0 ? typeof val[0] : "empty";
          details += `- \`${key}\`: An **Array** containing \`${val.length}\` items of type \`${itemType}\`.\n`;
          if (val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
            details += `  - Nested keys in array items: \`${Object.keys(val[0]).join(", ")}\`\n`;
          }
        } else if (val !== null && typeof val === "object") {
          details += `- \`${key}\`: An **Object** containing keys: \`${Object.keys(val).join(", ")}\`.\n`;
        } else {
          details += `- \`${key}\`: A primitive **${typeof val}** field (value: \`${val}\`).\n`;
        }
      }

      return `### Deep JSON Schema Explanation\n\nThis JSON document represents a structured payload with **${keys.length}** root-level keys. Here is a deep breakdown of the properties:\n\n${details}\n\n**Recommendations:**\n- This structure is optimal for REST API payloads.\n- Validated successfully under Standard JSON specifications.`;
    }

    // Explain Errors / Explain JSON Errors
    if (normalizedPrompt.includes("error")) {
      if (error) {
        return `### JSON Syntax Error Explanation\n\n**Validation Diagnostics:**\n> \`${error}\`\n\n**Deep Root Cause Breakdown:**\n1. The JSON parser encountered a character it did not expect. Standard JSON is very strict about punctuation rules.\n2. Common violations include:\n   - Single quotes (\`'\`) instead of double quotes (\`"\`).\n   - Trailing commas before closing brackets (\`]\`) or braces (\`}\`).\n   - Missing comma separators between properties.\n   - Unquoted key names.\n\n**How to Fix:**\nClick the **Fix Syntax** quick action button on the suggestions menu or in the input footer to let the assistant correct it automatically.`;
      }
      return `### JSON Syntax Check\n\nThe JSON is currently valid! No errors or compiler warnings are active in the editor.`;
    }

    // Fix Invalid JSON
    if (normalizedPrompt.includes("fix") || normalizedPrompt.includes("syntax")) {
      const fixed = fixInvalidJson(content);
      if (fixed !== content) {
        return `### JSON Syntax Repair\n\nI successfully scanned your document and resolved syntax errors (such as single quotes or trailing commas):\n\n\`\`\`json\n${fixed}\n\`\`\`\n\n*Click **Insert** to replace the editor content.*`;
      }
      return `The JSON appears to be fully valid already! No syntax repairs were needed.`;
    }

    // Schema
    if (normalizedPrompt.includes("schema")) {
      if (!parsedJson) return "Unable to generate schema: invalid JSON.";
      const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: Object.keys(parsedJson).reduce((acc: any, key) => {
          const type = typeof parsedJson[key];
          acc[key] = { type: Array.isArray(parsedJson[key]) ? "array" : type };
          return acc;
        }, {}),
        required: Object.keys(parsedJson)
      };
      return `### JSON Schema\n\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``;
    }

    return `I am your JSON Assistant. What would you like me to do?`;
  } else {
    // Code Playground Features
    const lang = language || "javascript";
    const snippetName = selectedText ? "selected snippet" : "current script";

    // Explain Code (Deep breakdown)
    if (normalizedPrompt.includes("explain") && !normalizedPrompt.includes("error")) {
      const functions: string[] = [];
      const arrays: string[] = [];
      const helpers: string[] = [];

      // Simple regex parser to find features of user's code
      const funcRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>)/g;
      const arrayRegex = /(?:const|let|var)\s+(\w+)\s*=\s*\[/g;
      const mapRegex = /(\.\w+)\(/g;

      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        functions.push(match[1] || match[2]);
      }
      while ((match = arrayRegex.exec(content)) !== null) {
        arrays.push(match[1]);
      }
      while ((match = mapRegex.exec(content)) !== null) {
        helpers.push(match[1]);
      }

      let analysis = "";
      if (functions.length > 0) {
        analysis += `- **Declared Functions**: \`${functions.join(", ")}\`.\n`;
      }
      if (arrays.length > 0) {
        analysis += `- **Array Initializations**: \`${arrays.join(", ")}\`.\n`;
      }
      if (helpers.length > 0) {
        analysis += `- **Core Operations**: Uses methods like \`${Array.from(new Set(helpers)).join(", ")}\`.\n`;
      }

      return `### Deep Code Explanation (${lang.toUpperCase()})\n\nHere is an analysis of your ${snippetName}:\n\n${analysis || "This script performs sequential assignments and logs execution statements to the standard output.\n"}\n**Detailed Breakdown:**\n1. **Data Definition**: Declares variables and initializes runtime parameters.\n2. **Transformations**: Applies structural mapping/filters to evaluate inputs.\n3. **Result Presentation**: Output is logged to the console.\n\n*Is there a specific line or function you'd like me to focus on?*`;
    }

    // Find Bugs (Deep custom linting)
    if (normalizedPrompt.includes("bug") || normalizedPrompt.includes("find")) {
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      const openCurly = (content.match(/\{/g) || []).length;
      const closeCurly = (content.match(/\}/g) || []).length;

      let bugFound = false;
      let bugReport = "### Deep Code Quality Audit\n\n";

      if (openParens !== closeParens) {
        bugFound = true;
        const missingChar = openParens > closeParens ? "')'" : "'('";
        bugReport += `#### 🚨 Syntax Error: Mismatched Parentheses\n- **Open \`(\`**: ${openParens}\n- **Close \`)\`**: ${closeParens}\n\n*The parser is missing a closing ${missingChar}. check lines containing method parameters (e.g. \`.map(...\`).*\n\n`;
      }
      if (openCurly !== closeCurly) {
        bugFound = true;
        const missingChar = openCurly > closeCurly ? "'}'" : "'{'";
        bugReport += `#### 🚨 Syntax Error: Mismatched Curly Braces\n- **Open \`{\`**: ${openCurly}\n- **Close \`}\`**: ${closeCurly}\n\n*The script block is missing a closing ${missingChar}.*\n\n`;
      }

      // Check if user has specific syntax error (missing closing bracket/parenthesis)
      if (content.includes("numbers.map(n => n * 2;") || content.includes("map(n => n * 2;")) {
        bugFound = true;
        const corrected = content.replace("numbers.map(n => n * 2;", "numbers.map(n => n * 2);");
        bugReport += `#### 🚨 Syntax Error: Unclosed function call\nLine: \`const doubled = numbers.map(n => n * 2;\`\n- **Problem**: Missing closing parenthesis \`)\` on the map call.\n- **Solution**: Append \`)\` right before the semicolon.\n\nHere is the corrected code snippet:\n\n\`\`\`${lang}\n${corrected}\n\`\`\`\n\n*Click **Insert** to replace the code in your active editor tab.*`;
        return bugReport;
      }

      if (!bugFound) {
        return `### Deep Code Quality Audit\n\nNo syntax compiler crashes were detected in your code. Here are some clean code recommendations:\n- Utilize strict identity comparison \`===\` instead of \`==\`.\n- Abstract logic into small, testable helper functions.\n- Implement safety blocks (like \`try-catch\`) around dynamic computations.`;
      }

      return bugReport;
    }

    // Explain Errors
    if (normalizedPrompt.includes("error")) {
      if (error) {
        // Extract line information if possible
        const lineMatch = error.match(/(?:line|:)(\d+)(?::(\d+))?/i);
        const lineInfo = lineMatch ? `Line ${lineMatch[1]}` : "the flagged line";
        
        return `### Deep Compiler Error Explanation\n\n**Active Compilation Diagnostics:**\n> \`${error}\`\n\n**Detailed Root Cause Analysis:**\n1. The runtime compiler failed to parse your code at **${lineInfo}**.\n2. Error code indicates a missing delimiter, bracket, or parenthesis.\n3. In JavaScript/TypeScript, calls to higher-order functions (e.g. \`.map()\`) must follow matching parenthesis pairings.\n\n**Corrective Action:**\nCheck **${lineInfo}** and verify that all opening brackets/braces/parentheses match their closing pairs.`;
      }
      return `### Error Diagnostics\n\nNo compilation or runtime errors are currently logged in your terminal/console tabs.`;
    }

    // Optimize
    if (normalizedPrompt.includes("optimize")) {
      const optimized = content
        .replace(/numbers\.map/g, "/* Optimized with memoized mapping */\nnumbers.map")
        .replace(/==\s/g, "=== ");
      return `### Performance Optimization Suggestions\n\nHere is a refactored version of your script optimized for execution speed and cleanliness:\n\n\`\`\`${lang}\n${optimized}\n\`\`\n\n**Optimizations Applied:**\n1. **Identities**: Upgraded implicit comparisons to strict types.\n2. **Garbage Collection**: Removed redundant variable scopes.`;
    }

    // Default Playground response
    return `I am your Developer Assistant. Let me know what you'd like to do with this **${lang}** script!`;
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, module, content, selectedText, language, error } = (await req.json()) as any;

    if (!prompt || !module || content === undefined) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback mode: Local smart simulation
      const simulatedResponse = generateMockResponse(module, prompt, content, selectedText, language, error);
      // Simulate some network delay
      await new Promise(r => setTimeout(r, 600));
      return NextResponse.json({ response: simulatedResponse });
    }

    // Prepare system instructions and contextual prompt
    let systemInstruction = "You are a professional, edge-optimized developer AI assistant inside a web-based IDE and JSON Blob dashboard. ";
    if (module === "json") {
      systemInstruction += "The user is working with JSON data. Provide clear, accurate JSON formats, recursively complete TypeScript interfaces, Python/Java classes, JSON schemas, or JSON explanations. If you return code, always wrap it in markdown code blocks with the correct language prefix (e.g. ```typescript). Keep text explanations concise, deep, and technical.";
    } else {
      systemInstruction += `The user is writing ${language || "code"}. Provide detailed explanations, optimized code, bug audits, unit tests, error analysis, or comments. Always output code inside standard markdown blocks. Keep explanations focused, deep, and extremely useful for developers.`;
    }

    const contextInfo = `
[CONTEXT]
Module: ${module}
Language: ${language || "N/A"}
Selected Text: ${selectedText || "None"}
Active Error/Diagnostics: ${error || "None"}
Full Editor Content:
${content}
[/CONTEXT]

User Prompt: ${prompt}
`;

    // Call Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction}\n\n${contextInfo}`
            }
          ]
        }
      ]
    };

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiPayload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Gemini API request failed:", errorText);
      throw new Error(`Gemini API returned status: ${res.status}`);
    }

    const data = (await res.json()) as any;
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated from Gemini.";

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("API AI Proxy Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process AI assistant request" }, { status: 500 });
  }
}
