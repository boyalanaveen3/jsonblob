import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testProjects, type TestProject } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { saveProjectSourceToR2 } from "@/lib/storage/r2Storage";
import { analyzeProjectZip } from "@/lib/services/projectAnalyzer";

export const runtime = "edge";

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db.select().from(testProjects).all();
    projects.sort((a: any, b: any) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("API GET /api/test-projects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch test projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value || request.headers.get("x-user-id") || "default-user";

    const contentType = request.headers.get("content-type") || "";
    let name = "";
    let description = "";
    let projectType: "web" | "mobile" | "web_mobile" = "web";
    let baseUrl = "http://localhost:3000";
    let environment = "development";
    let zipBuffer: ArrayBuffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = (formData.get("name") as string) || "";
      description = (formData.get("description") as string) || "";
      projectType = ((formData.get("projectType") as string) || "web") as any;
      baseUrl = (formData.get("baseUrl") as string) || "http://localhost:3000";
      environment = (formData.get("environment") as string) || "development";

      const file = formData.get("file") as File | null;
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          return NextResponse.json(
            { error: "ZIP file exceeds maximum allowed size of 50MB" },
            { status: 400 }
          );
        }
        zipBuffer = await file.arrayBuffer();
      }
    } else {
      const body = (await request.json()) as any;
      name = body.name || "";
      description = body.description || "";
      projectType = body.projectType || "web";
      baseUrl = body.baseUrl || "http://localhost:3000";
      environment = body.environment || "development";
    }

    if (!name.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();
    let sourceR2Key: string | undefined = undefined;
    let framework = "Web Application";

    // If ZIP file was uploaded, save to R2 & run analyzer
    let analysisResult: any = null;
    if (zipBuffer) {
      try {
        const r2Res = await saveProjectSourceToR2(projectId, zipBuffer);
        sourceR2Key = r2Res.storageKey;

        // Run ZIP Analyzer
        analysisResult = await analyzeProjectZip(zipBuffer);
        framework = analysisResult.framework || framework;
      } catch (err: any) {
        console.error("ZIP upload or analysis error:", err);
        return NextResponse.json(
          { error: `Failed to upload and analyze project archive: ${err.message}` },
          { status: 500 }
        );
      }
    }

    const newProject: TestProject = {
      id: projectId,
      name: name.trim(),
      description: description.trim() || null,
      projectType,
      sourceType: zipBuffer ? "zip" : "manual",
      sourceR2Key: sourceR2Key || null,
      baseUrl: baseUrl.trim() || "http://localhost:3000",
      environment,
      framework,
      status: "active",
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    await db.insert(testProjects).values(newProject).run();

    return NextResponse.json({
      project: newProject,
      analysis: analysisResult,
    }, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/test-projects error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create test project" },
      { status: 500 }
    );
  }
}
