"use server";


import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

// Pure JS / Web Crypto SHA-256 helper compatible with both Node and Edge
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signUpAction(name: string, email: string, password: string) {
  try {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: "All fields are required" };
    }

    const db = await getDb();
    
    // Check if user already exists
    const existingRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .all();
    
    if (existingRows.length > 0) {
      return { success: false, error: "Email is already registered" };
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    const newUser = {
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    };

    await db.insert(users).values(newUser).run();

    const cookieStore = await cookies();
    cookieStore.set("userId", newUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    cookieStore.set("userName", newUser.name, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    };
  } catch (error: any) {
    console.error("SignUp error:", error);
    return { success: false, error: error.message || "Failed to register account" };
  }
}

export async function signInAction(email: string, password: string) {
  try {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: "Email and password are required" };
    }

    const db = await getDb();
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .all();

    const userRecord = userRows[0];
    if (!userRecord) {
      return { success: false, error: "Invalid email or password" };
    }

    const hashedPassword = await hashPassword(password);
    if (userRecord.password !== hashedPassword) {
      return { success: false, error: "Invalid email or password" };
    }

    const cookieStore = await cookies();
    cookieStore.set("userId", userRecord.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    cookieStore.set("userName", userRecord.name, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return {
      success: true,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
      },
    };
  } catch (error: any) {
    console.error("SignIn error:", error);
    return { success: false, error: error.message || "Failed to sign in" };
  }
}

export async function signOutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("userId", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    cookieStore.set("userName", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return { success: true };
  } catch (error: any) {
    console.error("SignOut error:", error);
    return { success: false, error: error.message || "Failed to sign out" };
  }
}
