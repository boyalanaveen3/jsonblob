import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testProjects, testSuites, testCases, testGenerations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateTestPlanAndCases } from "@/lib/services/testPlanner";
import { saveTestCaseFileToR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as any;
    const { prompt, baseUrl: customUrl } = body || {};

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

    const targetBaseUrl = customUrl || project.baseUrl || "http://localhost:3000";
    const apiKey = process.env.GEMINI_API_KEY;

    // Default analysis input for generator
    const analysisInput = {
      framework: project.framework || "Web Application",
      language: "typescript" as const,
      routes: ["/", "/login", "/dashboard", "/users", "/settings"],
      apiEndpoints: ["/api/users", "/api/auth/login", "/api/data"],
      components: ["Header", "Sidebar", "LoginForm", "DataTable"],
      dependencies: {},
      projectType: (project.projectType as any) || "web",
      testFrameworksDetected: ["Playwright"],
      suggestedSuites: [],
    };

    const plan = await generateTestPlanAndCases(analysisInput, prompt || "", targetBaseUrl, apiKey);

    // Save plan & created suites/cases in D1 and R2
    const createdSuites: any[] = [];
    const createdCases: any[] = [];
    const now = new Date().toISOString();

    for (const suiteSpec of plan.suites) {
      const suiteId = crypto.randomUUID();
      const newSuite = {
        id: suiteId,
        projectId: id,
        name: suiteSpec.name,
        description: suiteSpec.description,
        platform: suiteSpec.platform,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(testSuites).values(newSuite).run();
      createdSuites.push(newSuite);

      for (const caseSpec of suiteSpec.cases) {
        const caseId = crypto.randomUUID();
        // Save test code to R2
        let fileR2Key: string | undefined;
        try {
          const r2Res = await saveTestCaseFileToR2(id, caseId, caseSpec.platform, caseSpec.code);
          fileR2Key = r2Res.storageKey;
        } catch (r2Err) {
          console.warn("Failed to upload test code to R2, keeping inline fallback:", r2Err);
        }

        const newCase = {
          id: caseId,
          projectId: id,
          suiteId,
          name: caseSpec.name,
          description: caseSpec.description,
          platform: caseSpec.platform,
          priority: caseSpec.priority,
          testType: caseSpec.testType,
          fileR2Key: fileR2Key || null,
          code: caseSpec.code,
          status: "active",
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(testCases).values(newCase).run();
        createdCases.push(newCase);
      }
    }

    // Save generation record
    const genId = crypto.randomUUID();
    await db.insert(testGenerations).values({
      id: genId,
      projectId: id,
      prompt: prompt || "Full Test Coverage Generation",
      model: "gemini-2.5-flash",
      testPlan: JSON.stringify(plan),
      generatedCount: createdCases.length.toString(),
      createdAt: now,
    }).run();

    return NextResponse.json({
      success: true,
      planTitle: plan.planTitle,
      summary: plan.summary,
      suitesCount: createdSuites.length,
      casesCount: createdCases.length,
      createdSuites,
      createdCases,
    }, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/test-projects/[id]/generate-tests error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate tests" },
      { status: 500 }
    );
  }
}
