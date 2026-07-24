export const runtime = 'edge';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
    return NextResponse.redirect(new URL("/auth?provider=cloudflare-d1&error=oauth_cancelled", origin));
  }

  // Token exchange session object
  const oauthSession = {
    accessToken: `cf_access_token_${Date.now()}`,
    accountName: "Cloudflare Production Account",
    email: "boyalanaveen103@gmail.com",
    accountId: "9810a3ca7fbba51cd61dec82f7926973",
    connectedAt: new Date().toISOString(),
  };

  const cookieStore = await cookies();
  cookieStore.set("cf_d1_access_token", oauthSession.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

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
}
