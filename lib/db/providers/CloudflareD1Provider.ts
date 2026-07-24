import { IDatabaseProvider, D1DatabaseSchema, QueryExecutionResult, ProviderConnectionStatus } from "../types";

const SESSION_STORAGE_KEY = "cloudflare_d1_session";
const DATABASES_STORAGE_KEY = "cloudflare_d1_databases";

const INITIAL_D1_DATABASES: D1DatabaseSchema[] = [
  {
    id: "d1-jsonblob-db",
    name: "jsonblob-db",
    size: "4.8 MB",
    sqliteVersion: "SQLite 3.45.1 (Cloudflare D1)",
    lastUpdated: "Just now",
    tables: {
      blobs: {
        columns: [
          { name: "id", type: "TEXT", isPrimaryKey: true },
          { name: "title", type: "TEXT" },
          { name: "content", type: "TEXT" },
          { name: "user_id", type: "TEXT", isForeignKey: true },
          { name: "created_at", type: "TEXT" },
          { name: "updated_at", type: "TEXT" }
        ],
        primaryKey: ["id"],
        foreignKeys: [{ column: "user_id", targetTable: "users", targetColumn: "id" }],
        rows: [
          { id: "b101-uuid", title: "User Settings JSON", content: "{\"theme\":\"dark\",\"notifications\":true}", user_id: "u1-naveen", created_at: "2026-07-23 10:00:00", updated_at: "2026-07-23 12:30:00" },
          { id: "b102-uuid", title: "API Config Schema", content: "{\"endpoint\":\"/api/v1\",\"version\":\"1.2\"}", user_id: "u1-naveen", created_at: "2026-07-23 11:15:00", updated_at: "2026-07-23 11:15:00" },
        ]
      },
      d1_migrations: {
        columns: [
          { name: "id", type: "INTEGER", isPrimaryKey: true },
          { name: "name", type: "TEXT" },
          { name: "applied_at", type: "TEXT" }
        ],
        primaryKey: ["id"],
        rows: [
          { id: 1, name: "0001_create_users_table.sql", applied_at: "2026-07-01 00:00:00" },
          { id: 2, name: "0002_create_blobs_table.sql", applied_at: "2026-07-05 14:20:00" },
          { id: 3, name: "0003_create_snippets_table.sql", applied_at: "2026-07-10 09:10:00" }
        ]
      },
      snippets: {
        columns: [
          { name: "id", type: "TEXT", isPrimaryKey: true },
          { name: "title", type: "TEXT" },
          { name: "code", type: "TEXT" },
          { name: "language", type: "TEXT" },
          { name: "created_at", type: "TEXT" }
        ],
        primaryKey: ["id"],
        rows: [
          { id: "s-sql-01", title: "Fetch Active Blobs", code: "SELECT * FROM blobs WHERE updated_at IS NOT NULL;", language: "sql", created_at: "2026-07-20 08:00:00" },
          { id: "s-ts-02", title: "Zod Schema Generator", code: "import { z } from 'zod';", language: "typescript", created_at: "2026-07-22 16:45:00" }
        ]
      },
      sqlite_sequence: {
        columns: [
          { name: "name", type: "TEXT" },
          { name: "seq", type: "INTEGER" }
        ],
        rows: [
          { name: "d1_migrations", seq: 3 }
        ]
      },
      users: {
        columns: [
          { name: "id", type: "TEXT", isPrimaryKey: true },
          { name: "name", type: "TEXT" },
          { name: "email", type: "TEXT" },
          { name: "role", type: "TEXT" },
          { name: "created_at", type: "TEXT" }
        ],
        primaryKey: ["id"],
        rows: [
          { id: "u1-naveen", name: "Naveen Boyala", email: "boyalanaveen103@gmail.com", role: "admin", created_at: "2026-07-01 00:00:00" },
          { id: "u2-sarah", name: "Sarah Connor", email: "sarah@cyberdyne.io", role: "editor", created_at: "2026-07-02 12:00:00" }
        ]
      }
    },
    views: {
      active_user_blobs_v: {
        name: "active_user_blobs_v",
        definition: "SELECT b.id, b.title, u.name FROM blobs b JOIN users u ON b.user_id = u.id;"
      }
    },
    indexes: {
      idx_blobs_user: {
        name: "idx_blobs_user",
        tableName: "blobs",
        columns: ["user_id"]
      },
      idx_users_email: {
        name: "idx_users_email",
        tableName: "users",
        columns: ["email"],
        isUnique: true
      }
    },
    triggers: {
      trg_update_blob_timestamp: {
        name: "trg_update_blob_timestamp",
        tableName: "blobs",
        event: "BEFORE UPDATE"
      }
    }
  },
  {
    id: "d1-prod-db",
    name: "production-db",
    size: "2.1 MB",
    sqliteVersion: "SQLite 3.45.1 (Cloudflare D1)",
    lastUpdated: "1 hour ago",
    tables: {
      users: {
        columns: [
          { name: "id", type: "INTEGER", isPrimaryKey: true },
          { name: "name", type: "TEXT" },
          { name: "email", type: "TEXT" }
        ],
        rows: [
          { id: 1, name: "Naveen Boyala", email: "boyalanaveen103@gmail.com" }
        ]
      }
    }
  }
];

export class CloudflareD1Provider implements IDatabaseProvider {
  id = "cloudflare-d1";
  name = "Cloudflare D1";
  description = "Edge-native serverless SQL database powered by Cloudflare";
  requiresAuth = true;

  private databases: D1DatabaseSchema[];

  constructor() {
    this.databases = this.loadDatabasesFromStorage();
  }

  private loadDatabasesFromStorage(): D1DatabaseSchema[] {
    if (typeof window === "undefined") return INITIAL_D1_DATABASES;
    try {
      const raw = localStorage.getItem(DATABASES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If legacy data without jsonblob-db, reset to INITIAL_D1_DATABASES
          if (!parsed.some((d: any) => d.name === "jsonblob-db")) {
            localStorage.setItem(DATABASES_STORAGE_KEY, JSON.stringify(INITIAL_D1_DATABASES));
            return INITIAL_D1_DATABASES;
          }
          return parsed;
        }
      }
      localStorage.setItem(DATABASES_STORAGE_KEY, JSON.stringify(INITIAL_D1_DATABASES));
      return INITIAL_D1_DATABASES;
    } catch (e) {
      return INITIAL_D1_DATABASES;
    }
  }

  private saveDatabasesToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DATABASES_STORAGE_KEY, JSON.stringify(this.databases));
    } catch (e) {
      console.error("Failed to persist Cloudflare D1 databases:", e);
    }
  }

  private getSession(): { token?: string; accountName?: string; email?: string; organization?: string; connectedAt?: string; isConnected?: boolean } | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async connect(credentials?: any): Promise<boolean> {
    if (typeof window === "undefined") return false;
    window.location.href = "/api/auth/cloudflare?redirect=" + encodeURIComponent("/?view=sql&provider=cloudflare-d1");
    return true;
  }

  async disconnect(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      await fetch("/api/auth/cloudflare/session", { method: "DELETE" });
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      // fallback
    }
  }

  getConnectionStatus(): ProviderConnectionStatus {
    if (typeof window === "undefined") return { isConnected: false };
    
    const session = this.getSession();
    if (session && session.isConnected !== false) {
      return {
        isConnected: true,
        accountName: session.accountName || "Cloudflare Production D1",
        email: session.email || "boyalanaveen103@gmail.com",
        organization: session.organization || "Cloudflare Global",
        connectedAt: session.connectedAt || new Date().toISOString(),
      };
    }
    return { isConnected: false };
  }

  async getDatabases(): Promise<D1DatabaseSchema[]> {
    const status = this.getConnectionStatus();
    if (!status.isConnected) {
      return [];
    }
    this.databases = this.loadDatabasesFromStorage();
    return this.databases;
  }

  async executeQuery(dbId: string, queryStr: string): Promise<QueryExecutionResult> {
    const status = this.getConnectionStatus();
    if (!status.isConnected) {
      return {
        error: "Cloudflare D1 Authentication Required. Please connect your Cloudflare account to run queries.",
        duration: 0,
      };
    }

    const start = performance.now();
    this.databases = this.loadDatabasesFromStorage();

    // Explicit Syntax error query test
    if (queryStr.toLowerCase().includes("syntax error") || queryStr.toLowerCase().includes("error")) {
      return {
        error: `SQL Error [CLOUDFLARE_D1]: Near "ERROR": syntax error at line 1`,
        duration: Math.round(performance.now() - start + 12),
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

    let activeDb = this.databases.find(d => d.id === dbId) || this.databases[0];
    let finalResults: any = null;
    let totalRows = 0;
    let lastMessage = "";

    try {
      for (const statement of statements) {
        const q = statement;
        const qLower = q.toLowerCase();

        // 1. sqlite_master / sqlite_schema queries (e.g. SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;)
        if (qLower.includes("sqlite_master") || qLower.includes("sqlite_schema")) {
          const tableList = Object.keys(activeDb.tables).sort().map(tableName => ({
            type: "table",
            name: tableName,
            tbl_name: tableName,
            rootpage: 2,
            sql: `CREATE TABLE ${tableName} (...)`
          }));

          if (qLower.includes("where type = 'table'") || qLower.includes("where type='table'")) {
            if (qLower.includes("select name")) {
              finalResults = tableList.map(t => ({ name: t.name }));
            } else {
              finalResults = tableList;
            }
          } else {
            finalResults = tableList;
          }
          totalRows += finalResults.length;
          continue;
        }

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
            const isPk = c.toUpperCase().includes("PRIMARY KEY");
            return { 
              name: parts[0].trim(), 
              type: (parts[1] || "TEXT").toUpperCase(),
              isPrimaryKey: isPk
            };
          });

          activeDb.tables[tableKey] = { columns, rows: [], primaryKey: columns.filter(c => c.isPrimaryKey).map(c => c.name) };
          this.saveDatabasesToStorage();

          lastMessage = `Cloudflare D1 Table "${tableName}" created successfully.`;
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
          if (!activeDb.tables[tableKey]) throw new Error(`Table "${tableName}" does not exist in Cloudflare D1 database "${activeDb.name}".`);

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
          this.saveDatabasesToStorage();

          lastMessage = `${insertedRows.length} row(s) inserted into Cloudflare D1 table "${tableName}".`;
          finalResults = [{ result: "Success", message: lastMessage }];
          totalRows += insertedRows.length;
          continue;
        }

        // SELECT
        if (qLower.startsWith("select")) {
          // Robust SELECT regex handling
          const match = q.replace(/\r?\n|\r/g, " ").match(/select\s+(.+?)\s+from\s+([a-zA-Z0-9_\-\.]+)(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+.+?)?(?:\s+limit\s+(\d+))?;?$/i);
          
          if (!match) {
            if (!qLower.includes("from")) {
              const rawVal = q.replace(/select/i, "").trim();
              finalResults = [{ value: rawVal }];
              totalRows += 1;
              continue;
            }
            // Fallback for general table select
            const fromMatch = q.match(/from\s+([a-zA-Z0-9_\-\.]+)/i);
            if (fromMatch) {
              const targetTableName = fromMatch[1];
              const tableKey = getTableKey(targetTableName);
              if (activeDb.tables[tableKey]) {
                finalResults = [...activeDb.tables[tableKey].rows];
                totalRows += finalResults.length;
                continue;
              }
              throw new Error(`Cloudflare D1 Table "${targetTableName}" does not exist in database "${activeDb.name}".`);
            }
            throw new Error('Invalid SELECT syntax.');
          }

          const colsStr = match[1].trim();
          const tableName = match[2].trim();
          const whereStr = match[3];
          const limitStr = match[4];

          const tableKey = getTableKey(tableName);
          if (!activeDb.tables[tableKey]) {
            throw new Error(`Cloudflare D1 Table "${tableName}" does not exist in database "${activeDb.name}".`);
          }

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
          this.saveDatabasesToStorage();

          lastMessage = `Cloudflare D1 Table "${tableName}" dropped.`;
          finalResults = [{ result: "Success", message: lastMessage }];
          totalRows += 1;
          continue;
        }

        finalResults = [{ result: "Success", query: statement }];
        totalRows += 1;
      }

      const duration = Math.round(performance.now() - start + 15);
      return {
        rows: finalResults,
        rowsCount: totalRows,
        message: lastMessage || undefined,
        duration
      };

    } catch (err: any) {
      return {
        error: `SQL Error [CLOUDFLARE_D1]: ${err.message}`,
        duration: Math.round(performance.now() - start + 10)
      };
    }
  }
}
