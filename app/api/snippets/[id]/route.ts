import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { snippets } from "@/lib/db/schema";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await getDb();
    const snippet = (await db.select().from(snippets).where(eq(snippets.id, id)).all())[0];

    if (!snippet) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }

    return NextResponse.json(snippet);
  } catch (error: any) {
    console.error("API GET /api/snippets/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch snippet" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, language, content } = body as {
      title: string;
      language: string;
      content: string;
    };

    if (!title?.trim() || !language?.trim() || content === undefined) {
      return NextResponse.json(
        { error: "Title, language, and content are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db
      .update(snippets)
      .set({
        title: title.trim(),
        language: language.toLowerCase().trim(),
        content,
        updatedAt: now,
      })
      .where(eq(snippets.id, id))
      .run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }

    const updatedSnippet = (await db.select().from(snippets).where(eq(snippets.id, id)).all())[0];
    return NextResponse.json(updatedSnippet);
  } catch (error: any) {
    console.error("API PUT /api/snippets/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update snippet" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await getDb();
    const result = await db.delete(snippets).where(eq(snippets.id, id)).run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API DELETE /api/snippets/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete snippet" },
      { status: 500 }
    );
  }
}
