export const runtime = "edge";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequestContext } from "@cloudflare/next-on-pages";

function getEnv(key: string): string {
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as Record<string, unknown>;
    if (env && typeof env[key] === "string" && env[key]) return env[key] as string;
  } catch (e) {}
  if (process.env[key]) return process.env[key] as string;
  return "";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectUrl = searchParams.get("redirect") || "/?view=sql&provider=cloudflare-d1";

  // Encode state using btoa (safe in both Node and Edge)
  const statePayload = JSON.stringify({ redirectUrl, timestamp: Date.now() });
  const state = btoa(statePayload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  // Always use the request origin to match the callback route
  const redirectUri = `${origin}/api/auth/cloudflare/callback`;

  const clientId = getEnv("CLOUDFLARE_CLIENT_ID");

  if (!clientId) {
    console.error("[CF OAuth] CLOUDFLARE_CLIENT_ID is not set");
    return NextResponse.redirect(
      new URL("/auth?provider=cloudflare-d1&error=oauth_config&reason=missing_client_id", origin)
    );
  }

  const scope = getEnv("CLOUDFLARE_OAUTH_SCOPE") || "";
  const prompt = searchParams.get("prompt") || "";

  const paramsObj: Record<string, string> = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  };

  // Forward prompt=select_account so the user can pick a different Cloudflare account
  if (prompt) {
    paramsObj["prompt"] = prompt;
  }

  // Convert plus-encoded spaces (+) to percent-encoded spaces (%20) required by Cloudflare OAuth
  const queryString = new URLSearchParams(paramsObj).toString().replace(/\+/g, "%20");

  const authUrl = `https://dash.cloudflare.com/oauth2/authorize?${queryString}`;
  console.log("[CF OAuth] Redirecting to:", authUrl);

  return NextResponse.redirect(authUrl);
}

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    const { apiToken, accountId } = body;

    if (!apiToken) {
      return NextResponse.json({ success: false, error: "API token is required" }, { status: 400 });
    }

    const cookieStore = await cookies();

    try {
      // Dynamically import cloudflareService (edge-safe)
      const { cloudflareService } = await import("@/lib/services/cloudflare.service");

      // Fetch real accounts from Cloudflare API
      let rawAccounts: any[] = [];
      try {
        rawAccounts = await cloudflareService.getAccounts(apiToken);
      } catch (e) {
        console.warn("[CF POST] Could not fetch accounts:", e);
      }

      // If a specific accountId was given, filter to just that one
      if (accountId && rawAccounts.length > 0) {
        rawAccounts = rawAccounts.filter((a: any) => a.id === accountId);
      }

      // Fallback if no accounts found
      if (rawAccounts.length === 0 && accountId) {
        rawAccounts = [{ id: accountId, name: `Cloudflare Account (${accountId.slice(0, 8)}...)` }];
      } else if (rawAccounts.length === 0) {
        return NextResponse.json(
          { success: false, error: "Could not fetch accounts. Check your API token has the correct permissions." },
          { status: 401 }
        );
      }

      // Fetch D1 databases for each account in parallel
      const accounts = await Promise.all(
        rawAccounts.map(async (acc: any) => {
          const dbs = await cloudflareService.getD1Databases(acc.id, apiToken).catch(() => []);
          return { id: acc.id, name: acc.name, databases: dbs || [] };
        })
      );

      // Build token map (one token per account + default)
      const tokenMap: Record<string, string> = { _default: apiToken };
      accounts.forEach((acc: any) => { tokenMap[acc.id] = apiToken; });

      // Store token inside session too — reliable fallback for edge runtime
      const sessionData = {
        isConnected: true,
        accounts,
        connectedAt: new Date().toISOString(),
        _tok: apiToken,
      };

      const cookieOpts = {
        httpOnly: true,
        secure: true,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      };

      // Use response.cookies.set() — works reliably in Cloudflare edge runtime
      const response = NextResponse.json({ success: true, session: { ...sessionData, _tok: undefined } });
      response.cookies.set("cf_d1_oauth_session", JSON.stringify(sessionData), cookieOpts);
      response.cookies.set("cf_d1_access_token", JSON.stringify(tokenMap), cookieOpts);
      return response;
    } catch (e: any) {
      console.error("[CF POST] Error:", e);
      return NextResponse.json({ success: false, error: e.message || "Failed to connect" }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to save connection" }, { status: 500 });
  }
}