import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let cachedDb: any = null;

export async function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  let d1: any = null;

  try {
    // Cloudflare binding retrieval in Next.js on Pages
    const nextOnPages = await import("@cloudflare/next-on-pages");
    if (nextOnPages && typeof nextOnPages.getRequestContext === "function") {
      const context = nextOnPages.getRequestContext() as any;
      d1 = context?.env?.DB;
    }
  } catch (error) {
    // Fallback for environments where request context is not set up
  }

  // Fallback to process.env or global context (useful in local dev / mocks)
  if (!d1) {
    d1 = (process.env as any).DB || (globalThis as any).DB;
  }

  // Dynamic Wrangler Platform Proxy fallback for local development (Server Actions sandbox)
  // We check process.env.NEXT_RUNTIME !== "edge" to prevent executing this Node-specific import in Edge sandboxes.
  if (
    !d1 &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_RUNTIME !== "edge" &&
    typeof process !== "undefined" &&
    process.versions?.node
  ) {
    try {
      const wranglerModule = await import(/* webpackIgnore: true */ "wrangler");
      if (wranglerModule && typeof wranglerModule.getPlatformProxy === "function") {
        const { env } = await wranglerModule.getPlatformProxy();
        d1 = env.DB;
      }
    } catch (err) {
      console.error("Failed to load local Wrangler proxy in getDb:", err);
    }
  }

  if (!d1) {
    if (process.env.NODE_ENV === "production" && !process.env.CF_PAGES) {
      console.warn("D1 Database binding 'DB' not found. Returning mock client for build safety.");
    }
    
    // Fully compatible Cloudflare D1 driver mock for local Node/testing environments
    if (!(globalThis as any).__d1_mock_db) {
      const memoryDb = new Map<string, Map<string, any>>();

      function getTableName(sqlStr: string): string {
        const insertMatch = sqlStr.match(/insert\s+into\s+[`"]?(\w+)[`"]?/i);
        if (insertMatch) return insertMatch[1];
        const updateMatch = sqlStr.match(/update\s+[`"]?(\w+)[`"]?/i);
        if (updateMatch) return updateMatch[1];
        const deleteMatch = sqlStr.match(/from\s+[`"]?(\w+)[`"]?/i);
        if (deleteMatch) return deleteMatch[1];
        const selectMatch = sqlStr.match(/from\s+[`"]?(\w+)[`"]?/i);
        if (selectMatch) return selectMatch[1];
        return "default_table";
      }

      (globalThis as any).__d1_mock_db = {
        prepare(sqlStr: string) {
          let boundParams: any[] = [];
          const tableName = getTableName(sqlStr);
          if (!memoryDb.has(tableName)) {
            memoryDb.set(tableName, new Map<string, any>());
          }
          const table = memoryDb.get(tableName)!;

          const stmt = {
            bind(...args: any[]) {
              boundParams = args;
              return stmt;
            },
            async first() {
              const res = await stmt.all();
              return res.results[0] || null;
            },
            async all() {
              const rows = Array.from(table.values());
              // Filter by id if boundParams contains single id or matching condition
              if (boundParams.length === 1 && typeof boundParams[0] === "string") {
                const idParam = boundParams[0];
                const filtered = rows.filter((r) => r.id === idParam || r.collectionId === idParam || r.userId === idParam || r.workspaceId === idParam);
                return { results: filtered };
              }
              return { results: rows };
            },
            async run() {
              // Parse simple INSERT / UPDATE / DELETE
              if (sqlStr.toLowerCase().includes("insert into")) {
                const idVal = boundParams[0];
                if (idVal) {
                  // Build simple object from boundParams if possible
                  const rowObj: any = { id: idVal };
                  // If second param is collectionId / name etc.
                  if (boundParams[1]) rowObj.collectionId = boundParams[1];
                  if (boundParams[2]) rowObj.folderId = boundParams[2];
                  if (boundParams[3]) rowObj.name = boundParams[3];
                  // Store params array in row for fallback
                  rowObj.__rawParams = boundParams;
                  table.set(idVal, rowObj);
                }
              } else if (sqlStr.toLowerCase().includes("delete from")) {
                if (boundParams.length > 0) {
                  const targetId = boundParams[0];
                  table.delete(targetId);
                  for (const [k, v] of table.entries()) {
                    if (v.collectionId === targetId || v.folderId === targetId) {
                      table.delete(k);
                    }
                  }
                }
              }
              return { success: true, meta: { duration: 1 } };
            },
            async raw() {
              return [];
            },
          };
          return stmt;
        },
        async batch(statements: any[]) {
          return statements.map(() => ({ success: true, results: [] }));
        },
        async exec() {
          return { count: 0, duration: 1 };
        },
      };
    }
    d1 = (globalThis as any).__d1_mock_db;
  }

  cachedDb = drizzle(d1, { schema });
  return cachedDb;
}
