export const runtime = 'edge';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cloudflareService } from "@/lib/services/cloudflare.service";
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
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_cancelled", origin));
  }

  const clientId = getEnv("CLOUDFLARE_CLIENT_ID");
  const clientSecret = getEnv("CLOUDFLARE_CLIENT_SECRET");
  // This fallback route is at /api/cloudflare/callback — try both URIs
  const redirectUriEnv = getEnv("CLOUDFLARE_REDIRECT_URI");
  const redirectUriFallback = `${origin}/api/cloudflare/callback`;
  const redirectUriMain = `${origin}/api/auth/cloudflare/callback`;

  const endpoint = "https://dash.cloudflare.com/oauth2/token";

  let accessToken: string | null = null;

  // Try all redirect URI + auth method combinations
  const urisToTry = [redirectUriEnv, redirectUriMain, redirectUriFallback].filter(Boolean);
  for (const uri of urisToTry) {
    if (accessToken) break;
    // client_secret_post
    const r1 = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: uri }),
    });
    if (r1.ok) {
      const d: any = await r1.json();
      if (d.access_token) { accessToken = d.access_token; break; }
    }
    // client_secret_basic
    const r2 = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: uri }),
    });
    if (r2.ok) {
      const d: any = await r2.json();
      if (d.access_token) { accessToken = d.access_token; break; }
    }
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_failed&reason=token_exchange_failed", origin));
  }

  // Fetch real accounts + databases
  let accounts: any[] = [];
  try {
    const rawAccounts = await cloudflareService.getAccounts(accessToken);
    accounts = await Promise.all(
      rawAccounts.map(async (acc: any) => {
        const dbs = await cloudflareService.getD1Databases(acc.id, accessToken!).catch(() => []);
        return { id: acc.id, name: acc.name, databases: dbs };
      })
    );
  } catch (e) {}

  const tokenMap: Record<string, string> = { _default: accessToken };
  accounts.forEach((acc: any) => { if (acc.id) tokenMap[acc.id] = accessToken!; });

  const cookieStore = await cookies();
  cookieStore.set("cf_d1_access_token", JSON.stringify(tokenMap), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  cookieStore.set("cf_d1_oauth_session", JSON.stringify({ isConnected: true, accounts, connectedAt: new Date().toISOString() }), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });

  const finalUrl = new URL("/?view=sql&provider=cloudflare-d1", origin);
  finalUrl.searchParams.set("oauth", "success");
  return NextResponse.redirect(finalUrl);
}
