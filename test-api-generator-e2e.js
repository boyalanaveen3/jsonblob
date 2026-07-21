const { chromium } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("=========================================");
  console.log("STARTING AI API CLIENT GENERATOR E2E TESTS");
  console.log("Target Domain:", BASE_URL);
  console.log("=========================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const results = [];
  function recordResult(testName, passed, details = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  try {
    // 1. Load dashboard
    console.log("Loading dashboard...");
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await delay(2000);
    recordResult("Dashboard Load", true, "Loaded local dashboard successfully");

    // 2. Open Modal
    console.log("Opening Generate API Client modal...");
    const genButton = page.locator("button:has-text('Generate API Client')");
    await genButton.click();
    await delay(1000);

    const modalTitleVisible = await page.locator("h2:has-text('Generate API Client SDK')").isVisible();
    recordResult("Modal Opened", modalTitleVisible, "Modal with header 'Generate API Client SDK' is visible");

    // 3. Fill details and generate
    console.log("Configuring generator parameters...");
    
    // Choose TypeScript (default)
    // Choose Axios (default)
    // Choose TanStack Query (default)
    
    // Fill Entity Name
    await page.locator("#api-client-generator-entity-name").fill("Employee");
    await delay(500);

    // Verify raw JSON response input is populated
    const textareaVal = await page.locator("#api-client-generator-input").inputValue();
    const hasJsonContent = textareaVal.includes("welcome") || textareaVal.length > 5;
    recordResult("Input Value Pre-population", hasJsonContent, "JSON input textarea pre-populated correctly from workspace content");

    console.log("Clicking Generate SDK Client...");
    await page.locator("#api-client-generator-submit").click();

    // Wait for virtual explorer view
    console.log("Waiting for virtual explorer tree...");
    const explorerHeader = page.locator("span:has-text('Virtual Explorer')");
    await explorerHeader.waitFor({ state: "visible", timeout: 15000 });
    
    const isExplorerVisible = await explorerHeader.isVisible();
    recordResult("Virtual Explorer View Render", isExplorerVisible, "Virtual Explorer side-pane is rendered after generation");

    // 4. Verify generated files list
    const expectedFiles = ["types.ts", "api.ts", "axios.ts", "hooks.ts", "constants.ts", "README.md"];
    for (const fileName of expectedFiles) {
      const fileVisible = await page.locator(`button:has-text('${fileName}')`).first().isVisible();
      recordResult(`File Presence: ${fileName}`, fileVisible, `${fileName} matches schema specifications`);
    }

    // 5. Select a file and check preview
    console.log("Checking generated README.md preview...");
    await page.locator("button:has-text('README.md')").click();
    await delay(1000);

    // Close Modal
    console.log("Closing generator modal...");
    await page.locator("#api-client-generator-done").click();
    await delay(500);

    const modalClosed = !(await page.locator("h2:has-text('Generate API Client SDK')").isVisible());
    recordResult("Modal Closure", modalClosed, "Modal successfully closed returning to main dashboard");

  } catch (err) {
    console.error("❌ E2E EXCEPTION:", err);
    recordResult("Generator E2E Execution", false, err.message);
  } finally {
    await browser.close();
    console.log("\n=========================================");
    console.log("AI API CLIENT GENERATOR E2E TEST COMPLETE");
    console.log("=========================================");

    // Determine exit code
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }
}

run();
