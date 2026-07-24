export const runtime = 'edge';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cloudflareService } from "@/lib/services/cloudflare.service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");

  let redirectPath = "/?view=sql&provider=cloudflare-d1";

  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf-8"));
      if (decoded.redirectUrl) redirectPath = decoded.redirectUrl;
    } catch (e) {
      // fallback
    }
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_failed", origin));
  }

  // Exchange authorization code for access token
  try {
    const clientId = process.env.CLOUDFLARE_CLIENT_ID;
    const clientSecret = process.env.CLOUDFLARE_CLIENT_SECRET;
    const callbackUrl = process.env.CLOUDFLARE_REDIRECT_URI || `${origin}/api/auth/cloudflare/callback`;

    if (!clientId || !clientSecret) {
      // Missing secrets — fail visibly to avoid silent fake auth
      console.error("Cloudflare OAuth missing client credentials");
      return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_config", origin));
    }

    const tokenRes = await fetch("https://dash.cloudflare.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: callbackUrl,
      }),
    });
    if (process.env.NODE_ENV === "development") {
      console.log("[Cloudflare OAuth] token exchange redirect_uri:", callbackUrl);
    }

    if (!tokenRes.ok) {
      console.error("Cloudflare token exchange failed", await tokenRes.text());
      return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_failed", origin));
    }

    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("Cloudflare token response missing access_token", tokenData);
      return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_failed", origin));
    }

    // Optionally verify by fetching accounts (does not expose token to client)
    const accounts = await cloudflareService.getAccounts(accessToken);

    const cookieStore = await cookies();
    // store minimal session (no raw token) and store token in httpOnly cookie
    cookieStore.set("cf_d1_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    const oauthSession = {
      isConnected: true,
      accountCount: Array.isArray(accounts) ? accounts.length : 0,
      connectedAt: new Date().toISOString(),
    };

    cookieStore.set("cf_d1_oauth_session", JSON.stringify(oauthSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    const finalUrl = new URL(redirectPath, origin);
    finalUrl.searchParams.set("provider", "cloudflare-d1");
    finalUrl.searchParams.set("oauth", "success");

    return NextResponse.redirect(finalUrl);
  } catch (err: any) {
    console.error("Cloudflare OAuth callback error:", err);
    return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_failed", origin));
  }
}
