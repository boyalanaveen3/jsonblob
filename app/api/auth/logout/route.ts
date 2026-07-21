import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("userId");
    cookieStore.delete("userName");
  } catch (err) {
    console.error("Error deleting cookies in API route:", err);
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  // Explicitly append Set-Cookie headers to clear session cookies on Edge runtime
  response.cookies.set("userId", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
  });
  
  response.cookies.set("userName", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
