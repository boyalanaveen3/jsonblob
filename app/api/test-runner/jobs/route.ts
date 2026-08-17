import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testRuns, testProjects, testCases, testResults, testArtifacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTestCaseFileFromR2, saveRunArtifactToR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

// GET: Runner daemon polls for pending queued jobs
export async function GET() {
  try {
    const db = await getDb();

    // Find first queued run
    const queuedRuns = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.status, "queued"))
      .all();

    if (queuedRuns.length === 0) {
      return NextResponse.json({ job: null, message: "No queued jobs available" });
    }

    const run = queuedRuns[0];
    const project = await db.select().from(testProjects).where(eq(testProjects.id, run.projectId)).get();
    const cases = await db.select().from(testCases).where(eq(testCases.projectId, run.projectId)).all();

    // Hydrate code for each test case from R2
    const hydratedCases = await Promise.all(
      cases.map(async (c: any) => {
        let code = c.code || "";
        if (c.fileR2Key) {
          code = await getTestCaseFileFromR2(c.fileR2Key, code);
        }
        return {
          id: c.id,
          name: c.name,
          platform: c.platform,
          testType: c.testType,
          priority: c.priority,
          code,
        };
      })
    );

    // Mark status as running
    const now = new Date().toISOString();
    await db
      .update(testRuns)
      .set({ status: "running", startedAt: now })
      .where(eq(testRuns.id, run.id))
      .run();

    return NextResponse.json({
      job: {
        runId: run.id,
        projectId: run.projectId,
        projectName: project?.name || "Test Project",
        baseUrl: project?.baseUrl || "http://localhost:3000",
        platform: run.platform,
        environment: run.environmentId || "development",
        cases: hydratedCases,
      },
    });
  } catch (error: any) {
    console.error("API GET /api/test-runner/jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to poll runner jobs" },
      { status: 500 }
    );
  }
}

// POST: Runner daemon submits execution results and artifacts
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { runId, status, durationMs, passed, failed, skipped, errorMessage, results, artifacts } = body;

    if (!runId || !status) {
      return NextResponse.json(
        { error: "runId and status are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // Update test run record in D1
    await db
      .update(testRuns)
      .set({
        status,
        durationMs: (durationMs || 0).toString(),
        passed: (passed || 0).toString(),
        failed: (failed || 0).toString(),
        skipped: (skipped || 0).toString(),
        errorMessage: errorMessage || null,
        completedAt: now,
      })
      .where(eq(testRuns.id, runId))
      .run();

    // Insert individual test result rows
    if (Array.isArray(results)) {
      for (const res of results) {
        const resId = crypto.randomUUID();
        await db.insert(testResults).values({
          id: resId,
          runId,
          testCaseId: res.testCaseId || null,
          name: res.name || "Test Execution",
          status: res.status || "passed",
          durationMs: (res.durationMs || 0).toString(),
          errorMessage: res.errorMessage || null,
          stackTrace: res.stackTrace || null,
          retryCount: "0",
          createdAt: now,
        }).run();

        // Check if artifacts attached to this result
        if (Array.isArray(res.artifacts)) {
          for (const art of res.artifacts) {
            let r2Key = art.r2Key;
            if (!r2Key && art.content) {
              try {
                const r2Res = await saveRunArtifactToR2(runId, art.artifactType || "report", art.fileName || "artifact.json", art.content, art.contentType);
                r2Key = r2Res.storageKey;
              } catch (e) {
                console.warn("Failed to upload artifact to R2:", e);
              }
            }
            if (r2Key) {
              await db.insert(testArtifacts).values({
                id: crypto.randomUUID(),
                runId,
                testResultId: resId,
                artifactType: art.artifactType || "report",
                r2Key,
                fileName: art.fileName || "artifact",
                createdAt: now,
              }).run();
            }
          }
        }
      }
    }

    // Insert run-level artifacts (e.g. overall HTML report or JSON log)
    if (Array.isArray(artifacts)) {
      for (const art of artifacts) {
        let r2Key = art.r2Key;
        if (!r2Key && art.content) {
          try {
            const r2Res = await saveRunArtifactToR2(runId, art.artifactType || "report", art.fileName || "report.html", art.content, art.contentType || "text/html");
            r2Key = r2Res.storageKey;
          } catch (e) {
            console.warn("Failed to upload run artifact to R2:", e);
          }
        }
        if (r2Key) {
          await db.insert(testArtifacts).values({
            id: crypto.randomUUID(),
            runId,
            testResultId: null,
            artifactType: art.artifactType || "report",
            r2Key,
            fileName: art.fileName || "artifact",
            createdAt: now,
          }).run();
        }
      }
    }

    return NextResponse.json({ success: true, message: "Run execution result recorded successfully" });
  } catch (error: any) {
    console.error("API POST /api/test-runner/jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record runner results" },
      { status: 500 }
    );
  }
}
