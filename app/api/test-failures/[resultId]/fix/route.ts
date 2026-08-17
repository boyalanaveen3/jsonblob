import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testResults, testCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { saveTestCaseFileToR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const body = (await request.json()) as any;
    const { fixedCode } = body || {};

    if (!fixedCode?.trim()) {
      return NextResponse.json(
        { error: "fixedCode is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.select().from(testResults).where(eq(testResults.id, resultId)).get();
    if (!result || !result.testCaseId) {
      return NextResponse.json(
        { error: "Test result or target test case not found" },
        { status: 404 }
      );
    }

    const tc = await db.select().from(testCases).where(eq(testCases.id, result.testCaseId)).get();
    if (!tc) {
      return NextResponse.json(
        { error: "Target test case not found" },
        { status: 404 }
      );
    }

    // Save updated test case code to R2
    let fileR2Key = tc.fileR2Key;
    try {
      const r2Res = await saveTestCaseFileToR2(tc.projectId, tc.id, tc.platform as any, fixedCode);
      fileR2Key = r2Res.storageKey;
    } catch (err) {
      console.warn("Failed to upload fixed code to R2:", err);
    }

    const now = new Date().toISOString();
    await db
      .update(testCases)
      .set({
        code: fixedCode,
        fileR2Key,
        updatedAt: now,
      })
      .where(eq(testCases.id, tc.id))
      .run();

    return NextResponse.json({
      success: true,
      message: "Fixed code patch applied successfully to test case",
      testCaseId: tc.id,
      testCaseName: tc.name,
    });
  } catch (error: any) {
    console.error("API POST /api/test-failures/[resultId]/fix error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply test fix patch" },
      { status: 500 }
    );
  }
}
