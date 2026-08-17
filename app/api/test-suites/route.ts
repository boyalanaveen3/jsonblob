import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testSuites, type TestSuite } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const db = await getDb();
    let query = db.select().from(testSuites);

    let list: TestSuite[];
    if (projectId) {
      list = await query.where(eq(testSuites.projectId, projectId)).all();
    } else {
      list = await query.all();
    }

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("API GET /api/test-suites error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch test suites" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { projectId, name, description, platform } = body;

    if (!projectId || !name?.trim()) {
      return NextResponse.json(
        { error: "projectId and name are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newSuite: TestSuite = {
      id,
      projectId,
      name: name.trim(),
      description: description?.trim() || undefined,
      platform: platform || "web",
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    await db.insert(testSuites).values(newSuite).run();

    return NextResponse.json(newSuite, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/test-suites error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create test suite" },
      { status: 500 }
    );
  }
}
