import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testProjects, testSuites, testCases, testRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const project = await db
      .select()
      .from(testProjects)
      .where(eq(testProjects.id, id))
      .get();

    if (!project) {
      return NextResponse.json(
        { error: "Test project not found" },
        { status: 404 }
      );
    }

    const suites = await db.select().from(testSuites).where(eq(testSuites.projectId, id)).all();
    const cases = await db.select().from(testCases).where(eq(testCases.projectId, id)).all();
    const runs = await db.select().from(testRuns).where(eq(testRuns.projectId, id)).all();

    return NextResponse.json({
      project,
      stats: {
        suitesCount: suites.length,
        casesCount: cases.length,
        runsCount: runs.length,
      },
    });
  } catch (error: any) {
    console.error("API GET /api/test-projects/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch project details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as any;
    const db = await getDb();

    const existing = await db
      .select()
      .from(testProjects)
      .where(eq(testProjects.id, id))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Test project not found" },
        { status: 404 }
      );
    }

    const updated = {
      name: body.name !== undefined ? body.name.trim() : existing.name,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      baseUrl: body.baseUrl !== undefined ? body.baseUrl.trim() : existing.baseUrl,
      environment: body.environment || existing.environment,
      framework: body.framework || existing.framework,
      status: body.status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(testProjects)
      .set(updated)
      .where(eq(testProjects.id, id))
      .run();

    return NextResponse.json({ ...existing, ...updated });
  } catch (error: any) {
    console.error("API PUT /api/test-projects/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update test project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    // Delete associated test cases, suites, and runs
    await db.delete(testCases).where(eq(testCases.projectId, id)).run();
    await db.delete(testSuites).where(eq(testSuites.projectId, id)).run();
    await db.delete(testRuns).where(eq(testRuns.projectId, id)).run();
    await db.delete(testProjects).where(eq(testProjects.id, id)).run();

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("API DELETE /api/test-projects/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete test project" },
      { status: 500 }
    );
  }
}
