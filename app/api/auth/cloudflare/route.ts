export const runtime = 'edge';

import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

const DEFAULT_CLIENT_ID = "1cc954f25945e1e46bf4a5ac1d268cc3";
const DEFAULT_CLIENT_SECRET = "cfoc_oCGnle064bwCNvkS8anivkY4ckctuF8m0x5gE9g9ff59553c";

function getEnv(key: string): string {
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as Record<string, unknown>;
    if (env && typeof env[key] === "string" && env[key]) return env[key] as string;
  } catch (e) {}
  if (process.env[key]) return process.env[key] as string;
  if (key === "CLOUDFLARE_CLIENT_ID") return DEFAULT_CLIENT_ID;
  if (key === "CLOUDFLARE_CLIENT_SECRET") return DEFAULT_CLIENT_SECRET;
  return "";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectUrl = searchParams.get("redirect") || "/?view=sql&provider=cloudflare-d1";

  // Encode state using btoa (safe in both Node and Edge)
  const statePayload = JSON.stringify({ redirectUrl, timestamp: Date.now() });
  const state = btoa(statePayload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  // Use the env variable so it matches exactly what Cloudflare has registered
  const redirectUri =
    getEnv("CLOUDFLARE_REDIRECT_URI") ||
    `${origin}/api/auth/cloudflare/callback`;

  const clientId = getEnv("CLOUDFLARE_CLIENT_ID");

  if (!clientId) {
    console.error("[CF OAuth] CLOUDFLARE_CLIENT_ID is not set");
    return NextResponse.redirect(
      new URL("/auth?provider=cloudflare-d1&error=oauth_config&reason=missing_client_id", origin)
    );
  }

  const scope = getEnv("CLOUDFLARE_OAUTH_SCOPE") || "d1.read d1.write";

  const paramsObj: Record<string, string> = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope,
  };

  // Convert plus-encoded spaces (+) to percent-encoded spaces (%20) required by Cloudflare OAuth
  const queryString = new URLSearchParams(paramsObj).toString().replace(/\+/g, "%20");

  const authUrl = `https://dash.cloudflare.com/oauth2/authorize?${queryString}`;
  console.log("[CF OAuth] Redirecting to:", authUrl);

  return NextResponse.redirect(authUrl);
}