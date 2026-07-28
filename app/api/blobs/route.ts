import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { blobs, type Blob } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { saveBlobToR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value || "default-user";

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
    const userId = cookieStore.get("userId")?.value || request.headers.get("x-user-id") || "default-user";

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

    // Step 1: Upload JSON into Cloudflare R2 & Verify
    let r2Res;
    try {
      r2Res = await saveBlobToR2(id, content, userId);
    } catch (r2Err: any) {
      console.error("[R2] Upload or verification failed:", r2Err);
      return NextResponse.json(
        { error: r2Err.message || "Cloudflare R2 storage upload failed" },
        { status: 500 }
      );
    }

    // Step 2: Save Metadata in D1 (Content is stored in R2, not inside D1)
    console.log("[D1] Saving Metadata...");
    const newBlob: Blob = {
      id,
      title: title.trim(),
      content: "", // Metadata only inside D1!
      userId,
      storageKey: r2Res.storageKey,
      storageType: r2Res.storageType,
      sizeBytes: r2Res.sizeBytes,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.insert(blobs).values(newBlob).run();
      console.log("[D1] Metadata Saved");
      console.log("[API] Save Completed");
      return NextResponse.json({ ...newBlob, content }, { status: 201 });
    } catch (d1Err: any) {
      console.error("[D1] Save Metadata failed. Rolling back R2 object...", d1Err);
      // Automatic Rollback: delete uploaded object from R2 so no orphan files remain
      const { deleteBlobFromR2 } = await import("@/lib/storage/r2Storage");
      await deleteBlobFromR2(r2Res.storageKey);
      throw d1Err;
    }
  } catch (error: any) {
    console.error("API POST /api/blobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create blob" },
      { status: 500 }
    );
  }
}
