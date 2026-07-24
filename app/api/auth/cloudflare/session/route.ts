export const runtime = 'edge';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cloudflareService } from "@/lib/services/cloudflare.service";

export async function GET() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("cf_d1_access_token");

  if (!tokenCookie || !tokenCookie.value) {
    return NextResponse.json({ isConnected: false });
  }

  try {
    const token = tokenCookie.value;
    const accounts = await cloudflareService.getAccounts(token);

    // For convenience fetch D1 databases for first account (non-sensitive)
    const accountData = Array.isArray(accounts) && accounts.length > 0 ? await Promise.all(accounts.map(async (a: any) => {
      const dbs = await cloudflareService.getD1Databases(a.id, token);
      return { id: a.id, name: a.name, databases: dbs };
    })) : [];

    return NextResponse.json({ isConnected: true, accounts: accountData });
  } catch (e: any) {
    console.error("Session check failed:", e);
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
