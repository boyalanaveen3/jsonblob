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
    const { apiToken, accountId, databaseId, databaseName } = body;

    const cookieStore = await cookies();
    const existingSessionCookie = cookieStore.get("cf_d1_oauth_session");
    let existingSession: any = null;
    try {
      if (existingSessionCookie?.value) {
        existingSession = JSON.parse(existingSessionCookie.value);
      }
    } catch (e) {}

    const token = apiToken || `token_${Date.now()}`;
    const accId = accountId || "a16eafc27dc801faf18eefe371127022";
    const dbId = databaseId || "1e69a13a-8722-448d-92d9-55def2014960";
    const dbName = databaseName || "Cloudflare D1 Database";

    let accounts = Array.isArray(existingSession?.accounts) ? existingSession.accounts : [];
    let accIndex = accounts.findIndex((a: any) => a.id === accId);
    if (accIndex === -1) {
      accounts.push({
        id: accId,
        name: `Cloudflare Account (${accId.slice(0, 8)}...)`,
        databases: [{ uuid: dbId, name: dbName, created_at: new Date().toISOString() }],
      });
    } else {
      let dbs = accounts[accIndex].databases || [];
      if (!dbs.some((d: any) => (d.uuid || d.id) === dbId)) {
        dbs.push({ uuid: dbId, name: dbName, created_at: new Date().toISOString() });
      }
      accounts[accIndex].databases = dbs;
    }

    const sessionData = {
      isConnected: true,
      accounts,
      connectedAt: new Date().toISOString(),
    };

    cookieStore.set("cf_d1_oauth_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    const existingTokenCookie = cookieStore.get("cf_d1_access_token");
    let tokenMap: Record<string, string> = {};
    try {
      if (existingTokenCookie?.value) {
        tokenMap = JSON.parse(existingTokenCookie.value);
      }
    } catch (e) {}

    if (apiToken) {
      tokenMap[accId] = apiToken;
      tokenMap["_default"] = apiToken;
    } else {
      tokenMap[accId] = tokenMap[accId] || token;
      tokenMap["_default"] = tokenMap["_default"] || token;
    }

    cookieStore.set("cf_d1_access_token", JSON.stringify(tokenMap), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true, session: sessionData });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to save connection" }, { status: 500 });
  }
}