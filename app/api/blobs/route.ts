import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { blobs, type Blob } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const list = await db
      .select()
      .from(blobs)
      .where(eq(blobs.userId, userId))
      .all();
    
    // Sort in code by updatedAt descending
    list.sort((a: Blob, b: Blob) => b.updatedAt.localeCompare(a.updatedAt));
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("API GET /api/blobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch blobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body as { title: string; content: string };

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    try {
      JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Content must be valid JSON" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newBlob = {
      id,
      title: title.trim(),
      content,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(blobs).values(newBlob).run();
    return NextResponse.json(newBlob, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/blobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create blob" },
      { status: 500 }
    );
  }
}
