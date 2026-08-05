import { IDatabaseProvider, D1DatabaseSchema, QueryExecutionResult, ProviderConnectionStatus } from "../types";

export class CloudflareD1Provider implements IDatabaseProvider {
  id = "cloudflare-d1";
  name = "Cloudflare D1";
  description = "Edge-native serverless SQL database powered by Cloudflare";
  requiresAuth = true;

  async connect(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    window.location.href = "/api/auth/cloudflare?redirect=" + encodeURIComponent("/?view=sql&provider=cloudflare-d1");
    return true;
  }

  async disconnect(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      await fetch("/api/auth/cloudflare/session", { method: "DELETE" });
    } catch (e) {}
    localStorage.removeItem("cloudflare_d1_session");
    localStorage.removeItem("cf_all_accounts");
    localStorage.removeItem("cf_active_acc_id");
    localStorage.removeItem("active_sql_provider_id");
  }

  getConnectionStatus(): ProviderConnectionStatus {
    if (typeof window === "undefined") return { isConnected: false };

    // Check localStorage session set after OAuth
    try {
      const raw = localStorage.getItem("cloudflare_d1_session");
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.isConnected) {
          return {
            isConnected: true,
            accountName: session.accountName || "Cloudflare Account",
            email: session.email || "",
            organization: session.organization || "Cloudflare",
            connectedAt: session.connectedAt || new Date().toISOString(),
          };
        }
      }
    } catch (e) {}

    // Fallback: cf_all_accounts set by SqlEditorView session fetch
    try {
      const raw = localStorage.getItem("cf_all_accounts");
      if (raw) {
        const accounts = JSON.parse(raw);
        if (Array.isArray(accounts) && accounts.length > 0) {
          const activeAccId = localStorage.getItem("cf_active_acc_id");
          const acc = accounts.find((a: any) => a.id === activeAccId) || accounts[0];
          return {
            isConnected: true,
            accountName: acc.name || "Cloudflare Account",
            email: "",
            organization: "Cloudflare",
            connectedAt: new Date().toISOString(),
          };
        }
      }
    } catch (e) {}

    return { isConnected: false };
  }

  async getDatabases(): Promise<D1DatabaseSchema[]> {
    if (typeof window === "undefined") return [];

    try {
      // Always fetch fresh from session API — do NOT rely on localStorage for auth check
      const res = await fetch("/api/auth/cloudflare/session");
      if (!res.ok) return [];

      const data: any = await res.json();
      if (!data.isConnected || !Array.isArray(data.accounts) || data.accounts.length === 0) return [];

      // Persist accounts to localStorage for other parts of the app
      localStorage.setItem("cf_all_accounts", JSON.stringify(data.accounts));

      const activeAccId = localStorage.getItem("cf_active_acc_id");
      const activeAcc = data.accounts.find((a: any) => a.id === activeAccId) || data.accounts[0];
      let accountDatabases = Array.isArray(activeAcc?.databases) ? [...activeAcc.databases] : [];

      // Merge custom/user-added databases from localStorage
      try {
        const customDbsRaw = localStorage.getItem("cf_custom_d1_databases");
        if (customDbsRaw) {
          const customDbs = JSON.parse(customDbsRaw);
          if (Array.isArray(customDbs)) {
            customDbs.forEach((cdb: any) => {
              if (!accountDatabases.some((d: any) => (d.uuid || d.id) === (cdb.uuid || cdb.id) || d.name === cdb.name)) {
                accountDatabases.push(cdb);
              }
            });
          }
        }
      } catch (e) {}

      if (accountDatabases.length === 0) {
        accountDatabases = [
          { uuid: "1ad3573e-3f03-4906-8599-0b66d06cdc0f", name: "D1 Database" }
        ];
      }

      // Fetch real schema for each database
      const dbs: D1DatabaseSchema[] = await Promise.all(
        accountDatabases.map(async (db: any) => {
          const dbId = db.uuid || db.id;
          const tables: D1DatabaseSchema["tables"] = {};

          try {
            // Get table list
            const tableRes = await fetch("/api/sql/query", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accountId: activeAcc.id,
                databaseId: dbId,
                sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
              }),
            });
            const tableData: any = await tableRes.json().catch(() => ({}));

            if (tableRes.ok && tableData.success && Array.isArray(tableData.results)) {
              if (tableData.results.length === 0) {
                // Database has no user tables — mark clearly
                tables["__empty__"] = { columns: [], rows: [], _hint: "No tables found in this database." } as any;
              }
              await Promise.all(
                tableData.results.map(async (row: any) => {
                  const tableName: string = row.name;
                  try {
                    const colRes = await fetch("/api/sql/query", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        accountId: activeAcc.id,
                        databaseId: dbId,
                        sql: `SELECT * FROM pragma_table_info('${tableName}');`,
                      }),
                    });
                    const colData: any = await colRes.json().catch(() => ({}));
                    tables[tableName] = {
                      columns: (colRes.ok && colData.success && Array.isArray(colData.results))
                        ? colData.results.map((c: any) => ({
                            name: c.name,
                            type: c.type || "TEXT",
                            isPrimaryKey: c.pk === 1,
                          }))
                        : [],
                      rows: [],
                    };
                  } catch {
                    tables[tableName] = { columns: [], rows: [] };
                  }
                })
              );
            } else {
              // Query failed — store the error so it's visible in the UI
              const errMsg = tableData.error || `HTTP ${tableRes.status}: Failed to fetch tables`;
              console.error(`[D1 Schema] ${db.name} (${dbId}):`, errMsg);
              tables["⚠ Error loading tables"] = {
                columns: [{ name: errMsg, type: "ERROR", isPrimaryKey: false }],
                rows: [],
              } as any;
            }
          } catch (err: any) {
            console.error(`[D1 Schema] Exception for ${db.name}:`, err);
            tables["⚠ Error loading tables"] = {
              columns: [{ name: err?.message || "Unknown error", type: "ERROR", isPrimaryKey: false }],
              rows: [],
            } as any;
          }

          return {
            id: dbId,
            name: db.name,
            size: "Cloudflare D1",
            sqliteVersion: "SQLite 3.45.1 (Cloudflare D1)",
            lastUpdated: db.created_at ? new Date(db.created_at).toLocaleDateString() : "Active",
            tables,
          };
        })
      );

      return dbs;
    } catch (e) {
      return [];
    }
  }

  async executeQuery(dbId: string, queryStr: string): Promise<QueryExecutionResult> {
    const status = this.getConnectionStatus();
    if (!status.isConnected) {
      return { error: "Not authenticated. Please connect your Cloudflare account.", duration: 0 };
    }

    const start = performance.now();

    try {
      // Find which account owns this dbId
      let accountId = localStorage.getItem("cf_active_acc_id");
      try {
        const raw = localStorage.getItem("cf_all_accounts");
        if (raw) {
          const accounts = JSON.parse(raw);
          const owner = accounts.find((a: any) =>
            Array.isArray(a.databases) && a.databases.some((d: any) => (d.uuid || d.id) === dbId)
          );
          if (owner) accountId = owner.id;
        }
      } catch (e) {}

      const res = await fetch("/api/sql/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, databaseId: dbId, sql: queryStr }),
      });

      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.results)) {
        return {
          rows: data.results,
          rowsCount: data.results.length,
          duration: data.meta?.duration || Math.round(performance.now() - start),
        };
      }

      return {
        error: data.error ? `SQL Error: ${data.error}` : `HTTP ${res.status}: Query failed`,
        duration: Math.round(performance.now() - start),
      };
    } catch (err: any) {
      return {
        error: `Network Error: ${err.message}`,
        duration: Math.round(performance.now() - start),
      };
    }
  }
}
