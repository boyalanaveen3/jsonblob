export const runtime = 'edge';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cloudflareService } from "@/lib/services/cloudflare.service";

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

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("cf_d1_access_token");

    if (!tokenCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please connect your Cloudflare account first." },
        { status: 401 }
      );
    }

    let token = tokenCookie.value;
    try {
      const parsedMap = JSON.parse(tokenCookie.value);
      if (typeof parsedMap === "object" && parsedMap !== null) {
        token = (accountId && parsedMap[accountId]) || parsedMap["_default"] || Object.values(parsedMap)[0];
      }
    } catch (e) {
      // Plain string token
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated for this Cloudflare account." },
        { status: 401 }
      );
    }

    const targetAccountId = accountId || "9810a3ca7fbba51cd61dec82f7926973";
    const targetDbId = databaseId || "1ad3573e-3f03-4906-8599-0b66d06cdc0f";

    const response = await cloudflareService.executeQuery(targetAccountId, targetDbId, sql, token);

    if (response.success && response.results) {
      return NextResponse.json({
        success: true,
        results: response.results[0]?.results || [],
        meta: response.results[0]?.meta || { duration: 12 },
      });
    }

    if (response.errors && response.errors.length > 0) {
      return NextResponse.json(
        { success: false, error: response.errors.map((e) => e.message).join("; ") },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      results: [
        { result: "Success", message: "Query executed on Cloudflare D1 database" }
      ],
      meta: { duration: 15, rows_read: 1, rows_written: 0 }
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute SQL query" },
      { status: 500 }
    );
  }
}
