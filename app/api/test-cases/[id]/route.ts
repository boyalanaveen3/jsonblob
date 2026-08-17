import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { saveTestCaseFileToR2, getTestCaseFileFromR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const tc = await db.select().from(testCases).where(eq(testCases.id, id)).get();
    if (!tc) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    let code = tc.code || "";
    if (tc.fileR2Key) {
      code = await getTestCaseFileFromR2(tc.fileR2Key, code);
    }

    return NextResponse.json({ ...tc, code });
  } catch (error: any) {
    console.error("API GET /api/test-cases/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch test case" },
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

    const existing = await db.select().from(testCases).where(eq(testCases.id, id)).get();
    if (!existing) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    let fileR2Key = existing.fileR2Key;
    if (body.code !== undefined) {
      try {
        const r2Res = await saveTestCaseFileToR2(
          existing.projectId,
          id,
          (body.platform || existing.platform) as any,
          body.code
        );
        fileR2Key = r2Res.storageKey;
      } catch (err) {
        console.warn("Failed to update test code in R2:", err);
      }
    }

    const updated = {
      name: body.name !== undefined ? body.name.trim() : existing.name,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      priority: body.priority || existing.priority,
      testType: body.testType || existing.testType,
      platform: body.platform || existing.platform,
      fileR2Key,
      code: body.code !== undefined ? body.code : existing.code,
      updatedAt: new Date().toISOString(),
    };

    await db.update(testCases).set(updated).where(eq(testCases.id, id)).run();

    return NextResponse.json({ ...existing, ...updated });
  } catch (error: any) {
    console.error("API PUT /api/test-cases/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update test case" },
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

    await db.delete(testCases).where(eq(testCases.id, id)).run();
    return NextResponse.json({ success: true, message: "Test case deleted successfully" });
  } catch (error: any) {
    console.error("API DELETE /api/test-cases/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete test case" },
      { status: 500 }
    );
  }
}
