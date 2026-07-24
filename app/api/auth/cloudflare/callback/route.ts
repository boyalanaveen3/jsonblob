import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cloudflareService } from "@/lib/services/cloudflare.service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  let redirectPath = "/?view=sql&provider=cloudflare-d1";

  // Decode state (base64url)
  if (stateRaw) {
    try {
      const padded = stateRaw.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(padded));
      if (decoded.redirectUrl) redirectPath = decoded.redirectUrl;
    } catch (e) {
      // fallback to default
    }
  }

  if (!code) {
    const reason = encodeURIComponent(errorDesc || errorParam || "no_code");
    return NextResponse.redirect(
      new URL(`/auth?provider=cloudflare-d1&error=oauth_cancelled&reason=${reason}`, origin)
    );
  }

  const clientId = process.env.CLOUDFLARE_CLIENT_ID;
  const clientSecret = process.env.CLOUDFLARE_CLIENT_SECRET;

  // Use the registered redirect URI from env (must match exactly what Cloudflare has)
  const redirectUri =
    process.env.CLOUDFLARE_REDIRECT_URI ||
    `${origin}/api/auth/cloudflare/callback`;

  if (!clientId || !clientSecret) {
    console.error("[CF Callback] Missing client credentials");
    return NextResponse.redirect(
      new URL("/auth?provider=cloudflare-d1&error=oauth_config&reason=missing_credentials", origin)
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://dash.cloudflare.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    console.log("[CF Callback] Token exchange status:", tokenRes.status);

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[CF Callback] Token exchange failed:", tokenRes.status, errBody);
      return NextResponse.redirect(
        new URL(`/auth?provider=cloudflare-d1&error=oauth_failed&reason=token_${tokenRes.status}`, origin)
      );
    }

    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[CF Callback] No access_token in response:", tokenData);
      return NextResponse.redirect(
        new URL("/auth?provider=cloudflare-d1&error=oauth_failed&reason=no_token", origin)
      );
    }

    // Fetch accounts linked to this token
    let accounts: any[] = [];
    try {
      accounts = await cloudflareService.getAccounts(accessToken);
    } catch (e) {
      console.warn("[CF Callback] Could not fetch accounts:", e);
    }

    // Fetch D1 databases for every account
    const accountsWithDbs = await Promise.all(
      (accounts || []).map(async (acc: any) => {
        try {
          const dbs = await cloudflareService.getD1Databases(acc.id, accessToken);
          return { id: acc.id, name: acc.name, databases: dbs || [] };
        } catch {
          return { id: acc.id, name: acc.name, databases: [] };
        }
      })
    );

    const cookieStore = await cookies();

    // Store access token (httpOnly)
    cookieStore.set("cf_d1_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Store session info (httpOnly) — no sensitive token, just metadata
    const sessionPayload = {
      isConnected: true,
      accounts: accountsWithDbs,
      connectedAt: new Date().toISOString(),
    };

    cookieStore.set("cf_d1_oauth_session", JSON.stringify(sessionPayload), {
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
    console.error("[CF Callback] Unexpected error:", err);
    return NextResponse.redirect(
      new URL("/auth?provider=cloudflare-d1&error=oauth_failed&reason=unexpected", origin)
    );
  }
}
