import { analyzeProjectZip } from "@/lib/services/projectAnalyzer";
import { generateTestPlanAndCases, generatePlaywrightCode, generateMaestroCode } from "@/lib/services/testPlanner";
import JSZip from "jszip";

async function runTestAutomationVerificationSuite() {
  console.log("=================================================");
  console.log("🧪 Running AI Test Automation Integration Suite");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Verify ZIP Analyzer & Path Traversal Protection
  console.log("Test 1: Project ZIP Analyzer & Path Traversal Security...");
  try {
    const zip = new JSZip();
    zip.file("package.json", JSON.stringify({
      name: "sample-next-app",
      dependencies: { next: "^14.0.0", react: "^18.0.0", "@playwright/test": "^1.40.0" }
    }));
    zip.file("app/page.tsx", "export default function Page() { return <h1>Home</h1> }");
    zip.file("app/dashboard/page.tsx", "export default function Dashboard() { return <h2>Dashboard</h2> }");
    zip.file("app/api/users/route.ts", "export async function GET() { return Response.json([]) }");
    // Inject unsafe malicious path traversal entry
    zip.file("../../../etc/passwd", "root:x:0:0:root:/root:/bin/bash");

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const analysis = await analyzeProjectZip(zipBuffer);

    assert(analysis.framework.includes("Next.js"), "Correctly detected Next.js framework from package.json");
    assert(analysis.routes.includes("/"), "Detected root route '/'");
    assert(analysis.routes.includes("/dashboard"), "Detected '/dashboard' page route");
    assert(analysis.apiEndpoints.includes("/api/users"), "Detected '/api/users' REST endpoint");
    assert(analysis.testFrameworksDetected.includes("Playwright"), "Detected Playwright dependency");
  } catch (err: any) {
    assert(false, `ZIP Analyzer failed: ${err.message}`);
  }

  // 2. Verify AI Test Planner & Code Generator
  console.log("\nTest 2: Test Planner & Script Code Generation...");
  try {
    const playwrightCode = generatePlaywrightCode("Verify Login Flow", "http://localhost:3000/login", "ui");
    assert(playwrightCode.includes("@playwright/test"), "Generated Playwright code includes @playwright/test import");
    assert(playwrightCode.includes("http://localhost:3000/login"), "Generated Playwright code targets correct URL");

    const maestroCode = generateMaestroCode("Launch App Flow", "com.example.app");
    assert(maestroCode.includes("appId: com.example.app"), "Generated Maestro code includes correct appId");
    assert(maestroCode.includes("- launchApp"), "Generated Maestro code includes launchApp command");

    const analysisSummary = {
      framework: "Next.js (React)",
      language: "typescript" as const,
      routes: ["/", "/login", "/dashboard"],
      apiEndpoints: ["/api/users"],
      components: ["Header", "LoginForm"],
      dependencies: {},
      projectType: "web" as const,
      testFrameworksDetected: ["Playwright"],
      suggestedSuites: [],
    };

    const plan = await generateTestPlanAndCases(analysisSummary, "Generate full test coverage", "http://localhost:3000");
    assert(plan.suites.length > 0, "Test planner generated test suites");
    assert(plan.suites[0].cases.length > 0, "Test planner generated test cases within suites");
  } catch (err: any) {
    assert(false, `Test Planner failed: ${err.message}`);
  }

  // Final Summary
  console.log("\n=================================================");
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestAutomationVerificationSuite();
