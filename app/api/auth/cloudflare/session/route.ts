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
    if (sessionCookie?.value) {
      const session = JSON.parse(sessionCookie.value);
      return NextResponse.json({
        isConnected: true,
        accounts: session.accounts || [],
        connectedAt: session.connectedAt,
      });
    }
    // Token exists but no session metadata
    return NextResponse.json({ isConnected: true, accounts: [] });
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
