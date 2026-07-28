import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blobs } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { saveBlobToR2, getBlobContent, deleteBlobFromR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log("[D1] Reading Metadata");
    const db = await getDb();
    const blob = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];

    if (!blob) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    if (blob.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[R2] Download Started");
    const fullContent = await getBlobContent(blob.storageType, blob.storageKey, blob.content);
    console.log("[R2] Download Success");
    return NextResponse.json({ ...blob, content: fullContent });
  } catch (error: any) {
    console.error(`API GET /api/blobs error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch blob" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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

    // Verify ownership first
    const existing = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    if (!existing) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Step 1: Upload new version to R2 & Verify
    console.log("[R2] Upload Started");
    let r2Res;
    try {
      r2Res = await saveBlobToR2(id, content, userId);
    } catch (r2Err: any) {
      console.error("[R2] Upload or verification failed:", r2Err);
      return NextResponse.json(
        { error: r2Err.message || "Cloudflare R2 update failed" },
        { status: 500 }
      );
    }

    // Step 2: Update Metadata in D1
    console.log("[D1] Saving Metadata...");
    try {
      await db
        .update(blobs)
        .set({
          title: title.trim(),
          content: "", // Metadata only inside D1!
          storageKey: r2Res.storageKey,
          storageType: r2Res.storageType,
          sizeBytes: r2Res.sizeBytes,
          updatedAt: now,
        })
        .where(eq(blobs.id, id))
        .run();
      console.log("[D1] Metadata Saved");
      console.log("[API] Save Completed");

      const updatedBlob = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
      return NextResponse.json({ ...updatedBlob, content });
    } catch (d1Err: any) {
      console.error("[D1] Update Metadata failed.", d1Err);
      throw d1Err;
    }
  } catch (error: any) {
    console.error(`API PUT /api/blobs error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to update blob" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    // Verify ownership first
    const existing = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    if (!existing) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[R2] Delete Started");
    if (existing.storageKey) {
      await deleteBlobFromR2(existing.storageKey);
      console.log("[R2] Delete Success");
    }

    console.log("[D1] Delete Metadata");
    await db.delete(blobs).where(eq(blobs.id, id)).run();
    console.log("[API] Delete Completed");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API DELETE /api/blobs error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to delete blob" },
      { status: 500 }
    );
  }
}
