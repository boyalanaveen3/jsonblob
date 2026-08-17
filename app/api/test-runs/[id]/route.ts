import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testRuns, testResults, testArtifacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const run = await db.select().from(testRuns).where(eq(testRuns.id, id)).get();
    if (!run) {
      return NextResponse.json(
        { error: "Test run not found" },
        { status: 404 }
      );
    }

    const results = await db.select().from(testResults).where(eq(testResults.runId, id)).all();
    const artifacts = await db.select().from(testArtifacts).where(eq(testArtifacts.runId, id)).all();

    return NextResponse.json({
      run,
      results,
      artifacts,
    });
  } catch (error: any) {
    console.error("API GET /api/test-runs/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch test run details" },
      { status: 500 }
    );
  }
}
