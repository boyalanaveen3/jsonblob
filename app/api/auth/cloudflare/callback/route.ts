export const runtime = "edge";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cloudflareService } from "@/lib/services/cloudflare.service";
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
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  // Always redirect to SQL view after Cloudflare OAuth — never trust state for redirect path
  const redirectPath = "/?view=sql&provider=cloudflare-d1";

  if (!code) {
    const reason = encodeURIComponent(errorDesc || errorParam || "no_code");
    return NextResponse.redirect(
      new URL(`/auth?provider=cloudflare-d1&error=oauth_cancelled&reason=${reason}`, origin)
    );
  }

  const clientId = getEnv("CLOUDFLARE_CLIENT_ID");
  const clientSecret = getEnv("CLOUDFLARE_CLIENT_SECRET");

  // Always use current request origin to match authorize route
  const redirectUri = `${origin}/api/auth/cloudflare/callback`;

  if (!clientId || !clientSecret) {
    console.error("[CF Callback] Missing client credentials");
    return NextResponse.redirect(
      new URL("/auth?provider=cloudflare-d1&error=oauth_config&reason=missing_credentials", origin)
    );
  }

  try {
    // Exchange authorization code for access token via dash.cloudflare.com
    const endpoint = "https://dash.cloudflare.com/oauth2/token";
    let tokenRes: Response | null = null;

    // Strategy 1: client_secret_post
    tokenRes = await fetch(endpoint, {
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

    // Strategy 2: client_secret_basic
    if (!tokenRes.ok) {
      const basicAuth = btoa(`${clientId}:${clientSecret}`);
      tokenRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
    }

    // Strategy 3: Public client
    if (!tokenRes.ok) {
      tokenRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          redirect_uri: redirectUri,
        }),
      });
    }

    if (!tokenRes || !tokenRes.ok) {
      let errorText = "token_exchange_failed";
      try {
        const errBody: any = await tokenRes?.json();
        errorText = errBody?.error_description || errBody?.error || errorText;
      } catch (e) {}
      console.error("[CF Callback] Token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL(`/auth?provider=cloudflare-d1&error=token_exchange_failed&reason=${encodeURIComponent(errorText)}`, origin)
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
    let fetchedAccounts: any[] = [];
    try {
      fetchedAccounts = await cloudflareService.getAccounts(accessToken);
    } catch (e) {
      console.warn("[CF Callback] Could not fetch accounts:", e);
    }

    // Fetch D1 databases for every fetched account
    const newAccountsWithDbs = await Promise.all(
      (fetchedAccounts || []).map(async (acc: any) => {
        try {
          const dbs = await cloudflareService.getD1Databases(acc.id, accessToken);
          return { id: acc.id, name: acc.name, databases: dbs || [] };
        } catch {
          return { id: acc.id, name: acc.name, databases: [] };
        }
      })
    );

    const cookieStore = await cookies();

    // Parse existing session and token map to enable multi-account support
    let existingAccounts: any[] = [];
    let tokenMap: Record<string, string> = {};

    const existingSessionCookie = cookieStore.get("cf_d1_oauth_session");
    if (existingSessionCookie?.value) {
      try {
        const parsed = JSON.parse(existingSessionCookie.value);
        if (Array.isArray(parsed.accounts)) {
          existingAccounts = parsed.accounts;
        }
      } catch (e) {}
    }

    const existingTokenCookie = cookieStore.get("cf_d1_access_token");
    if (existingTokenCookie?.value) {
      try {
        const parsed = JSON.parse(existingTokenCookie.value);
        if (typeof parsed === "object" && parsed !== null) {
          tokenMap = parsed;
        } else if (typeof parsed === "string") {
          tokenMap["_default"] = parsed;
        }
      } catch (e) {
        tokenMap["_default"] = existingTokenCookie.value;
      }
    }

    // Map the new access token to each fetched account ID
    newAccountsWithDbs.forEach((acc: any) => {
      if (acc.id) {
        tokenMap[acc.id] = accessToken;
      }
    });
    tokenMap["_default"] = accessToken;

    // Merge new accounts into existing accounts list without duplicates
    const mergedAccountsMap = new Map<string, any>();
    existingAccounts.forEach((acc: any) => {
      if (acc.id) mergedAccountsMap.set(acc.id, acc);
    });
    newAccountsWithDbs.forEach((acc: any) => {
      if (acc.id) mergedAccountsMap.set(acc.id, acc);
    });

    const finalAccountsList = Array.from(mergedAccountsMap.values());

    // Store token map as JSON in httpOnly cookie
    cookieStore.set("cf_d1_access_token", JSON.stringify(tokenMap), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Store session info with merged accounts (httpOnly)
    const sessionPayload = {
      isConnected: true,
      accounts: finalAccountsList,
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

