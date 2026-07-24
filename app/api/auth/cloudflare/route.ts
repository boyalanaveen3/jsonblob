export const runtime = 'edge';

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectUrl = searchParams.get("redirect") || "/?view=sql&provider=cloudflare-d1";
  const state = Buffer.from(JSON.stringify({ redirectUrl, timestamp: Date.now() })).toString("base64url");

  const callbackUrl = process.env.CLOUDFLARE_REDIRECT_URI || `${origin}/api/auth/cloudflare/callback`;
  const clientId = process.env.CLOUDFLARE_CLIENT_ID;

  if (!clientId) {
    console.error("Cloudflare OAuth missing client id");
    return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_config", origin));
  }

  const authUrl = `https://dash.cloudflare.com/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent("account:read d1:read d1:write")}&state=${encodeURIComponent(state)}`;

  const normalizedAuthUrl = authUrl.replaceAll("+", "%20");
  if (process.env.NODE_ENV === "development") {
    console.log("[Cloudflare OAuth] auth URL:", normalizedAuthUrl);
  }
  // Redirect directly to Cloudflare login & authorization page
  return NextResponse.redirect(normalizedAuthUrl);
}
