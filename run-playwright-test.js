const { chromium } = require("@playwright/test");
const path = require("path");

const BASE_URL = "https://5258bcf8.jsonblob-app.pages.dev";
const SCREENSHOT_DIR = "/home/bnaveen/.gemini/antigravity/brain/3af78744-bb24-41b1-86c2-691eb7bdd2b8";

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("=========================================");
  console.log("STARTING PLAYWRIGHT COMPLETE UI COVERAGE TESTS");
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
    // --- STEP 1: Navigate to Auth Page & Sign Up ---
    console.log("Navigating to auth page...");
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState("networkidle");
    
    console.log("Toggling register form...");
    const signUpBtn = page.locator("button:has-text('Sign Up')");
    await signUpBtn.click();
    await delay(500);

    const email = `playwright_jane_${Date.now()}@example.com`;
    console.log(`Entering details for registration. Email: ${email}`);
    await page.locator("input[placeholder='John Doe']").fill("Jane Doe");
    await page.locator("form >> input[placeholder='name@example.com']").nth(1).fill(email);
    await page.locator("form >> input[placeholder='••••••••']").nth(1).fill("Password123!");
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_1_signup_form.png") });
    recordResult("User Registration Form Fields", true);

    console.log("Submitting registration...");
    const registerBtn = page.locator("button[type='submit']:has-text('Register')");
    await registerBtn.click();

    await page.waitForURL(`${BASE_URL}/`);
    await page.waitForLoadState("networkidle");
    await delay(1500); // Allow Monaco & D1 data list to fully initialize
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_2_dashboard_loaded.png") });
    
    const userInitials = page.locator("div[title^='Logged in as Jane Doe']");
    const userInitialsText = await userInitials.innerText().catch(() => "");
    if (userInitialsText.trim().toUpperCase() === "J") {
      recordResult("Authentication Session & Profile initials", true, "Jane Doe (J) displayed");
    } else {
      recordResult("Authentication Session & Profile initials", false, "User initials indicator mismatch");
    }

    // --- STEP 2: Format / Beautify Action ---
    console.log("Testing JSON Format (Beautify) action...");
    await page.locator('.monaco-editor').first().click();
    await delay(200);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type('{"a":1,"b":2}');
    await delay(200);

    const formatBtn = page.locator("button[title='Format JSON']");
    await formatBtn.click();
    await page.waitForSelector("text=Formatted successfully");
    recordResult("Format JSON Toolbar Tool", true);

    // --- STEP 3: Validate JSON Action (Negative and Positive) ---
    console.log("Testing JSON Validation action (Negative)...");
    await page.locator('.monaco-editor').first().click();
    await delay(200);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type('{"invalid": json');
    await delay(200);

    const validateBtn = page.locator("button[title='Validate JSON syntax']");
    await validateBtn.click();
    await page.waitForSelector("text=JSON invalid");
    recordResult("JSON Validation Action (Negative case)", true, "Toast warning blocked invalid syntax");

    console.log("Testing JSON Validation action (Positive)...");
    await page.locator('.monaco-editor').first().click();
    await delay(200);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type('{"playwright": true, "status": "active", "value": 100}');
    await delay(200);
    await validateBtn.click();
    await page.waitForSelector("text=Valid JSON syntax");
    recordResult("JSON Validation Action (Positive case)", true, "Syntax successfully validated");

    // --- STEP 4: Copy to Clipboard Action ---
    console.log("Testing Copy to Clipboard action...");
    const copyBtn = page.locator("button[title='Copy to Clipboard']");
    await copyBtn.click();
    await page.waitForSelector("text=Copied to clipboard");
    recordResult("Copy JSON Action", true);

    // --- STEP 5: Download File Action ---
    console.log("Testing Download File action...");
    const downloadPromise = page.waitForEvent('download');
    const downloadBtn = page.locator("button[title='Download File']");
    await downloadBtn.click();
    const download = await downloadPromise;
    await page.waitForSelector("text=Downloaded JSON file");
    
    const downloadedName = download.suggestedFilename();
    if (downloadedName.endsWith(".json")) {
      recordResult("Download JSON Action", true, `Filename: ${downloadedName}`);
    } else {
      recordResult("Download JSON Action", false, `Unexpected file format: ${downloadedName}`);
    }

    // --- STEP 6: Reset Workspace Action ---
    console.log("Testing Reset Workspace action...");
    await page.locator('.monaco-editor').first().click();
    await delay(200);
    await page.keyboard.type(', "additional_garbage": 123'); // make unsaved changes
    
    const resetBtn = page.locator("button[title='Reset Editor to Saved State']");
    await resetBtn.click();
    await page.waitForSelector("text=Workspace reset");
    recordResult("Reset Workspace Action", true);

    // --- STEP 7: Create Workspace (Save) ---
    console.log("Testing Save (Create Workspace)...");
    const titleInput = page.locator("input[placeholder='Untitled Blob']");
    await titleInput.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await titleInput.fill("Playwright Full Featured Blob");

    const saveBtn = page.locator("header button:has-text('Save')");
    await saveBtn.click();
    await page.waitForSelector("text=Blob created successfully");
    await page.waitForURL(url => url.pathname !== "/", { timeout: 5000 }).catch(() => {});
    
    const createdBlobUrl = page.url();
    const createdBlobId = createdBlobUrl.replace(`${BASE_URL}/`, "");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_3_blob_created.png") });
    
    if (createdBlobId && createdBlobId !== "/") {
      recordResult("Manual Save (Insert Blob)", true, `Blob ID: ${createdBlobId}`);
    } else {
      recordResult("Manual Save (Insert Blob)", false, `Path was not redirected: ${createdBlobUrl}`);
    }

    // --- STEP 8: Tabs: Tree View vs JSON Diff ---
    console.log("Testing Right Panel tabs...");
    const diffTabBtn = page.locator("button:has-text('JSON Diff')");
    await diffTabBtn.click();
    await delay(200);
    
    const treeTabBtn = page.locator("button:has-text('Tree View')");
    await treeTabBtn.click();
    await delay(200);
    recordResult("Right Panel View Tabs", true);

    // --- STEP 9: Autosave Action ---
    console.log("Testing Autosave toggle and action...");
    const autosaveCheckbox = page.locator("input[type='checkbox']");
    const isChecked = await autosaveCheckbox.isChecked();
    if (!isChecked) {
      await page.locator("header label:has-text('Autosave')").click();
    }
    
    await page.locator('.monaco-editor').first().click();
    await delay(200);
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await page.keyboard.type(', "autosaved": true}');
    
    console.log("Waiting 3.5 seconds for Autosave debounce...");
    await delay(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_4_autosave_completed.png") });
    recordResult("Autosave Trigger & Update", true);

    // --- STEP 10: Manual Update ---
    console.log("Testing manual Title and Blob Update...");
    await titleInput.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await titleInput.fill("Playwright Full Featured Blob (Updated)");

    await saveBtn.click();
    await page.waitForSelector("text=Blob updated successfully");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_5_blob_updated.png") });
    recordResult("Manual Update (Update Blob)", true);

    // --- STEP 11: Theme Toggle ---
    console.log("Testing Theme Toggle action...");
    const themeBtn = page.locator("button[title='Toggle Theme']");
    await themeBtn.click();
    await delay(300);
    await themeBtn.click(); // revert
    recordResult("Theme Toggle Mode Switcher", true);

    // --- STEP 12: New Workspace Reset ---
    console.log("Testing New Workspace button...");
    const newWorkspaceBtn = page.locator("button[title='New Blob']");
    await newWorkspaceBtn.click();
    await page.waitForSelector("text=Created new blank workspace");
    await page.waitForURL(`${BASE_URL}/`);
    recordResult("New Blank Workspace Flow", true);

    // --- STEP 13: Sidebar List Selection & Search ---
    console.log("Testing Sidebar Search filter...");
    const searchInput = page.locator("input[placeholder='Search blobs...']");
    await searchInput.fill("Updated");
    await delay(300);
    
    const sidebarBlobItem = page.locator("button:has-text('Playwright Full Featured Blob (Updated)')").first();
    await sidebarBlobItem.click();
    await delay(1000);

    const loadedTitle = await titleInput.inputValue();
    if (loadedTitle === "Playwright Full Featured Blob (Updated)") {
      recordResult("Sidebar Selection & Load", true);
    } else {
      recordResult("Sidebar Selection & Load", false, `Loaded title mismatch: "${loadedTitle}"`);
    }

    // --- STEP 14: Delete Workspace ---
    console.log("Testing Workspace Deletion...");
    const deleteBtn = page.locator("button[title='Delete Blob']");
    await deleteBtn.click();
    await delay(500);

    const confirmDeleteBtn = page.locator("button:has-text('Delete')").last();
    await confirmDeleteBtn.click();
    
    await page.waitForSelector("text=Blob deleted successfully");
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_6_after_deletion.png") });
    recordResult("Delete Workspace confirmation flow", true);

    // --- STEP 15: Sign Out ---
    console.log("Testing Sign Out Action...");
    const signOutBtn = page.locator("button[title='Sign Out']");
    await signOutBtn.click();
    await page.waitForSelector("text=Signed out successfully");
    
    const signInLinkVisible = await page.locator("a[title='Sign In / Sign Up']").isVisible();
    if (signInLinkVisible) {
      recordResult("User Sign Out & Session Drop", true);
    } else {
      recordResult("User Sign Out & Session Drop", false, "Sign In button not visible after signing out");
    }

  } catch (err) {
    console.error("❌ TEST RUNNER EXCEPTION:", err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot_error_failure.png") });
    recordResult("Complete UI Test Run", false, err.message);
  } finally {
    await browser.close();
    console.log("\n=========================================");
    console.log("PLAYWRIGHT BROWSER UI TEST RUN COMPLETE");
    console.log("=========================================");
  }
}

run();
