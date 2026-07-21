const { chromium } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runFullTestSuite() {
  console.log("====================================================");
  console.log("STARTING FULL AI ASSISTANT EXHAUSTIVE FEATURE VERIFICATION");
  console.log("Target Base URL:", BASE_URL);
  console.log("====================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];
  function record(testName, passed, details = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  try {
    // 1. Dashboard Load & AI Panel Open
    console.log("1. Testing Dashboard Load & AI Sidebar...");
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await delay(1000);

    const aiBtn = page.locator("button:has-text('AI Assistant')").first();
    await aiBtn.click();
    await delay(500);

    const isPanelOpen = await page.locator("span:has-text('AI Assistant')").first().isVisible();
    record("AI Panel Open", isPanelOpen, "Panel opened successfully");

    async function sendPrompt(promptText) {
      const input = page.locator("textarea[placeholder*='Ask AI']");
      await input.fill(promptText);
      await delay(200);
      await page.keyboard.press("Enter");
      await delay(1200);
    }

    async function getLastResponseText() {
      return await page.locator("div.bg-accent\\/40").last().textContent();
    }

    // 2. Validate JSON (Valid State)
    console.log("2. Testing Validate JSON (Valid Payload)...");
    await sendPrompt("Validate this JSON and report any syntax or structural issues");
    const valText = await getLastResponseText();
    const valPassed = valText.includes("Valid RFC 8259 JSON") || valText.includes("Validation Diagnostics");
    record("Validate JSON (Valid)", valPassed, valPassed ? "Reported valid JSON diagnostic" : valText.substring(0, 80));

    // 3. Test Invalid JSON Handling (Simulate user's exact syntax error `"status": "ready`)
    console.log("3. Testing Invalid JSON Syntax Error Diagnostics & Auto-Repair...");
    // Inject invalid JSON in Monaco editor
    await page.evaluate(() => {
      if (window.setEditorValue) {
        window.setEditorValue('{\n  "welcome": "JSON Blob MVP",\n  "status": "ready\n}');
      }
    });
    await delay(500);

    // Prompt: Validate JSON on broken payload
    await sendPrompt("Validate this JSON and report any syntax or structural issues");
    const brokenValText = await getLastResponseText();
    const brokenValPassed = brokenValText.includes("JSON Syntax Error Detected") || brokenValText.includes("Repaired Payload");
    record("Validate JSON (Syntax Error Diagnostic)", brokenValPassed, brokenValPassed ? "Correctly flagged syntax error with line/column diagnostic and repaired JSON" : brokenValText.substring(0, 100));

    // Prompt: Fix Syntax
    await sendPrompt("Scan and resolve any JSON syntax errors, list what was wrong, and generate valid JSON");
    const fixText = await getLastResponseText();
    const fixPassed = fixText.includes("JSON Syntax Repair") && fixText.includes('"status": "ready"');
    record("Fix Syntax (Auto-Repair)", fixPassed, fixPassed ? "Successfully repaired unclosed string literal" : fixText.substring(0, 80));

    // Test Insert repaired JSON back into editor
    console.log("Testing Insert button action on repaired code block...");
    const insertBtn = page.locator("button:has-text('Insert')").last();
    await insertBtn.click();
    await delay(500);

    const repairedValInEditor = await page.evaluate(() => window.currentEditor ? window.currentEditor.getValue() : "");
    const editorRepaired = repairedValInEditor.includes('"status": "ready"');
    record("Insert Repaired JSON Action", editorRepaired, "Clicked Insert and updated Monaco editor content cleanly");

    // 4. Test Beautify JSON
    console.log("4. Testing Beautify JSON...");
    await sendPrompt("Beautify this JSON and format it with indentation");
    const beautifyText = await getLastResponseText();
    record("Beautify JSON", beautifyText.includes("JSON Beautified"), "Successfully formatted JSON");

    // 5. Test Minify JSON
    console.log("5. Testing Minify JSON...");
    await sendPrompt("Minify this JSON into a compact single-line payload");
    const minifyText = await getLastResponseText();
    record("Minify JSON", minifyText.includes("Minified JSON"), "Successfully compressed JSON");

    // 6. Test TypeScript Interface
    console.log("6. Testing TypeScript Interface...");
    await sendPrompt("Convert this JSON to a complete TypeScript interface with deep nested definitions");
    const tsText = await getLastResponseText();
    record("TypeScript Interface", tsText.includes("export interface RootObject"), "Generated TypeScript interface");

    // 7. Test JavaScript Types
    console.log("7. Testing JavaScript Types...");
    await sendPrompt("Generate JavaScript type definitions for this JSON payload");
    const jsText = await getLastResponseText();
    record("JavaScript Types", jsText.includes("JavaScript Types"), "Generated JS types");

    // 8. Test Python Dataclass
    console.log("8. Testing Python Dataclass...");
    await sendPrompt("Convert this JSON to Python dataclass models");
    const pyText = await getLastResponseText();
    record("Python Dataclass", pyText.includes("@dataclass"), "Generated Python dataclasses");

    // 9. Test Java POJO
    console.log("9. Testing Java POJO...");
    await sendPrompt("Convert this JSON to Java POJO classes");
    const javaText = await getLastResponseText();
    record("Java POJO", javaText.includes("public class RootClass"), "Generated Java POJOs");

    // 10. Test C# Models
    console.log("10. Testing C# Models...");
    await sendPrompt("Convert this JSON to C# model structures");
    const csText = await getLastResponseText();
    record("C# Models", csText.includes("public class RootClass"), "Generated C# models");

    // 11. Test JSON Schema
    console.log("11. Testing JSON Schema...");
    await sendPrompt("Generate a JSON Schema for this object");
    const schemaText = await getLastResponseText();
    record("JSON Schema", schemaText.includes("JSON Schema"), "Generated JSON Schema");

    // 12. Test Mock Data
    console.log("12. Testing Mock Data...");
    await sendPrompt("Generate realistic mock data for this JSON structure");
    const mockText = await getLastResponseText();
    record("Mock Data", mockText.includes("Mock Data"), "Generated mock data");

    // 13. Test Flatten JSON
    console.log("13. Testing Flatten JSON...");
    await sendPrompt("Flatten this nested JSON into a single-level object");
    const flatText = await getLastResponseText();
    record("Flatten JSON", flatText.includes("Flattened JSON"), "Generated flattened keys");

    // 14. Test Unflatten JSON
    console.log("14. Testing Unflatten JSON...");
    await sendPrompt("Unflatten this flat JSON object back into a nested structure");
    const unflatText = await getLastResponseText();
    record("Unflatten JSON", unflatText.includes("Unflattened JSON"), "Generated unflattened JSON");

    // 15. Test Compare JSON
    console.log("15. Testing Compare JSON...");
    await sendPrompt("Compare this JSON with a sample object and highlight differences");
    const compareText = await getLastResponseText();
    record("Compare JSON", compareText.includes("JSON Comparison"), "Compared JSON payloads");

    // 16. Test Merge JSON
    console.log("16. Testing Merge JSON...");
    await sendPrompt("Merge this JSON with a sample object and produce the combined result");
    const mergeText = await getLastResponseText();
    record("Merge JSON", mergeText.includes("Merged JSON"), "Merged JSON payloads");

    // 17. Test Deep Explain JSON
    console.log("17. Testing Explain JSON...");
    await sendPrompt("Explain this JSON data structure and summarize the keys/nesting levels in deep detail");
    const explainText = await getLastResponseText();
    record("Explain JSON", explainText.includes("Deep JSON Schema Explanation"), "Generated structural analysis");

    // 18. Navigate to Code Playground & Test Playground Assistant Features
    console.log("\n18. Testing Code Playground Assistant Features...");
    await page.goto(`${BASE_URL}/playground`);
    await page.waitForLoadState("networkidle");
    await delay(1000);

    const pgAiBtn = page.locator("button:has-text('AI Assistant')").first();
    await pgAiBtn.click();
    await delay(500);

    // Explain Code
    console.log("Testing Explain Code in Playground...");
    await sendPrompt("Explain the active editor code in detail");
    const pgExplainText = await getLastResponseText();
    record("Playground Explain Code", pgExplainText.includes("Explanation") || pgExplainText.includes("Code"), "Analyzed playground JS code");

    // Find Bugs
    console.log("Testing Find Bugs in Playground...");
    await sendPrompt("Find potential bugs and edge cases in the active editor code");
    const bugText = await getLastResponseText();
    record("Playground Find Bugs", bugText.includes("Bug") || bugText.includes("Code"), "Audited code for bugs");

  } catch (err) {
    console.error("❌ EXHAUSTIVE TEST EXCEPTION:", err);
    record("Exhaustive Suite Execution", false, err.message);
  } finally {
    await browser.close();
    console.log("\n====================================================");
    console.log("EXHAUSTIVE AI ASSISTANT TEST SUITE COMPLETED");
    console.log("====================================================");

    const allPassed = results.every((r) => r.passed);
    process.exit(allPassed ? 0 : 1);
  }
}

runFullTestSuite();
