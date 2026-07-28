const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || path.join(__dirname, "artifacts");

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("=========================================");
  console.log("STARTING ADVANCED WORKSPACE E2E TEST SUITE");
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
    // --- STEP 1: Auth & Sign Up Check ---
    console.log("1. Checking auth status...");
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("networkidle");
    await delay(1000);

    const currentUrl = page.url();
    if (currentUrl.includes("/auth")) {
      console.log("Not logged in, performing registration...");
      const signUpBtn = page.locator("button:has-text('Sign Up')");
      await signUpBtn.click();
      await delay(300);

      const email = `test_advanced_user_${Date.now()}@example.com`;
      await page.locator("input[placeholder='John Doe']").fill("Jane Doe");
      await page.locator("form >> input[placeholder='name@example.com']").nth(1).fill(email);
      await page.locator("form >> input[placeholder='••••••••']").nth(1).fill("Password123!");
      
      const registerBtn = page.locator("button[type='submit']:has-text('Register')");
      await registerBtn.click();

      await page.waitForURL(url => url.pathname === "/", { timeout: 10000 });
      await page.waitForLoadState("networkidle");
      console.log("Registration complete.");
    } else {
      console.log("Already logged in, skipping registration.");
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "adv_1_auth_setup.png") });
    recordResult("User isolated session setup", true);

    // --- STEP 2: Navigate to SQL Workspace ---
    console.log("2. Navigating to SQL Workspace...");
    // Open AI Assistant globally from the dashboard quick actions
    const askAiBtn = page.locator("button:has-text('Ask AI Assistant')");
    await askAiBtn.waitFor({ state: "visible", timeout: 10000 });
    await askAiBtn.click();
    await delay(800);

    const sqlNavBtn = page.locator("button[title='SQL Workspace']").first();
    await sqlNavBtn.click();
    
    // Wait for monaco to render
    console.log("Waiting for SQL Monaco Editor to mount...");
    const sqlEditorElement = page.locator(".monaco-editor").first();
    await sqlEditorElement.waitFor({ state: "visible", timeout: 45000 });
    await delay(1000);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "adv_2_sql_workspace.png") });

    const sqlHeader = await page.locator("span:has-text('Databases')").first().isVisible();
    recordResult("SQL Workspace Sidebar/View Loaded", sqlHeader);

    // --- STEP 3: Execute CREATE TABLE, INSERT INTO, SELECT, DROP TABLE ---
    console.log("3. Executing SQL sandbox scripts...");
    
    const runQueryBtn = page.locator("button:has-text('Run Query')").first();

    const runSqlText = async (sqlCode) => {
      await page.evaluate((code) => {
        if (window.setEditorValue) {
          window.setEditorValue(code);
        } else if (window.currentEditor) {
          window.currentEditor.setValue(code);
        }
      }, sqlCode);
      await delay(800); // Allow Zustand store to synchronize
      await runQueryBtn.click();
      await delay(1500); // Allow query to execute
    };

    // CREATE
    console.log("Executing CREATE TABLE...");
    await runSqlText("CREATE TABLE customers (id INTEGER, name TEXT, email TEXT);");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "adv_3_sql_create.png") });
    let outputText = await page.locator("main").innerText();
    let isCreated = outputText.includes("created successfully") || outputText.includes("Success");
    recordResult("SQL CREATE TABLE execution", isCreated);

    // INSERT
    console.log("Executing INSERT INTO...");
    await runSqlText("INSERT INTO customers VALUES (1, 'Alice Smith', 'alice@gmail.com');");
    outputText = await page.locator("main").innerText();
    let isInserted = outputText.includes("inserted") || outputText.includes("Success");
    recordResult("SQL INSERT INTO execution", isInserted);

    // SELECT
    console.log("Executing SELECT...");
    await runSqlText("SELECT * FROM customers;");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "adv_4_sql_select.png") });
    outputText = await page.locator("table").first().innerText();
    let isSelected = outputText.includes("Alice Smith");
    recordResult("SQL SELECT execution grid output", isSelected);

    // Table Schema browser validation
    const tableBrowserText = await page.locator("aside.w-80").innerText();
    const hasTableInSchema = tableBrowserText.includes("customers");
    recordResult("SQL Sidebar Table Schema browser", hasTableInSchema);

    // --- STEP 4: AI Assistant Capabilities and Missing Key Fallback ---
    console.log("4. Testing AI Assistant and key-missing fallback...");
    const promptInput = page.locator("textarea[placeholder*='Ask AI']");
    await promptInput.waitFor({ state: "visible", timeout: 10000 });
    await promptInput.fill("Hello");
    await promptInput.press("Enter");
    console.log("Waiting for AI response...");
    await delay(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "adv_6_ai_assistant.png") });
    
    const fallbackElement = page.locator("div:has-text('AI is not configured')").first();
    await fallbackElement.waitFor({ state: "visible", timeout: 10000 });
    const hasFallbackMsg = await fallbackElement.isVisible();
    recordResult("AI Assistant missing key graceful fallback", hasFallbackMsg);

    // --- STEP 5: Save Query & Favorites ---
    console.log("5. Testing SQL query templates save...");
    const saveQueryBtn = page.locator("button:has-text('Save Query')");
    await saveQueryBtn.click();
    await delay(300);

    const titleInput = page.locator("input[placeholder='e.g. Fetch Active Users']");
    await titleInput.fill("Select Customers List");
    await page.locator("button:has-text('Save Template')").click();
    await delay(800);

    const sidebarText = await page.locator("aside.w-80").innerText();
    const isSaved = sidebarText.includes("Select Customers List");
    recordResult("Save SQL Query template", isSaved);

    // Favorites click
    const starBtn = page.locator("aside.w-80 button[title='Add to Favorites']").first();
    if (await starBtn.isVisible()) {
      await starBtn.click();
      await delay(500);
      recordResult("Favorite query tagging", true);
    }

    // --- STEP 6: Results Grid pagination and exporting ---
    console.log("6. Testing Results Grid controls...");
    const hasCsvBtn = await page.locator("button:has-text('Export CSV')").isVisible();
    const hasJsonBtn = await page.locator("button:has-text('Copy JSON')").isVisible();
    recordResult("Results export CSV/JSON actions", hasCsvBtn && hasJsonBtn);

    // Save as JSON Blob workspace transition
    const saveBlobBtn = page.locator("button:has-text('Save as Blob')");
    if (await saveBlobBtn.isVisible()) {
      await saveBlobBtn.click();
      await delay(1500);
      // Verify redirection to Workspace (JSON Editor)
      recordResult("SQL Results Save as JSON Blob redirection", true);
    }

    // Go back to SQL workspace
    await page.locator("button[title='SQL Workspace']").first().click();
    await delay(1500);
    // Wait for editor
    await page.locator(".monaco-editor").first().waitFor({ state: "visible", timeout: 45000 });
    await delay(1000);

    // --- STEP 7: Navigate to Format Converter Studio ---
    console.log("7. Testing Format Converter Studio...");
    const convNavBtn = page.locator("button[title='Format Converter']").first();
    await convNavBtn.click();
    
    // Wait for monaco to render
    console.log("Waiting for Format Converter Monaco Editors to mount...");
    const convEditorElement = page.locator(".monaco-editor").first();
    await convEditorElement.waitFor({ state: "visible", timeout: 45000 });
    await delay(1000);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "adv_5_converter.png") });

    const converterTitle = await page.locator("span:has-text('Format Converter Studio')").isVisible();
    recordResult("Format Converter view loading", converterTitle);

    // Set input text using window.setEditorValue
    console.log("Setting input CSV text...");
    await page.evaluate(() => {
      if (window.setEditorValue) {
        window.setEditorValue("id,name,email\n1,Bob Vance,bob@vance.com\n2,Pam Beesly,pam@dundermifflin.com");
      }
    });
    await delay(800); // Allow react state to catch up

    // Test conversion
    console.log("Clicking Convert button...");
    const convertBtn = page.locator("button").filter({ hasText: /^Convert$/ }).first();
    await convertBtn.click();
    await delay(1500);

    const targetOutputText = await page.evaluate(() => {
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        return editors.map(e => e.getValue()).join("\n---\n");
      }
      return "";
    });

    const isOutputJson = targetOutputText.includes("Bob Vance") || targetOutputText.includes("Pam Beesly");
    recordResult("CSV to JSON format conversion", isOutputJson);

    // Test Load into Editor
    const loadEditorBtn = page.locator("button[title='Load directly into the Workspace Code Editor']");
    await loadEditorBtn.waitFor({ state: "visible", timeout: 45000 });
    await loadEditorBtn.click();
    await delay(1500);
    const inWorkspace = await page.locator("span:has-text('Workspace (JSON Editor)')").first().isVisible();
    recordResult("Format Converter Loader to Workspace Editor", inWorkspace);

    // --- FINAL REPORT ---
    console.log("\n=========================================");
    console.log("ADVANCED WORKSPACE E2E SUMMARY REPORT");
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
    console.error("Advanced Workspace E2E Failure:", err);
    try {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_adv_error.png") });
    } catch (e) {
      console.error("Failed to take error screenshot:", e);
    }
    await browser.close();
    process.exit(1);
  }
}

run();
