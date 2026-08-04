export const runtime = 'edge';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cloudflareService } from "@/lib/services/cloudflare.service";
import { getRequestContext } from "@cloudflare/next-on-pages";

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    const { accountId, databaseId, sql } = body;

    if (!sql || !sql.trim()) {
      return NextResponse.json(
        { success: false, error: "SQL query string is required" },
        { status: 400 }
      );
    }

    // 1. Check if token is available for Cloudflare REST API query
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("cf_d1_access_token");

    let token = tokenCookie?.value || "";
    try {
      if (tokenCookie?.value) {
        const parsedMap = JSON.parse(tokenCookie.value);
        if (typeof parsedMap === "object" && parsedMap !== null) {
          token = (accountId && parsedMap[accountId]) || parsedMap["_default"] || Object.values(parsedMap)[0] || "";
        }
      }
    } catch (e) {}

    // Check if databaseId targets the bound Pages D1 DB (e.g. netblob or default)
    const isMainBoundDb = !databaseId || databaseId === "default" || databaseId === "1ad3573e-3f03-4906-8599-0b66d06cdc0f" || databaseId === "netblob-d1-db-001";

    try {
      const ctx = getRequestContext();
      const env = ctx?.env as Record<string, any>;
      const boundDb = env?.DB;

      if (isMainBoundDb && boundDb && typeof boundDb.prepare === "function") {
        console.log("[SQL Query] Executing query via bound D1 database (env.DB)");
        const stmt = boundDb.prepare(sql);
        const result = await stmt.all();
        return NextResponse.json({
          success: true,
          results: result.results || [],
          meta: result.meta || { duration: 5, rows_read: result.results?.length || 0, rows_written: 0 },
        });
      }
    } catch (e) {
      console.warn("[SQL Query] Bound D1 query error:", e);
    }

    // 2. Query target external D1 Database via Cloudflare REST API
    if (token && accountId && databaseId) {
      const response = await cloudflareService.executeQuery(accountId, databaseId, sql, token);

      if (response.success && response.results) {
        return NextResponse.json({
          success: true,
          results: response.results[0]?.results || [],
          meta: response.results[0]?.meta || { duration: 12 },
        });
      } else if (response.errors && response.errors.length > 0) {
        return NextResponse.json(
          { success: false, error: response.errors[0].message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Could not query database "${databaseId}". Please ensure a valid Cloudflare API Token or OAuth Session is connected for account "${accountId}".`
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute SQL query" },
      { status: 500 }
    );
  }
}
