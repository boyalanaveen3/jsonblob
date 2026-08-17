import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testCases, type TestCase } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { saveTestCaseFileToR2, getTestCaseFileFromR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const suiteId = searchParams.get("suiteId");

    const db = await getDb();
    let list: TestCase[];

    if (projectId && suiteId) {
      list = await db
        .select()
        .from(testCases)
        .where(and(eq(testCases.projectId, projectId), eq(testCases.suiteId, suiteId)))
        .all();
    } else if (projectId) {
      list = await db
        .select()
        .from(testCases)
        .where(eq(testCases.projectId, projectId))
        .all();
    } else {
      list = await db.select().from(testCases).all();
    }

    // Hydrate code from R2 if stored in R2
    const hydrated = await Promise.all(
      list.map(async (tc) => {
        let codeVal = tc.code || "";
        if (tc.fileR2Key) {
          codeVal = await getTestCaseFileFromR2(tc.fileR2Key, codeVal);
        }
        return { ...tc, code: codeVal };
      })
    );

    return NextResponse.json(hydrated);
  } catch (error: any) {
    console.error("API GET /api/test-cases error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch test cases" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { projectId, suiteId, name, description, platform, priority, testType, code } = body;

    if (!projectId || !name?.trim()) {
      return NextResponse.json(
        { error: "projectId and name are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const testPlatform = platform || "web";

    let fileR2Key: string | undefined;
    if (code) {
      try {
        const r2Res = await saveTestCaseFileToR2(projectId, id, testPlatform, code);
        fileR2Key = r2Res.storageKey;
      } catch (err) {
        console.warn("R2 upload error for test case code:", err);
      }
    }

    const newCase: TestCase = {
      id,
      projectId,
      suiteId: suiteId || null,
      name: name.trim(),
      description: description?.trim() || undefined,
      platform: testPlatform,
      priority: priority || "medium",
      testType: testType || "ui",
      fileR2Key: fileR2Key || null,
      code: code || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    await db.insert(testCases).values(newCase).run();

    return NextResponse.json(newCase, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/test-cases error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create test case" },
      { status: 500 }
    );
  }
}
