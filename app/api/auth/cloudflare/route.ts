import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectUrl = searchParams.get("redirect") || "/?view=sql&provider=cloudflare-d1";
  const prompt = searchParams.get("prompt") || "login";

  // Encode state using btoa (safe in both Node and Edge)
  const statePayload = JSON.stringify({ redirectUrl, timestamp: Date.now() });
  const state = btoa(statePayload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  // Use the env variable so it matches exactly what Cloudflare has registered
  const redirectUri =
    process.env.CLOUDFLARE_REDIRECT_URI ||
    `${origin}/api/auth/cloudflare/callback`;

  const clientId = process.env.CLOUDFLARE_CLIENT_ID;

  if (!clientId) {
    console.error("[CF OAuth] CLOUDFLARE_CLIENT_ID is not set");
    return NextResponse.redirect(
      new URL("/auth?provider=cloudflare-d1&error=oauth_config&reason=missing_client_id", origin)
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "account:read d1:read d1:write",
    state,
    prompt,
  });

  const authUrl = `https://dash.cloudflare.com/oauth2/authorize?${params.toString()}`;
  console.log("[CF OAuth] Redirecting to:", authUrl);

  return NextResponse.redirect(authUrl);
}
