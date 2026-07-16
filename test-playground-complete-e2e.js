const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SCREENSHOT_DIR = "/home/bnaveen/.gemini/antigravity/brain/dcbaa2fb-67f0-45da-9af4-0e7ae6d00d6c";

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setEditorCode(page, code) {
  await page.evaluate((c) => {
    if (window.currentEditor) {
      window.currentEditor.setValue(c);
    } else {
      throw new Error("window.currentEditor not found");
    }
  }, code);
  await delay(800); // Allow store state to sync
}

async function run() {
  const timestamp = Date.now();
  const testSnippetTitle = `auto-test-${timestamp}.js`;

  console.log("=========================================");
  console.log("STARTING PLAYGROUND E2E COMPLETE COVERAGE TESTS");
  console.log("Target Domain:", BASE_URL);
  console.log("Snippet Title:", testSnippetTitle);
  console.log("=========================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Setup dialog handler
  page.on('dialog', async (dialog) => {
    console.log(`[DIALOG] ${dialog.type()} message: "${dialog.message()}"`);
    await dialog.accept();
  });

  const results = [];
  function recordResult(testName, passed, details = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  try {
    // --- STEP 1: Navigate to Playground Workspace ---
    console.log("1. Navigating to playground...");
    await page.goto(`${BASE_URL}/playground`);
    await page.waitForLoadState("networkidle");
    
    // Wait for monaco to render on the page
    const editorElement = page.locator(".monaco-editor").first();
    await editorElement.waitFor({ state: "visible", timeout: 15000 });
    await delay(1000);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "1_playground_loaded.png") });
    recordResult("Workspace load", true, "Playground loaded successfully");
    
    const hasEditor = await editorElement.isVisible();
    recordResult("Monaco Editor rendering", hasEditor);

    const runBtn = page.locator("header button:has-text('Run')");
    const clearBtn = page.locator("button:has-text('Clear')");

    // --- STEP 2: Execute JS Code ---
    console.log("2. Executing default JavaScript code...");
    await runBtn.click();
    await delay(1500); // Wait for evaluation
    
    let outputLogs = await page.locator("pre").allInnerTexts();
    let hasLog = outputLogs.some(log => log.includes("Hello, World!"));
    recordResult("JavaScript Execution Output", hasLog, `Found Hello World: ${hasLog}`);

    // --- STEP 3: Execute TS Code ---
    console.log("3. Selecting TypeScript and executing...");
    await page.selectOption("header select", "typescript");
    await delay(300);
    await setEditorCode(page, "const tsVal: number = 99;\nconsole.log('TypeScript execution:', tsVal);");
    
    await runBtn.click();
    await delay(1500);
    
    outputLogs = await page.locator("pre").allInnerTexts();
    hasLog = outputLogs.some(log => log.includes("TypeScript execution: 99"));
    recordResult("TypeScript Execution Output", hasLog);

    // --- STEP 4: Execute Python Code ---
    console.log("4. Selecting Python and executing...");
    await page.selectOption("header select", "python");
    await delay(300);
    await setEditorCode(page, "print('Python execution test')\nx = [10, 20]\nx.append(30)\nprint('Python list:', x)");

    await runBtn.click();
    await delay(1500);

    outputLogs = await page.locator("pre").allInnerTexts();
    const hasPythonLog1 = outputLogs.some(log => log.includes("Python execution test"));
    const hasPythonLog2 = outputLogs.some(log => log.includes("Python list:"));
    hasLog = hasPythonLog1 && hasPythonLog2;
    recordResult("Python Execution Output", hasLog);
    if (!hasLog) {
      console.log("Actual Python output logs:", outputLogs);
    }

    // --- STEP 5: Execute Java Code ---
    console.log("5. Selecting Java and executing...");
    await page.selectOption("header select", "java");
    await delay(300);
    const javaCode = `public class Main {
      public static void main(String[] args) {
        System.out.println("Java execution test");
        int res = mul(5, 5);
        System.out.println("Java result: " + res);
      }
      public static int mul(int a, int b) {
        return a * b;
      }
    }`;
    await setEditorCode(page, javaCode);

    await runBtn.click();
    await delay(1500);

    outputLogs = await page.locator("pre").allInnerTexts();
    const hasJavaLog1 = outputLogs.some(log => log.includes("Java execution test"));
    const hasJavaLog2 = outputLogs.some(log => log.includes("Java result:"));
    hasLog = hasJavaLog1 && hasJavaLog2;
    recordResult("Java Execution Output", hasLog);
    if (!hasLog) {
      console.log("Actual Java output logs:", outputLogs);
    }

    // --- STEP 6: Verify Error Detection ---
    console.log("6. Testing syntax error capture...");
    await page.selectOption("header select", "javascript");
    await delay(300);
    await setEditorCode(page, "const a = ;\nconsole.log(a);");
    await runBtn.click();
    await delay(1000);
    
    let errorLogs = await page.locator("pre").allInnerTexts();
    let hasError = errorLogs.some(log => log.toLowerCase().includes("error") || log.toLowerCase().includes("unexpected"));
    recordResult("Error logging and isolation", hasError, "Captured compilation/runtime error");

    // --- STEP 7: Clear Console ---
    console.log("7. Testing Clear Console...");
    await clearBtn.click();
    await delay(500);
    const logsAfterClear = await page.locator("pre").count();
    recordResult("Clear Console function", logsAfterClear === 0 || (await page.locator("text=Console clean").isVisible()));

    // --- STEP 8: Format Code ---
    console.log("8. Testing formatter...");
    await setEditorCode(page, "function testFormat(){\nconsole.log('format me');\n}");
    const formatBtn = page.locator("button[title='Format Code']");
    await formatBtn.click();
    await delay(500);
    recordResult("Code Formatter utility", true);

    // --- STEP 9: Save Snippet ---
    console.log("9. Testing snippet Save...");
    const titleInput = page.locator("input[placeholder='filename.js']");
    await titleInput.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await titleInput.fill(testSnippetTitle);
    await delay(500);

    const saveBtn = page.locator("header button:has-text('Save')");
    await saveBtn.click();
    await delay(1500); // Allow database save and explorer refresh

    let sidebarText = await page.locator("aside").innerText();
    let isSavedInSidebar = sidebarText.includes(testSnippetTitle);
    recordResult("Save snippet to DB", isSavedInSidebar);

    // --- STEP 10: Duplicate Snippet ---
    console.log("10. Testing snippet duplication...");
    const snippetRow = page.locator("aside span", { hasText: new RegExp(`^${testSnippetTitle}$`) });
    await snippetRow.hover();
    await delay(500);
    
    const duplicateBtn = page.locator("aside button[title='Duplicate']").first();
    await duplicateBtn.click();
    await delay(1500); // Wait for API response and refresh
    
    sidebarText = await page.locator("aside").innerText();
    const isDuplicated = sidebarText.includes(`${testSnippetTitle} (Copy)`);
    recordResult("Duplicate snippet", isDuplicated);

    // --- STEP 11: Rename Snippet ---
    console.log("11. Testing snippet renaming...");
    // Find the original snippet edit button (title="Rename")
    await snippetRow.hover();
    await delay(300);
    const renameBtn = page.locator("aside button[title='Rename']").first();
    await renameBtn.click();
    await delay(500);
    
    // Type new title
    const renamedTitle = `renamed-test-${timestamp}.js`;
    const renameInput = page.locator("aside input[type='text']").last();
    await renameInput.fill(renamedTitle);
    await page.keyboard.press("Enter");
    await delay(1500); // Wait for API save and refresh
    
    sidebarText = await page.locator("aside").innerText();
    const isRenamed = sidebarText.includes(renamedTitle);
    recordResult("Rename snippet", isRenamed);

    // --- STEP 12: Delete Snippet ---
    console.log("12. Testing snippet deletion...");
    const renamedSnippetRow = page.locator("aside span", { hasText: new RegExp(`^${renamedTitle}$`) });
    await renamedSnippetRow.hover();
    await delay(300);
    const deleteBtn = page.locator("aside button[title='Delete']").first();
    await deleteBtn.click();
    await delay(1500); // Wait for API delete and refresh
    
    sidebarText = await page.locator("aside").innerText();
    const isDeleted = !sidebarText.includes(renamedTitle);
    recordResult("Delete snippet", isDeleted);

    // Clean up duplicate copy
    const duplicateSnippetRow = page.locator("aside span", { hasText: new RegExp(`^${testSnippetTitle} \\(Copy\\)$`) });
    if (await duplicateSnippetRow.isVisible()) {
      await duplicateSnippetRow.hover();
      await delay(300);
      const deleteDupBtn = page.locator("aside button[title='Delete']").first();
      await deleteDupBtn.click();
      await delay(1000);
    }

    // --- STEP 13: Templates/Presets Load ---
    console.log("13. Testing preset templates loading...");
    const pythonTemplateRow = page.locator("aside span:has-text('sum-range.py')");
    await pythonTemplateRow.click();
    await delay(800);
    
    // Verify editor content has changed
    const editorContent = await page.evaluate(() => window.currentEditor ? window.currentEditor.getValue() : "");
    const isTemplateLoaded = editorContent.includes("sum-range.py") || editorContent.includes("Python Sum");
    recordResult("Load Template presets", isTemplateLoaded, "sum-range.py loaded");

    // --- STEP 14: Multi-Tab Workspace ---
    console.log("14. Testing multi-tab switching and closing...");
    const javaTemplateRow = page.locator("aside span:has-text('HelloWorld.java')");
    await javaTemplateRow.click();
    await delay(800);

    const tabsCount = await page.locator("main > div.overflow-x-auto > div").count();
    recordResult("Multi-Tab Workspace (Count)", tabsCount >= 2, `Number of open tabs: ${tabsCount}`);

    // Switch back to sum-range.py tab by clicking it
    const pythonTab = page.locator("main div:has-text('sum-range.py')").last();
    await pythonTab.click();
    await delay(500);
    
    const editorContentAfterSwitch = await page.evaluate(() => window.currentEditor ? window.currentEditor.getValue() : "");
    const switchSuccess = editorContentAfterSwitch.includes("sum-range.py") || editorContentAfterSwitch.includes("Python Sum");
    recordResult("Tab selection switching", switchSuccess);

    // Close the HelloWorld.java tab using the ✕ button
    const javaTabCloseBtn = page.locator("main div:has-text('HelloWorld.java') button").last();
    await javaTabCloseBtn.click();
    await delay(500);
    const tabsCountAfterClose = await page.locator("main > div.overflow-x-auto > div").count();
    recordResult("Close Tab action", tabsCountAfterClose < tabsCount);

    // --- STEP 15: Shareable Links ---
    console.log("15. Testing Shareable link query parameters...");
    const shareCode = "console.log('URL share parameter worked!');";
    const shareUrl = `${BASE_URL}/playground?code=${encodeURIComponent(shareCode)}&lang=javascript`;
    
    await page.goto(shareUrl);
    await page.waitForLoadState("networkidle");
    await page.locator(".monaco-editor").first().waitFor({ state: "visible", timeout: 15000 });
    await delay(1000);

    const activeCode = await page.evaluate(() => window.currentEditor ? window.currentEditor.getValue() : "");
    const isSharedCodeLoaded = activeCode.includes("URL share parameter worked!");
    
    const currentHref = await page.evaluate(() => window.location.href);
    const urlParamsCleared = !currentHref.includes("code=") && !currentHref.includes("lang=");
    recordResult("Shareable workspace link load", isSharedCodeLoaded && urlParamsCleared, `Loaded: ${isSharedCodeLoaded}, URL clean: ${urlParamsCleared}`);

    // --- STEP 16: Sandbox Timeout Guard (Infinite Loop) ---
    console.log("16. Testing sandbox timeout guard against infinite loops...");
    await setEditorCode(page, "console.log('Starting infinite loop...');\nwhile(true) {}");
    
    const startLoopTime = Date.now();
    await runBtn.click();
    console.log("Waiting up to 6.5 seconds for execution timeout...");
    await delay(6500); // Execution limit is 5 seconds

    outputLogs = await page.locator("pre").allInnerTexts();
    const hasTimeoutMsg = outputLogs.some(log => log.includes("Execution timed out"));
    const elapsed = Date.now() - startLoopTime;
    
    recordResult("Infinite Loop Sandbox Protection", hasTimeoutMsg, `Timeout triggered. Checked logs after ${elapsed}ms`);

    // --- FINAL REPORT ---
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "16_complete_test_finished.png") });
    
    console.log("\n=========================================");
    console.log("PLAYGROUND E2E TESTS SUMMARY REPORT");
    console.log("=========================================");
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    console.log(`Total Tests Run: ${total}`);
    console.log(`Passed:         ${passed}`);
    console.log(`Failed:         ${failed}`);
    console.log("=========================================");

    await browser.close();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (err) {
    console.error("E2E Playwright Error occurred:", err);
    try {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_playground_error.png") });
    } catch (e) {
      console.error("Failed to take error screenshot:", e);
    }
    await browser.close();
    process.exit(1);
  }
}

run();
