import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blobs } from "@/lib/db/schema";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await getDb();
    const blob = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];

    if (!blob) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
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
    const now = new Date().toISOString();

    const result = await db
      .update(blobs)
      .set({
        title: title.trim(),
        content,
        updatedAt: now,
      })
      .where(eq(blobs.id, id))
      .run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

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
    const { id } = await params;
    const db = await getDb();
    const result = await db.delete(blobs).where(eq(blobs.id, id)).run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API DELETE /api/blobs/${request.url} error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to delete blob" },
      { status: 500 }
    );
  }
}
