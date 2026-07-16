import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { snippets, type Snippet } from "@/lib/db/schema";

export const runtime = "edge";

export async function GET() {
  try {
    const db = await getDb();
    const list = await db.select().from(snippets).all();
    // Sort in code by updatedAt descending
    list.sort((a: Snippet, b: Snippet) => b.updatedAt.localeCompare(a.updatedAt));
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("API GET /api/snippets error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch snippets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newSnippet = {
      id,
      title: title.trim(),
      language: language.toLowerCase().trim(),
      content,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(snippets).values(newSnippet).run();
    return NextResponse.json(newSnippet, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/snippets error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create snippet" },
      { status: 500 }
    );
  }
}
