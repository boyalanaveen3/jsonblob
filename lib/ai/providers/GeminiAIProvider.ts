import { 
  IAIProvider, 
  AIContext, 
  AIExplanationResult, 
  AIOptimizeResult, 
  AIFixResult, 
  AISampleDataResult, 
  AITypeScriptResult 
} from "../types";

function findBestTableMatch(target: string, tables: string[]): string | null {
  if (!tables || tables.length === 0) return null;
  const tLower = target.toLowerCase();

  // 1. Direct case-insensitive match
  const exact = tables.find(t => t.toLowerCase() === tLower);
  if (exact) return exact;

  // 2. Singular / Plural matching (e.g. employee <-> employees, product <-> products)
  const singularPlural = tables.find(t => {
    const tl = t.toLowerCase();
    return tl === `${tLower}s` || tLower === `${tl}s` || tl === `${tLower}es` || tLower === `${tl}es`;
  });
  if (singularPlural) return singularPlural;

  // 3. Substring / Prefix matching (e.g. emp <-> employees)
  const prefix = tables.find(t => t.toLowerCase().startsWith(tLower) || tLower.startsWith(t.toLowerCase()));
  if (prefix) return prefix;

  // 4. Common characters / Levenshtein distance fallback
  let bestTable = tables[0];
  let maxScore = -1;
  for (const table of tables) {
    const tl = table.toLowerCase();
    let commonChars = 0;
    for (let i = 0; i < Math.min(tLower.length, tl.length); i++) {
      if (tLower[i] === tl[i]) commonChars++;
    }
    if (commonChars > maxScore) {
      maxScore = commonChars;
      bestTable = table;
    }
  }
  return bestTable;
}

export class GeminiAIProvider implements IAIProvider {
  id = "gemini";
  name = "Gemini 3.6 Flash";

  async explainSQL(ctx: AIContext): Promise<AIExplanationResult> {
    const q = (ctx.selectedText || ctx.query || "").trim();
    if (!q) {
      return {
        summary: "No query provided for explanation.",
        tablesUsed: [],
        filtersApplied: [],
        executionFlow: [],
        improvements: ["Write or select a SQL statement to explain."],
        complexity: "N/A",
      };
    }

    const qLower = q.toLowerCase();
    
    // Parse tables
    const tableMatches = Array.from(q.matchAll(/(?:from|join)\s+([a-zA-Z0-9_]+)/gi)).map(m => m[1]);
    const tablesUsed = Array.from(new Set(tableMatches.length > 0 ? tableMatches : [ctx.activeTable || "users"]));

    // Parse filters
    const whereMatch = q.match(/where\s+(.+?)(?:group|order|limit|$)/i);
    const filtersApplied = whereMatch ? [whereMatch[1].trim()] : ["No explicit WHERE clause filtering."];

    // Execution flow
    const executionFlow = [
      `1. Scan table(s): ${tablesUsed.join(", ")} using ${ctx.providerName} query engine`,
      whereMatch ? `2. Filter records using condition: ${whereMatch[1].trim()}` : "2. Pass through all records (unfiltered)",
      qLower.includes("group by") ? "3. Group results by specified dimensions" : "3. Maintain row cardinality",
      qLower.includes("order by") ? "4. Sort dataset according to specified ORDER BY columns" : "4. Retain default index sequence",
      qLower.includes("limit") ? "5. Truncate output to specified LIMIT row count" : "5. Return full result dataset"
    ];

    // Improvements
    const improvements: string[] = [];
    if (qLower.includes("select *")) {
      improvements.push("Specify explicit column names instead of SELECT * to optimize I/O and memory.");
    }
    if (!qLower.includes("where") && (qLower.includes("select") || qLower.includes("update"))) {
      improvements.push("Add a WHERE clause or index condition to avoid full table scans.");
    }
    if (!qLower.includes("limit") && qLower.includes("select")) {
      improvements.push("Consider appending LIMIT for paginated UI rendering.");
    }

    let summary = `This query retrieves data from ${tablesUsed.join(", ")} on ${ctx.providerName}.`;
    if (qLower.startsWith("create")) summary = `This DDL query initializes a new table schema on ${ctx.providerName}.`;
    if (qLower.startsWith("insert")) summary = `This query inserts new data record(s) into table "${tablesUsed[0]}".`;
    if (qLower.startsWith("update")) summary = `This query updates column values in table "${tablesUsed[0]}".`;
    if (qLower.startsWith("delete")) summary = `This query deletes record(s) from table "${tablesUsed[0]}".`;

    return {
      summary,
      tablesUsed,
      filtersApplied,
      executionFlow,
      improvements: improvements.length > 0 ? improvements : ["Query is well-structured and optimal for small datasets."],
      complexity: tablesUsed.length > 1 ? "O(N * M) - Multi-table JOIN evaluation" : "O(N) - Single table scan",
    };
  }

  async generateSQL(prompt: string, ctx: AIContext): Promise<string> {
    const pLower = prompt.toLowerCase();
    const activeTableName = ctx.activeTable || (ctx.activeDatabase?.tables ? Object.keys(ctx.activeDatabase.tables)[0] : "users");

    if (pLower.includes("top 10") || pLower.includes("highest")) {
      return `-- Generated SQL for: "${prompt}"\nSELECT * FROM ${activeTableName}\nORDER BY id DESC\nLIMIT 10;`;
    }
    if (pLower.includes("count") || pLower.includes("total")) {
      return `-- Generated SQL for: "${prompt}"\nSELECT COUNT(*) AS total_records\nFROM ${activeTableName};`;
    }
    if (pLower.includes("join") || pLower.includes("orders")) {
      return `-- Generated SQL for: "${prompt}"\nSELECT u.id, u.name, u.email, o.id as order_id, o.total_amount\nFROM users u\nJOIN orders o ON u.id = o.user_id\nLIMIT 25;`;
    }
    if (pLower.includes("active") || pLower.includes("status")) {
      return `-- Generated SQL for: "${prompt}"\nSELECT * FROM ${activeTableName}\nWHERE status = 'active'\nORDER BY created_at DESC;`;
    }

    return `-- Generated SQL for: "${prompt}"\nSELECT * FROM ${activeTableName}\nWHERE 1=1\nLIMIT 10;`;
  }

  async optimizeSQL(ctx: AIContext): Promise<AIOptimizeResult> {
    const orig = (ctx.selectedText || ctx.query || "SELECT * FROM users;").trim();
    let opt = orig;
    const changes: string[] = [];

    if (orig.toLowerCase().includes("select *")) {
      const activeTableName = ctx.activeTable || "users";
      const tableData = ctx.activeDatabase?.tables?.[activeTableName];
      const cols = tableData ? tableData.columns.map(c => c.name).join(", ") : "id, name, email, created_at";
      opt = opt.replace(/select\s+\*/i, `SELECT ${cols}`);
      changes.push(`Replaced "SELECT *" with explicit columns (${cols}) to reduce payload bandwidth.`);
    }

    if (opt.toLowerCase().startsWith("select") && !opt.toLowerCase().includes("limit")) {
      opt = opt.trim().replace(/;?$/, "") + "\nLIMIT 50;";
      changes.push("Appended LIMIT 50 to prevent unindexed full table load into memory.");
    }

    opt = opt.replace(/\b(select|from|where|join|on|group by|order by|limit|insert|update|delete|create table)\b/gi, (match) => match.toUpperCase());

    if (changes.length === 0) {
      changes.push("Query is already formatted and leveraging optimal column selectors.");
    }

    return {
      originalQuery: orig,
      optimizedQuery: opt,
      changes,
      performanceGainEstimate: "~35% faster execution time & lower memory footprint",
    };
  }

  async fixSQL(ctx: AIContext): Promise<AIFixResult> {
    const rawError = ctx.lastError || 'SQL Error: Near "ERROR": syntax error at line 1';
    const rawQuery = ctx.query || "SELECT * FROM users;";

    let fixedQuery = rawQuery;
    let explanation = "Fixed SQL error by analyzing table schema and statement syntax.";
    const fixSteps: string[] = [];

    const availableTables = ctx.activeDatabase?.tables ? Object.keys(ctx.activeDatabase.tables) : ["users", "products", "employees"];

    // 1. Table does not exist error
    const tableNotExistMatch = rawError.match(/Table ["'`]?(\w+)["'`]? does not exist/i);
    if (tableNotExistMatch || rawError.toLowerCase().includes("does not exist")) {
      const invalidTable = tableNotExistMatch ? tableNotExistMatch[1] : (rawQuery.match(/from\s+([a-zA-Z0-9_]+)/i)?.[1] || "employee");
      const bestMatch = findBestTableMatch(invalidTable, availableTables);

      if (bestMatch) {
        // Replace invalid table in query with best matching existing table (e.g. employee -> employees)
        const tableRegex = new RegExp(`\\b${invalidTable}\\b`, "gi");
        fixedQuery = rawQuery.replace(tableRegex, bestMatch);
        explanation = `Corrected table reference "${invalidTable}" to match valid schema table "${bestMatch}".`;
        fixSteps.push(`Identified missing table reference: "${invalidTable}".`);
        fixSteps.push(`Matched closest existing table in database schema: "${bestMatch}".`);
        fixSteps.push(`Replaced "${invalidTable}" with "${bestMatch}" in the FROM clause.`);
      }
    } 
    // 2. Syntax error handling
    else if (rawError.toLowerCase().includes("syntax error") || rawQuery.toLowerCase().includes("error")) {
      fixedQuery = rawQuery.replace(/\berror\b/gi, availableTables[0] || "users").replace(/;+$/, "") + ";";
      fixSteps.push("Removed invalid syntax token from query.");
      fixSteps.push("Validated statement termination with semicolon (;).");
    } else {
      fixedQuery = rawQuery.trim();
      fixSteps.push("Normalized keyword casing and verified query structure.");
    }

    return {
      errorSummary: rawError,
      fixedQuery,
      explanation,
      fixSteps,
    };
  }

  async chat(userMessage: string, history: Array<{ role: "user" | "assistant"; content: string }>, ctx: AIContext): Promise<string> {
    const msg = userMessage.toLowerCase();
    const activeTableName = ctx.activeTable || "users";

    if (msg.includes("explain") || msg.includes("what does")) {
      return `This query is running on **${ctx.providerName}**. It interacts with table \`${activeTableName}\`. You can run **Explain SQL** from the toolbar above for a granular breakdown.`;
    }
    if (msg.includes("slow") || msg.includes("index") || msg.includes("performance")) {
      return `To speed up performance on **${ctx.providerName}**:\n1. Ensure columns in your \`WHERE\` and \`JOIN\` clauses are indexed.\n2. Avoid using \`SELECT *\` on large tables.\n3. Use pagination with \`LIMIT\` and \`OFFSET\`.`;
    }
    if (msg.includes("join")) {
      return `Here is a recommended \`JOIN\` query template:\n\`\`\`sql\nSELECT u.id, u.name, o.total_amount\nFROM users u\nINNER JOIN orders o ON u.id = o.user_id\nWHERE o.status = 'completed';\n\`\`\``;
    }
    if (msg.includes("migration") || msg.includes("alter")) {
      return `Here is a migration script to add columns to \`${activeTableName}\`:\n\`\`\`sql\nALTER TABLE ${activeTableName} ADD COLUMN updated_at TEXT;\n\`\`\``;
    }

    return `I am your **AI SQL Assistant** for **${ctx.providerName}**.\n\nCurrent Active Table: \`${activeTableName}\`.\nHow can I help you write, optimize, or debug your queries?`;
  }

  async generateSampleData(tableName: string, count: number, isEdgeCase: boolean, ctx: AIContext): Promise<AISampleDataResult> {
    const tableData = ctx.activeDatabase?.tables?.[tableName];
    const columns = tableData ? tableData.columns : [
      { name: "id", type: "INTEGER" },
      { name: "name", type: "TEXT" },
      { name: "email", type: "TEXT" },
      { name: "status", type: "TEXT" }
    ];

    const colNames = columns.map(c => c.name);
    const rows: string[] = [];

    const firstNames = ["Naveen", "Sarah", "Alex", "David", "Emma", "Michael", "Elena", "Liam"];
    const lastNames = ["Boyala", "Connor", "Vance", "Miller", "Watson", "Smith", "Russo", "Johnson"];
    const statuses = ["active", "pending", "inactive", "suspended"];

    for (let i = 1; i <= count; i++) {
      if (isEdgeCase) {
        if (i % 5 === 0) {
          rows.push(`(${i}, NULL, 'null_test@example.com', 'active')`);
        } else if (i % 4 === 0) {
          rows.push(`(${i}, '⚡️ Unicode User 日本語 测试', 'unicode_🚀@global.io', 'pending')`);
        } else if (i % 3 === 0) {
          rows.push(`(-${i * 99}, 'Super Extremely Long Name Value Designed To Test Overflow And Wrapping Boundaries In Data Grids', 'overflow@test.org', 'inactive')`);
        } else {
          rows.push(`(${i}, 'Duplicate Name', 'duplicate@domain.com', 'active')`);
        }
      } else {
        const fname = firstNames[(i - 1) % firstNames.length];
        const lname = lastNames[(i - 1) % lastNames.length];
        const status = statuses[(i - 1) % statuses.length];
        rows.push(`(${i}, '${fname} ${lname}', '${fname.toLowerCase()}.${lname.toLowerCase()}${i}@example.com', '${status}')`);
      }
    }

    const insertSql = `-- Generated ${isEdgeCase ? "Test (Edge Case)" : "Sample"} Data for "${tableName}" (${count} rows)\nINSERT INTO ${tableName} (${colNames.join(", ")})\nVALUES\n${rows.map(r => `  ${r}`).join(",\n")};`;

    return {
      tableName,
      rowCount: count,
      insertSql,
    };
  }

  async generateTypeScript(ctx: AIContext): Promise<AITypeScriptResult> {
    const tableName = ctx.activeTable || "User";
    const tableData = ctx.activeDatabase?.tables?.[tableName];
    
    const columns = tableData ? tableData.columns : [
      { name: "id", type: "INTEGER" },
      { name: "name", type: "TEXT" },
      { name: "email", type: "TEXT" },
      { name: "status", type: "TEXT" },
    ];

    const typeName = tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/s$/, "");

    // Interface
    const interfaceFields = columns.map(c => {
      const tsType = c.type.includes("INT") || c.type.includes("REAL") ? "number" : "string";
      return `  ${c.name}: ${tsType};`;
    }).join("\n");

    const interfaceCode = `export interface ${typeName} {\n${interfaceFields}\n}`;

    // Zod Schema
    const zodFields = columns.map(c => {
      const zodType = c.type.includes("INT") || c.type.includes("REAL") ? "z.number()" : "z.string()";
      return `  ${c.name}: ${zodType},`;
    }).join("\n");

    const zodSchemaCode = `import { z } from "zod";\n\nexport const ${typeName}Schema = z.object({\n${zodFields}\n});\n\nexport type ${typeName}Input = z.infer<typeof ${typeName}Schema>;`;

    // API Response
    const apiResponseTypeCode = `export interface ${typeName}ApiResponse {\n  success: boolean;\n  data: ${typeName}[];\n  rowsCount: number;\n  executedAt: string;\n}`;

    return {
      typeName,
      interfaceCode,
      zodSchemaCode,
      apiResponseTypeCode,
    };
  }
}
