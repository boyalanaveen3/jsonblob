export const runtime = "edge";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cf_d1_oauth_session");
  const tokenCookie = cookieStore.get("cf_d1_access_token");

  if (!tokenCookie?.value && !sessionCookie?.value) {
    return NextResponse.json({ isConnected: false });
  }

  try {
    let accounts: any[] = [];
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value);
        if (Array.isArray(session.accounts)) accounts = session.accounts;
      } catch (e) {}
    }

    // Fetch fresh D1 databases from Cloudflare API if databases array is empty
    if (tokenCookie?.value) {
      try {
        const { cloudflareService } = await import("@/lib/services/cloudflare.service");
        let tokenMap: Record<string, string> = {};
        try {
          tokenMap = JSON.parse(tokenCookie.value);
        } catch (e) {
          tokenMap = { _default: tokenCookie.value };
        }
        const defaultToken = tokenMap._default || tokenCookie.value;

        if (accounts.length === 0) {
          const rawAccounts = await cloudflareService.getAccounts(defaultToken).catch(() => []);
          if (rawAccounts.length > 0) {
            accounts = rawAccounts.map((acc: any) => ({ id: acc.id, name: acc.name, databases: [] }));
          } else {
            accounts = [{ id: "connected-account", name: "Connected Cloudflare Account", databases: [] }];
          }
        }

        // Fetch D1 databases for each account if missing
        accounts = await Promise.all(
          accounts.map(async (acc: any) => {
            if (Array.isArray(acc.databases) && acc.databases.length > 0) return acc;
            const token = tokenMap[acc.id] || defaultToken;
            const dbs = await cloudflareService.getD1Databases(acc.id, token).catch(() => []);
            return { ...acc, databases: dbs };
          })
        );
      } catch (e) {
        console.error("[Session] Error fetching D1 databases:", e);
      }
    }

    if (accounts.length === 0) {
      accounts = [
        {
          id: "connected-account",
          name: "Connected Cloudflare Account",
          databases: [],
        },
      ];
    }

    return NextResponse.json({
      isConnected: true,
      accounts,
      connectedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ isConnected: false });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("cf_d1_oauth_session");
  cookieStore.delete("cf_d1_access_token");
  cookieStore.delete("cf_d1_account_id");
  return NextResponse.json({ success: true });
}
