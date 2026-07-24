import { IDatabaseProvider, D1DatabaseSchema, QueryExecutionResult, ProviderConnectionStatus } from "../types";

const INITIAL_SQLITE_DATABASES: D1DatabaseSchema[] = [
  {
    id: "sqlite-main-db",
    name: "sqlite_default.db",
    tables: {
      users: {
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "name", type: "TEXT" },
          { name: "email", type: "TEXT" },
          { name: "role", type: "TEXT" },
          { name: "status", type: "TEXT" },
          { name: "created_at", type: "TEXT" }
        ],
        rows: [
          { id: 1, name: "Naveen Boyala", email: "naveen@jsonblob.io", role: "admin", status: "active", created_at: "2026-07-01" },
          { id: 2, name: "Sarah Connor", email: "sarah@resistance.net", role: "editor", status: "active", created_at: "2026-07-02" },
          { id: 3, name: "John Doe", email: "john.doe@gmail.com", role: "user", status: "inactive", created_at: "2026-07-05" },
          { id: 4, name: "Bruce Wayne", email: "bruce@waynecorp.com", role: "user", status: "active", created_at: "2026-07-10" },
          { id: 5, name: "Clark Kent", email: "clark@dailyplanet.com", role: "user", status: "active", created_at: "2026-07-12" },
        ]
      },
      products: {
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "title", type: "TEXT" },
          { name: "price", type: "REAL" },
          { name: "category", type: "TEXT" },
          { name: "in_stock", type: "INTEGER" }
        ],
        rows: [
          { id: 101, title: "SaaS Dev License", price: 49.99, category: "software", in_stock: 1 },
          { id: 102, title: "Edge Proxy Routing", price: 199.50, category: "infra", in_stock: 1 },
          { id: 103, title: "Premium Support (Annual)", price: 1200.00, category: "support", in_stock: 0 },
          { id: 104, title: "AI Token Pack (1M)", price: 15.00, category: "ai", in_stock: 1 },
        ]
      }
    }
  },
  {
    id: "sqlite-analytics-db",
    name: "local_analytics.db",
    tables: {
      logs: {
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "event", type: "TEXT" },
          { name: "status", type: "TEXT" },
          { name: "duration_ms", type: "INTEGER" }
        ],
        rows: [
          { id: 5001, event: "auth_login", status: "success", duration_ms: 12 },
          { id: 5002, event: "blob_create", status: "success", duration_ms: 45 },
          { id: 5003, event: "sql_execute", status: "error", duration_ms: 320 },
        ]
      }
    }
  }
];

export class SQLiteProvider implements IDatabaseProvider {
  id = "sqlite";
  name = "SQLite (Default)";
  description = "Embedded zero-configuration local database sandbox";
  requiresAuth = false;

  private databases: D1DatabaseSchema[];

  constructor() {
    this.databases = INITIAL_SQLITE_DATABASES;
  }

  async connect(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    // SQLite local sandbox remains connected
  }

  getConnectionStatus(): ProviderConnectionStatus {
    return {
      isConnected: true,
      accountName: "Local Sandbox Engine",
    };
  }

  async getDatabases(): Promise<D1DatabaseSchema[]> {
    return this.databases;
  }

  async executeQuery(dbId: string, queryStr: string): Promise<QueryExecutionResult> {
    const start = performance.now();

    // Check syntax error keyword
    if (queryStr.toLowerCase().includes("syntax error") || queryStr.toLowerCase().includes("error")) {
      return {
        error: `SQL Error [SQLITE]: Near "ERROR": syntax error at line 1`,
        duration: Math.round(performance.now() - start + 5),
      };
    }

    // Strip comments
    let cleanSql = queryStr.replace(/\/\*[\s\S]*?\*\//g, "");
    cleanSql = cleanSql.split("\n").map(line => {
      const dashIdx = line.indexOf("--");
      if (dashIdx !== -1) return line.substring(0, dashIdx);
      const slashIdx = line.indexOf("//");
      if (slashIdx !== -1) return line.substring(0, slashIdx);
      return line;
    }).join("\n");

    const statements = cleanSql.split(";").map(s => s.trim()).filter(s => s.length > 0);
    if (statements.length === 0) {
      return { rows: [], rowsCount: 0, duration: 0 };
    }

    let currentDbs = [...this.databases];
    let activeDb = currentDbs.find(d => d.id === dbId) || currentDbs[0];
    let finalResults: any = null;
    let totalRows = 0;
    let lastMessage = "";

    try {
      for (const statement of statements) {
        const q = statement;
        const qLower = q.toLowerCase();

        const getTableKey = (tableName: string) => {
          const nameLower = tableName.toLowerCase();
          return Object.keys(activeDb.tables).find((k) => k.toLowerCase() === nameLower) || tableName;
        };

        // CREATE TABLE
        if (qLower.startsWith("create table")) {
          const match = q.replace(/\r?\n|\r/g, " ").match(/create\s+table\s+(\w+)\s*\((.*)\)/i);
          if (!match) throw new Error('Invalid CREATE TABLE syntax.');
          const tableName = match[1];
          const colsDef = match[2];
          const tableKey = getTableKey(tableName);

          const columns = colsDef.split(",").map(c => {
            const parts = c.trim().split(/\s+/);
            return { name: parts[0].trim(), type: (parts[1] || "TEXT").toUpperCase() };
          });

          activeDb.tables[tableKey] = { columns, rows: [] };
          lastMessage = `Table "${tableName}" created successfully in SQLite.`;
          finalResults = [{ result: "Success", message: lastMessage }];
          totalRows += 1;
          continue;
        }

        // INSERT INTO
        if (qLower.startsWith("insert into")) {
          const normalized = q.replace(/\r?\n|\r/g, " ");
          const match = normalized.match(/insert\s+into\s+(\w+)\s*(?:\(([^)]+)\))?\s*values\s*(.+)/i);
          if (!match) throw new Error('Invalid INSERT INTO syntax.');

          const tableName = match[1];
          const colsStr = match[2];
          let valsPart = match[3].trim();
          if (valsPart.toLowerCase().startsWith("values")) {
            valsPart = valsPart.substring(6).trim();
          }

          const tableKey = getTableKey(tableName);
          if (!activeDb.tables[tableKey]) throw new Error(`Table "${tableName}" does not exist.`);

          const parseValues = (str: string) => {
            const matches = str.match(/(?:[^\s,']+|'[^']*'|"[^"]*")+/g) || [];
            return matches.map((v) => {
              let val = v.trim();
              if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                return val.slice(1, -1);
              }
              if (val.toLowerCase() === "null") return null;
              if (val.toLowerCase() === "true") return true;
              if (val.toLowerCase() === "false") return false;
              if (!isNaN(Number(val))) return Number(val);
              return val;
            });
          };

          const rowMatches = valsPart.match(/\(([^)]+)\)/g);
          if (!rowMatches || rowMatches.length === 0) throw new Error('Invalid VALUES format.');

          const schemaCols = activeDb.tables[tableKey].columns.map(c => c.name);
          const insertedRows: Record<string, any>[] = [];

          for (const rowStr of rowMatches) {
            const innerVals = rowStr.slice(1, -1);
            const values = parseValues(innerVals);
            let newRow: Record<string, any> = {};

            if (colsStr) {
              const columns = colsStr.split(",").map((c) => c.trim());
              columns.forEach((col, idx) => { newRow[col] = values[idx]; });
            } else {
              schemaCols.forEach((col, idx) => {
                newRow[col] = values[idx] !== undefined ? values[idx] : null;
              });
            }
            insertedRows.push(newRow);
          }

          activeDb.tables[tableKey].rows.push(...insertedRows);
          lastMessage = `${insertedRows.length} row(s) inserted into "${tableName}".`;
          finalResults = [{ result: "Success", message: lastMessage }];
          totalRows += insertedRows.length;
          continue;
        }

        // SELECT
        if (qLower.startsWith("select")) {
          const match = q.replace(/\r?\n|\r/g, " ").match(/select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.+?))?(?:\s+limit\s+(\d+))?$/i);
          if (!match) {
            if (!qLower.includes("from")) {
              const rawVal = q.replace(/select/i, "").trim();
              finalResults = [{ value: rawVal }];
              totalRows += 1;
              continue;
            }
            throw new Error('Invalid SELECT syntax.');
          }

          const colsStr = match[1].trim();
          const tableName = match[2].trim();
          const whereStr = match[3];
          const limitStr = match[4];

          const tableKey = getTableKey(tableName);
          if (!activeDb.tables[tableKey]) throw new Error(`Table "${tableName}" does not exist.`);

          let rows = [...activeDb.tables[tableKey].rows];

          if (whereStr) {
            const whereMatch = whereStr.match(/(\w+)\s*(=|!=|>|<|>=|<=|like)\s*(.+)/i);
            if (whereMatch) {
              const col = whereMatch[1].trim();
              const op = whereMatch[2].trim().toLowerCase();
              let rawVal = whereMatch[3].trim();
              if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
                rawVal = rawVal.slice(1, -1);
              }
              rows = rows.filter(r => {
                const cell = r[col];
                if (cell === undefined) return false;
                if (op === "=") return String(cell) === rawVal;
                if (op === "!=") return String(cell) !== rawVal;
                return false;
              });
            }
          }

          if (limitStr) {
            rows = rows.slice(0, parseInt(limitStr, 10));
          }

          if (colsStr !== "*") {
            const columns = colsStr.split(",").map((c) => c.trim());
            rows = rows.map(r => {
              const newR: Record<string, any> = {};
              columns.forEach(c => { newR[c] = r[c] !== undefined ? r[c] : null; });
              return newR;
            });
          }

          finalResults = rows;
          totalRows += rows.length;
          continue;
        }

        // DROP TABLE
        if (qLower.startsWith("drop table")) {
          const match = q.match(/drop\s+table\s+(\w+)/i);
          if (!match) throw new Error('Invalid DROP TABLE syntax.');
          const tableName = match[1];
          const tableKey = getTableKey(tableName);
          delete activeDb.tables[tableKey];
          lastMessage = `Table "${tableName}" dropped successfully.`;
          finalResults = [{ result: "Success", message: lastMessage }];
          totalRows += 1;
          continue;
        }

        // Default query fallback
        finalResults = [{ result: "Success", query: statement }];
        totalRows += 1;
      }

      this.databases = currentDbs;
      const duration = Math.round(performance.now() - start + 8);
      return {
        rows: finalResults,
        rowsCount: totalRows,
        message: lastMessage || undefined,
        duration
      };

    } catch (err: any) {
      return {
        error: `SQL Error [SQLITE]: ${err.message}`,
        duration: Math.round(performance.now() - start + 5)
      };
    }
  }
}
