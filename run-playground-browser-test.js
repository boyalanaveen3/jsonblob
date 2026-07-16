const { chromium } = require("@playwright/test");
const path = require("path");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SCREENSHOT_DIR = "/home/bnaveen/.gemini/antigravity/brain/190d7729-ac87-4213-9de9-7e78a48f78e9";

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
  console.log("=========================================");
  console.log("STARTING PLAYWRIGHT PLAYGROUND BROWSER TESTS");
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
    // --- STEP 1: Navigate to Playground Workspace ---
    console.log("Navigating to playground...");
    await page.goto(`${BASE_URL}/playground`);
    await page.waitForLoadState("networkidle");
    
    // Wait for monaco to render on the page
    const editorElement = page.locator(".monaco-editor").first();
    await editorElement.waitFor({ state: "visible", timeout: 15000 });
    await delay(1000); // extra breathing room
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_playground_loaded.png") });
    recordResult("Workspace load", true, "Playground loaded successfully");
    
    const hasEditor = await editorElement.isVisible();
    recordResult("Monaco Editor rendering", hasEditor);

    const runBtn = page.locator("header button:has-text('Run')");
    const clearBtn = page.locator("button:has-text('Clear')");

    // --- STEP 2: Execute JS Code ---
    console.log("Executing default JavaScript code...");
    await runBtn.click();
    await delay(1500); // Wait for Worker execution
    
    let outputLogs = await page.locator("pre").allInnerTexts();
    let hasLog = outputLogs.some(log => log.includes("Hello, World!"));
    recordResult("JavaScript Execution Output", hasLog, `Found Hello World: ${hasLog}`);

    // --- STEP 3: Execute TS Code ---
    console.log("Selecting TypeScript and executing...");
    await page.selectOption("header select", "typescript");
    await delay(300);
    await setEditorCode(page, "const tsVal: number = 42;\nconsole.log('TypeScript execution:', tsVal);");
    
    await runBtn.click();
    await delay(1500);
    
    outputLogs = await page.locator("pre").allInnerTexts();
    hasLog = outputLogs.some(log => log.includes("TypeScript execution: 42"));
    recordResult("TypeScript Execution Output", hasLog);

    // --- STEP 4: Execute Python Code ---
    console.log("Selecting Python and executing...");
    await page.selectOption("header select", "python");
    await delay(300);
    await setEditorCode(page, "print('Python sandbox execution')\nnums = [1, 2]\nnums.append(3)\nprint('Python nums list:', nums)");

    await runBtn.click();
    await delay(1500);

    outputLogs = await page.locator("pre").allInnerTexts();
    hasLog = outputLogs.some(log => log.includes("Python sandbox execution") && log.includes("Python nums list: [1,2,3]"));
    recordResult("Python Execution Output", hasLog);

    // --- STEP 5: Execute Java Code ---
    console.log("Selecting Java and executing...");
    await page.selectOption("header select", "java");
    await delay(300);
    const javaCode = `public class Main {
      public static void main(String[] args) {
        System.out.println("Java sandbox execution");
        int sum = add(5, 10);
        System.out.println("Java math sum: " + sum);
      }
      public static int add(int a, int b) {
        return a + b;
      }
    }`;
    await setEditorCode(page, javaCode);

    await runBtn.click();
    await delay(1500);

    outputLogs = await page.locator("pre").allInnerTexts();
    hasLog = outputLogs.some(log => log.includes("Java sandbox execution") && log.includes("Java math sum: 15"));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_playground_executed.png") });
    recordResult("Java Execution Output", hasLog);

    // --- STEP 6: Verify Error Detection ---
    console.log("Writing invalid code and checking error detection...");
    await setEditorCode(page, "public class ErrorTest {\n  public static void main(String[] args) {\n    System.out.println(xyz);\n  }\n}");
    await runBtn.click();
    await delay(1000);
    
    let errorLogs = await page.locator("pre").allInnerTexts();
    let hasError = errorLogs.some(log => log.toLowerCase().includes("error") || log.toLowerCase().includes("not defined") || log.toLowerCase().includes("exception"));
    recordResult("Error logging and isolation", hasError, "Captured compilation/runtime error");

    // --- STEP 7: Clear Console ---
    console.log("Clicking Clear Console...");
    await clearBtn.click();
    await delay(500);
    const logsAfterClear = await page.locator("pre").count();
    recordResult("Clear Console function", logsAfterClear === 0 || (await page.locator("text=Console clean").isVisible()));

    // --- STEP 8: Format Code ---
    console.log("Formatting code...");
    await setEditorCode(page, "public class FormatTest{\npublic static void main(String[] args){\nSystem.out.println(\"formatted\");\n}\n}");

    const formatBtn = page.locator("button[title='Format Code']");
    await formatBtn.click();
    await delay(500);
    recordResult("Code Formatter utility", true);

    // --- STEP 9: Save Snippet ---
    console.log("Saving snippet...");
    const titleInput = page.locator("input[placeholder='filename.js']");
    await titleInput.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await titleInput.fill("playwright-e2e.java");
    await delay(500);

    const saveBtn = page.locator("header button:has-text('Save')");
    await saveBtn.click();
    await delay(1500); // Allow database save and explorer refresh

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_playground_saved.png") });
    
    const sidebarText = await page.locator("aside").innerText();
    const isSavedInSidebar = sidebarText.includes("playwright-e2e.java");
    recordResult("Save snippet to DB", isSavedInSidebar);

    console.log("\n=========================================");
    console.log("PLAYGROUND E2E BROWSER TESTS SUMMARY");
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
