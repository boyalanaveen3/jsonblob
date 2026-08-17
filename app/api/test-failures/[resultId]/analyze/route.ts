import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testResults, testCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTestCaseFileFromR2 } from "@/lib/storage/r2Storage";

export const runtime = "edge";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const db = await getDb();

    const result = await db.select().from(testResults).where(eq(testResults.id, resultId)).get();
    if (!result) {
      return NextResponse.json(
        { error: "Test result not found" },
        { status: 404 }
      );
    }

    let testCaseCode = "";
    if (result.testCaseId) {
      const tc = await db.select().from(testCases).where(eq(testCases.id, result.testCaseId)).get();
      if (tc) {
        testCaseCode = tc.code || "";
        if (tc.fileR2Key) {
          testCaseCode = await getTestCaseFileFromR2(tc.fileR2Key, testCaseCode);
        }
      }
    }

    const errorMsg = result.errorMessage || "Unknown test failure assertion error";
    const stack = result.stackTrace || "";
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const systemPrompt = `You are a Principal Test Automation Debugging Expert specializing in Playwright and Maestro.
Analyze the following test failure and provide a precise diagnostic analysis and code fix.

[Test Case Code]
${testCaseCode || "Code unavailable"}
[/Test Case Code]

[Error Message]
${errorMsg}
[/Error Message]

[Stack Trace]
${stack}
[/Stack Trace]

Return a STRICT JSON response with this format:
{
  "problem": "Clear statement of the problem",
  "rootCause": "Detailed root cause analysis",
  "recommendedFix": "Step by step fix recommendation",
  "fixedCode": "Full corrected executable test code",
  "confidence": 95
}

Return ONLY raw JSON, no markdown formatting.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text.startsWith("```json")) text = text.replace(/^```json/, "").replace(/```$/, "").trim();
          else if (text.startsWith("```")) text = text.replace(/^```/, "").replace(/```$/, "").trim();
          const parsed = JSON.parse(text);
          return NextResponse.json(parsed);
        }
      } catch (err) {
        console.warn("AI failure diagnosis call error, using deterministic fallback:", err);
      }
    }

    // Fallback failure diagnosis
    let problem = "Assertion Timeout / Selector Not Found";
    let rootCause = "The element selector target took longer than expected to render or changed DOM role attributes.";
    let recommendedFix = "Increase assertion timeout or update selector to use Playwright `getByRole()` or `getByTestId()`.";

    if (errorMsg.includes("404") || errorMsg.includes("500")) {
      problem = "HTTP Network API Endpoint Error";
      rootCause = `The backend endpoint returned HTTP error code in assertion: ${errorMsg}`;
      recommendedFix = "Verify API server is running and route parameters match the expected contract.";
    }

    // Generate suggested fix code
    let fixedCode = testCaseCode;
    if (fixedCode.includes("page.goto")) {
      fixedCode = fixedCode.replace(
        "await expect(page).toHaveURL",
        "await page.waitForLoadState('networkidle');\n  await expect(page).toHaveURL"
      );
    }

    return NextResponse.json({
      problem,
      rootCause,
      recommendedFix,
      fixedCode,
      confidence: 88,
    });
  } catch (error: any) {
    console.error("API POST /api/test-failures/[resultId]/analyze error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze test failure" },
      { status: 500 }
    );
  }
}
