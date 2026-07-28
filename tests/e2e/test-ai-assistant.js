const { chromium } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("=========================================");
  console.log("STARTING AI ASSISTANT E2E VERIFICATION TEST");
  console.log(`Target Domain: ${BASE_URL}`);
  console.log("=========================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Navigating to Dashboard...");
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // 1. Check if AI Assistant toggle button exists in header
    console.log("Checking AI Assistant button in header...");
    const aiBtn = page.locator("button[title='Toggle AI Developer Assistant']");
    const aiBtnExists = await aiBtn.isVisible();
    if (!aiBtnExists) {
      throw new Error("AI Assistant toggle button not found in header!");
    }
    console.log("✅ PASS: AI Assistant toggle button exists in header.");

    // 2. Click to open the AI Assistant
    console.log("Opening AI Assistant panel...");
    await aiBtn.click();
    await delay(500);

    // Verify AI Assistant panel is open
    const panelContainer = page.locator("div.shadow-2xl");
    const isPanelOpen = await panelContainer.isVisible();
    if (!isPanelOpen) {
      throw new Error("AI Assistant panel did not open after clicking the header toggle!");
    }
    console.log("✅ PASS: AI Assistant panel opened successfully.");

    // Verify suggestions are visible
    console.log("Checking suggested actions...");
    const tsInterfaceSug = page.locator("button:has-text('TypeScript Interface')");
    const isTsSugVisible = await tsInterfaceSug.isVisible();
    if (!isTsSugVisible) {
      throw new Error("TypeScript Interface suggested action button not found!");
    }
    console.log("✅ PASS: TypeScript Interface suggestion is visible.");

    // 3. Click TypeScript Interface suggestion to trigger AI response
    console.log("Clicking 'TypeScript Interface' suggestion...");
    await tsInterfaceSug.click();
    
    // Wait for response to load
    console.log("Waiting for AI response to generate...");
    // The panel will display a code block card with the language header "TYPESCRIPT"
    const tsCodeCardHeader = page.locator("span:has-text('TYPESCRIPT')");
    await tsCodeCardHeader.waitFor({ state: "visible", timeout: 15000 });
    console.log("✅ PASS: AI Assistant returned code response containing TypeScript code card.");

    // Verify that the code card contains the code content
    const codeBlock = page.locator("pre:has-text('interface')");
    const isCodeVisible = await codeBlock.isVisible();
    if (!isCodeVisible) {
      throw new Error("Generated code block content not found!");
    }
    console.log("✅ PASS: Generated code block contains TypeScript interface.");

    // 4. Test "Insert" action
    console.log("Clicking 'Insert' button to write to Monaco Editor...");
    const insertBtn = page.locator("button[title='Replace Editor Content']");
    await insertBtn.click();
    await delay(500);

    // Read Monaco Editor content to verify it contains the TypeScript interface
    // In our MonacoEditor component, the content is synced back. Let's check it by clicking copy or reading via window
    const editorValue = await page.evaluate(() => {
      return window.currentEditor ? window.currentEditor.getValue() : null;
    });

    if (!editorValue || !editorValue.includes("interface")) {
      throw new Error(`Monaco Editor content was not correctly replaced! Content: ${editorValue}`);
    }
    console.log("✅ PASS: Monaco Editor content successfully replaced with generated TypeScript interface.");

    // 5. Test Close action
    console.log("Closing AI Assistant panel...");
    const closeBtn = page.locator("button[title='Close Assistant']");
    await closeBtn.click();
    await delay(500);

    const isPanelClosed = !(await panelContainer.isVisible());
    if (!isPanelClosed) {
      throw new Error("AI Assistant panel did not close after clicking the Close button!");
    }
    console.log("✅ PASS: AI Assistant panel closed successfully.");

    // 6. Navigate to Playground page and check AI Assistant integration
    console.log("Navigating to Code Playground...");
    await page.goto(`${BASE_URL}/playground`);
    await page.waitForLoadState("networkidle");

    console.log("Checking AI Assistant button in Playground header...");
    const playgroundAiBtn = page.locator("button[title='Toggle AI Developer Assistant']");
    const pgBtnExists = await playgroundAiBtn.isVisible();
    if (!pgBtnExists) {
      throw new Error("AI Assistant toggle button not found in Playground header!");
    }
    console.log("✅ PASS: AI Assistant toggle button exists in Playground header.");

    console.log("Opening AI Assistant in Playground...");
    await playgroundAiBtn.click();
    await delay(500);

    console.log("Checking Playground-specific suggestions...");
    const explainCodeSug = page.locator("button:has-text('Explain Code')");
    const isExplainSugVisible = await explainCodeSug.isVisible();
    if (!isExplainSugVisible) {
      throw new Error("Explain Code suggested action not found in Playground!");
    }
    console.log("✅ PASS: Playground-specific suggested actions (Explain Code) are visible.");

    console.log("=========================================");
    console.log("🎉 ALL AI ASSISTANT E2E TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================");
  } catch (error) {
    console.error("❌ E2E TEST EXCEPTION:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
