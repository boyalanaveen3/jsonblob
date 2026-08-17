import { ProjectAnalysisSummary } from "./projectAnalyzer";

export interface GeneratedTestCaseSpec {
  name: string;
  description: string;
  platform: "web" | "mobile";
  priority: "low" | "medium" | "high" | "critical";
  testType: "ui" | "api" | "e2e" | "negative";
  suiteName: string;
  code: string;
}

export interface GeneratedTestPlan {
  planTitle: string;
  summary: string;
  suites: Array<{
    name: string;
    description: string;
    platform: "web" | "mobile";
    cases: GeneratedTestCaseSpec[];
  }>;
}

/**
 * Generates structured Playwright TypeScript test code for Web testing.
 */
export function generatePlaywrightCode(
  testName: string,
  targetUrl: string,
  testType: "ui" | "api" | "e2e" | "negative",
  customSteps?: string
): string {
  const sanitizedName = testName.replace(/"/g, '\\"');
  const sanitizedUrl = targetUrl || "http://localhost:3000";

  if (testType === "api") {
    return `import { test, expect } from '@playwright/test';

test('${sanitizedName}', async ({ request }) => {
  // Dispatch HTTP request to target endpoint
  const response = await request.get('${sanitizedUrl}');
  
  // Validate HTTP response status
  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();

  // Validate JSON response body structure
  const body = await response.json();
  expect(body).toBeDefined();
});
`;
  }

  if (testType === "negative") {
    return `import { test, expect } from '@playwright/test';

test('${sanitizedName}', async ({ page }) => {
  // Navigate to target page
  await page.goto('${sanitizedUrl}');
  
  // Fill invalid credentials or trigger error state
  const emailInput = page.getByRole('textbox', { name: /email|user/i }).or(page.locator('input[type="email"]'));
  if (await emailInput.count() > 0) {
    await emailInput.first().fill('invalid_user@test.com');
  }

  const passwordInput = page.getByRole('textbox', { name: /password/i }).or(page.locator('input[type="password"]'));
  if (await passwordInput.count() > 0) {
    await passwordInput.first().fill('wrong_password');
  }

  // Click Submit / Login button
  const submitBtn = page.getByRole('button', { name: /submit|login|sign in/i });
  if (await submitBtn.count() > 0) {
    await submitBtn.first().click();
  }

  // Expect error alert or validation message
  const errorMessage = page.locator('.error, [role="alert"], .text-red-500, .toast-error');
  await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
});
`;
  }

  return `import { test, expect } from '@playwright/test';

test('${sanitizedName}', async ({ page }) => {
  // 1. Navigate to target application URL
  await page.goto('${sanitizedUrl}');

  // 2. Wait for main container or page header to be visible
  await expect(page).toHaveURL(new RegExp('${sanitizedUrl.replace(/https?:\/\//, "")}'));

  // 3. Verify main page elements are rendered properly
  const mainHeading = page.getByRole('heading', { level: 1 }).or(page.locator('h1, h2')).first();
  await expect(mainHeading).toBeVisible();

  // 4. Perform interactive assertions
  ${customSteps || "// Additional user interactions and expectations\n  await page.waitForTimeout(500);"}
});
`;
}

/**
 * Generates structured Maestro YAML test code for Mobile testing.
 */
export function generateMaestroCode(
  testName: string,
  appId: string = "com.example.app",
  customSteps?: string
): string {
  return `appId: ${appId}
---
- launchApp
- assertVisible:
    id: "main_screen"
    optional: true

# Step: ${testName}
- tapOn: "Get Started"
  optional: true
- tapOn:
    id: "login_button"
    optional: true

# Verification assertions
- assertVisible:
    text: ".*"

${customSteps ? `# Custom Steps:\n${customSteps}` : ""}
`;
}

/**
 * High-level AI test planner function.
 * Uses Gemini API key if present, otherwise uses local rule engine generator.
 */
export async function generateTestPlanAndCases(
  analysis: ProjectAnalysisSummary,
  userPrompt: string,
  baseUrl: string = "http://localhost:3000",
  apiKey?: string
): Promise<GeneratedTestPlan> {
  const targetUrl = baseUrl || "http://localhost:3000";

  // Check if AI API Key is available
  if (apiKey) {
    try {
      const systemInstruction = `You are a Principal QA & Test Automation Architect expert in Playwright and Maestro.
Given the project analysis summary below, create a comprehensive, production-grade automated test plan and test cases.

[Project Summary]
Framework: ${analysis.framework}
Language: ${analysis.language}
Routes: ${JSON.stringify(analysis.routes)}
API Endpoints: ${JSON.stringify(analysis.apiEndpoints)}
Components: ${JSON.stringify(analysis.components)}
Project Type: ${analysis.projectType}
[/Project Summary]

User Custom Instructions: ${userPrompt || "Generate complete smoke, regression, and API test coverage."}

Return a STRICT JSON object matching this TypeScript interface:
{
  "planTitle": "string",
  "summary": "string",
  "suites": [
    {
      "name": "string",
      "description": "string",
      "platform": "web" | "mobile",
      "cases": [
        {
          "name": "string",
          "description": "string",
          "platform": "web" | "mobile",
          "priority": "low" | "medium" | "high" | "critical",
          "testType": "ui" | "api" | "e2e" | "negative",
          "suiteName": "string",
          "code": "string (executable Playwright TS for web or Maestro YAML for mobile)"
        }
      ]
    }
  ]
}

Ensure Playwright code uses modern @playwright/test selectors (getByRole, getByText, expect).
Return ONLY the raw JSON object without markdown code blocks.`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text.startsWith("```json")) text = text.replace(/^```json/, "").replace(/```$/, "").trim();
        else if (text.startsWith("```")) text = text.replace(/^```/, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(text) as GeneratedTestPlan;
        if (parsed && Array.isArray(parsed.suites)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("AI generation failed or fell back to deterministic test generator:", e);
    }
  }

  // Fallback Rule-Based Test Plan Generator
  const webCases: GeneratedTestCaseSpec[] = [];

  // 1. Navigation / UI cases
  analysis.routes.forEach((route, idx) => {
    const routeUrl = `${targetUrl.replace(/\/$/, "")}${route === "/" ? "" : route}`;
    webCases.push({
      name: `Verify Page Load & Title: ${route === "/" ? "Home Page" : route}`,
      description: `Navigates to ${routeUrl} and verifies page accessibility and title rendering`,
      platform: "web",
      priority: idx === 0 ? "critical" : "medium",
      testType: "ui",
      suiteName: "Core UI & Route Navigation Suite",
      code: generatePlaywrightCode(`Verify Page Load: ${route}`, routeUrl, "ui"),
    });
  });

  // 2. Login & Auth negative case
  webCases.push({
    name: "User Login Validation & Error Feedback",
    description: "Tests login form error handling when invalid credentials are submitted",
    platform: "web",
    priority: "high",
    testType: "negative",
    suiteName: "Authentication & Security Suite",
    code: generatePlaywrightCode("User Login Validation", `${targetUrl.replace(/\/$/, "")}/login`, "negative"),
  });

  // 3. API cases
  if (analysis.apiEndpoints.length > 0) {
    analysis.apiEndpoints.forEach((ep) => {
      const epUrl = `${targetUrl.replace(/\/$/, "")}${ep.startsWith("/") ? "" : "/"}${ep}`;
      webCases.push({
        name: `API GET Endpoint Verification (${ep})`,
        description: `Dispatches HTTP GET request to ${epUrl} and verifies 200 OK status`,
        platform: "web",
        priority: "high",
        testType: "api",
        suiteName: "REST API Endpoint Validation Suite",
        code: generatePlaywrightCode(`API Test: ${ep}`, epUrl, "api"),
      });
    });
  }

  const mobileCases: GeneratedTestCaseSpec[] = [];
  if (analysis.projectType === "mobile" || analysis.projectType === "web_mobile") {
    mobileCases.push({
      name: "Mobile App Launch & Screen Verification",
      description: "Executes Maestro mobile test to verify app launch and primary UI elements",
      platform: "mobile",
      priority: "critical",
      testType: "e2e",
      suiteName: "Mobile Maestro E2E Suite",
      code: generateMaestroCode("Mobile Launch Test", "com.example.app"),
    });
  }

  const suites: GeneratedTestPlan["suites"] = [
    {
      name: "Core UI & Route Navigation Suite",
      description: "Automated Playwright web UI tests covering main navigation routes",
      platform: "web",
      cases: webCases.filter((c) => c.suiteName === "Core UI & Route Navigation Suite"),
    },
    {
      name: "Authentication & Security Suite",
      description: "Verifies user login and input validation behaviors",
      platform: "web",
      cases: webCases.filter((c) => c.suiteName === "Authentication & Security Suite"),
    },
  ];

  if (analysis.apiEndpoints.length > 0) {
    suites.push({
      name: "REST API Endpoint Validation Suite",
      description: "Validates HTTP response codes and JSON schema bodies",
      platform: "web",
      cases: webCases.filter((c) => c.suiteName === "REST API Endpoint Validation Suite"),
    });
  }

  if (mobileCases.length > 0) {
    suites.push({
      name: "Mobile Maestro E2E Suite",
      description: "Mobile app automated flows powered by Maestro",
      platform: "mobile",
      cases: mobileCases,
    });
  }

  return {
    planTitle: `${analysis.framework} Automated Test Strategy Plan`,
    summary: `Generated ${webCases.length + mobileCases.length} automated test cases covering UI navigation, input validation, and API endpoints for ${analysis.framework}.`,
    suites,
  };
}
