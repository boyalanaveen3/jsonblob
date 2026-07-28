const { chromium } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("=========================================");
  console.log("STARTING AI ASSISTANT FEATURE E2E TESTS");
  console.log("Target Base URL:", BASE_URL);
  console.log("=========================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];
  function record(testName, passed, details = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  try {
    // 1. Load JSON Blob Dashboard
    console.log("Testing JSON Blob Dashboard AI Assistant...");
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await delay(1000);
    record("Dashboard Load", true, "Successfully loaded JSON Blob SaaS dashboard");

    // 2. Open AI Assistant Panel
    const aiBtn = page.locator("button:has-text('AI Assistant')").first();
    await aiBtn.click();
    await delay(500);

    const isPanelOpen = await page.locator("span:has-text('AI Assistant')").first().isVisible();
    record("AI Assistant Panel Open", isPanelOpen, "AI Assistant sidebar opened");

    // 3. Verify Header Badge Context
    const headerText = await page.locator(".font-mono:has-text('JSON')").first().textContent();
    const hasJsonBadge = headerText ? headerText.includes("JSON") : false;
    record("Header Badge Context", hasJsonBadge, `Header reports language as: ${headerText}`);

    // Helper to send a prompt via the AI Assistant chat input
    async function sendPrompt(promptText) {
      const input = page.locator("textarea[placeholder*='Ask AI']");
      await input.fill(promptText);
      await delay(200);
      const sendBtn = page.locator("button:has(svg.lucide-send)").or(page.locator("button:has-text('Send')")).first();
      await page.keyboard.press("Enter");
      await delay(1500);
    }

    // 4. Test TypeScript Interface Generation
    console.log("Testing TypeScript Interface generation...");
    await sendPrompt("Convert this JSON to a complete TypeScript interface with deep nested definitions");
    const tsResponse = await page.locator("div.space-y-4").last().textContent();
    const tsPassed = tsResponse.includes("export interface RootObject") && !tsResponse.includes("invalid JSON");
    record("TypeScript Interface Generation", tsPassed, tsPassed ? "Successfully generated recursive TypeScript interface" : `Failed: ${tsResponse.substring(0, 100)}`);

    // 5. Test Python Dataclass Generation
    console.log("Testing Python Dataclass generation...");
    await sendPrompt("Convert this JSON to Python dataclass models");
    const pyResponse = await page.locator("div.space-y-4").last().textContent();
    const pyPassed = pyResponse.includes("@dataclass") && pyResponse.includes("class RootClass");
    record("Python Dataclass Generation", pyPassed, pyPassed ? "Successfully generated Python dataclasses" : `Failed: ${pyResponse.substring(0, 100)}`);

    // 6. Test Java POJO Generation
    console.log("Testing Java POJO generation...");
    await sendPrompt("Convert this JSON to Java POJO classes");
    const javaResponse = await page.locator("div.space-y-4").last().textContent();
    const javaPassed = javaResponse.includes("public class RootClass");
    record("Java POJO Generation", javaPassed, javaPassed ? "Successfully generated Java POJO classes" : `Failed: ${javaResponse.substring(0, 100)}`);

    // 7. Test C# Models Generation
    console.log("Testing C# Models generation...");
    await sendPrompt("Convert this JSON to C# model structures");
    const csResponse = await page.locator("div.space-y-4").last().textContent();
    const csPassed = csResponse.includes("public class RootClass");
    record("C# Models Generation", csPassed, csPassed ? "Successfully generated C# model structures" : `Failed: ${csResponse.substring(0, 100)}`);

    // 8. Test JSON Schema Generation
    console.log("Testing JSON Schema generation...");
    await sendPrompt("Generate a JSON Schema for this object");
    const schemaResponse = await page.locator("div.space-y-4").last().textContent();
    const schemaPassed = schemaResponse.includes("JSON Schema") && schemaResponse.includes("properties");
    record("JSON Schema Generation", schemaPassed, schemaPassed ? "Successfully generated JSON schema" : `Failed: ${schemaResponse.substring(0, 100)}`);

    // 9. Navigate to Code Playground
    console.log("\nTesting Code Playground AI Assistant...");
    await page.goto(`${BASE_URL}/playground`);
    await page.waitForLoadState("networkidle");
    await delay(1000);

    // 10. Open AI Assistant in Playground
    const pgAiBtn = page.locator("button:has-text('AI Assistant')").first();
    await pgAiBtn.click();
    await delay(500);

    const pgHeaderText = await page.locator(".font-mono:has-text('javascript')").or(page.locator(".font-mono:has-text('JAVASCRIPT')")).first().textContent();
    const hasJsBadge = pgHeaderText ? pgHeaderText.toLowerCase().includes("javascript") : false;
    record("Playground Header Badge Context", hasJsBadge, `Playground header reports language as: ${pgHeaderText}`);

    // 11. Test Code Explanation in Playground
    console.log("Testing Explain Code in Playground...");
    const explainBtn = page.locator("button:has-text('Explain Code')").first();
    await explainBtn.click();
    await delay(1500);

    const explainResponse = await page.locator("div.space-y-4").last().textContent();
    const explainPassed = explainResponse.includes("Explanation") || explainResponse.includes("Code");
    record("Playground Code Explanation", explainPassed, explainPassed ? "Successfully generated code explanation" : `Failed: ${explainResponse.substring(0, 100)}`);

  } catch (err) {
    console.error("❌ E2E EXCEPTION:", err);
    record("AI Assistant E2E Execution", false, err.message);
  } finally {
    await browser.close();
    console.log("\n=========================================");
    console.log("AI ASSISTANT FEATURE E2E TESTS COMPLETE");
    console.log("=========================================");

    const allPassed = results.every((r) => r.passed);
    process.exit(allPassed ? 0 : 1);
  }
}

runTests();
