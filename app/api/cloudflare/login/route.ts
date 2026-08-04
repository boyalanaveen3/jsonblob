export const runtime = 'edge';

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectUrl = searchParams.get("redirect") || "/?view=sql&provider=cloudflare-d1";
  const statePayload = JSON.stringify({ redirectUrl, timestamp: Date.now() });
  const state = btoa(statePayload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const redirectUri = process.env.CLOUDFLARE_REDIRECT_URI || `${origin}/api/cloudflare/callback`;
  const clientId = process.env.CLOUDFLARE_CLIENT_ID;
  const isCustomClient = clientId && clientId.trim().length > 0 && clientId !== "54d1154d-3b4e-4860-93cb-66b9d62f6b86";

  if (isCustomClient) {
    const authUrl = `https://dash.cloudflare.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    return NextResponse.redirect(authUrl);
  }

  const callback = new URL("/api/cloudflare/callback", request.url);
  callback.searchParams.set("code", `cf_code_${Date.now()}`);
  callback.searchParams.set("state", state);

  return NextResponse.redirect(callback);
}
