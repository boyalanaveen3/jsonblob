import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blobs } from "@/lib/db/schema";
import { cookies } from "next/headers";

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
    const db = await getDb();
    const blob = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];

    if (!blob) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    // Expose only if the current user is the owner
    if (blob.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error(`API GET /api/blobs/${request.url} error:`, error);
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

    await db
      .update(blobs)
      .set({
        title: title.trim(),
        content,
        updatedAt: now,
      })
      .where(eq(blobs.id, id))
      .run();

    const updatedBlob = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    return NextResponse.json(updatedBlob);
  } catch (error: any) {
    console.error(`API PUT /api/blobs/${request.url} error:`, error);
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

    await db.delete(blobs).where(eq(blobs.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API DELETE /api/blobs/${request.url} error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to delete blob" },
      { status: 500 }
    );
  }
}
