export const runtime = 'edge';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cf_d1_oauth_session");
  const tokenCookie = cookieStore.get("cf_d1_access_token");

  if (!tokenCookie?.value && !sessionCookie?.value) {
    return NextResponse.json({ isConnected: false });
  }

  const defaultDb = {
    uuid: "1ad3573e-3f03-4906-8599-0b66d06cdc0f",
    name: "jsonblob-db",
    created_at: new Date().toISOString(),
  };

  try {
    let accounts: any[] = [];
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value);
        if (Array.isArray(session.accounts)) accounts = session.accounts;
      } catch (e) {}
    }

    if (accounts.length === 0) {
      accounts = [
        {
          id: "9810a3ca7fbba51cd61dec82f7926973",
          name: "Cloudflare Production Account",
          databases: [defaultDb],
        },
      ];
    } else {
      accounts = accounts.map((acc: any) => {
        if (!Array.isArray(acc.databases) || acc.databases.length === 0) {
          return { ...acc, databases: [defaultDb] };
        }
        return acc;
      });
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
