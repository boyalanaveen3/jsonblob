const { chromium } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("=========================================");
  console.log("STARTING MULTI-TENANT ISOLATION E2E TESTS");
  console.log("Target Domain:", BASE_URL);
  console.log("=========================================\n");

  const browser = await chromium.launch({ headless: true });
  
  // Use separate contexts to ensure clean cookies/sessions
  const contextA = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const pageA = await contextA.newPage();

  const contextB = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const pageB = await contextB.newPage();

  const results = [];
  function recordResult(testName, passed, details = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  try {
    // 1. Check Logged-out view
    console.log("Checking logged-out view...");
    await pageA.goto(BASE_URL);
    await pageA.waitForLoadState("networkidle");
    await delay(1000);

    const loginPromptVisible = await pageA.locator("text=Sign in to save and sync your JSON blobs").isVisible();
    const templateVisible = await pageA.locator("button:has-text('Simple Key-Value')").isVisible();
    if (loginPromptVisible && templateVisible) {
      recordResult("Logged-out Sidebar View", true, "Templates and sign-in prompt displayed correctly");
    } else {
      recordResult("Logged-out Sidebar View", false, `Login prompt: ${loginPromptVisible}, Templates: ${templateVisible}`);
    }

    // 2. Register User A
    console.log("Registering User A...");
    await pageA.goto(`${BASE_URL}/auth`);
    await pageA.waitForLoadState("networkidle");
    await pageA.locator("button:has-text('Sign Up')").click();
    await delay(500);

    const emailA = `usera_${Date.now()}@example.com`;
    await pageA.locator("input[placeholder='John Doe']").fill("User A");
    await pageA.locator("form >> input[placeholder='name@example.com']").nth(1).fill(emailA);
    await pageA.locator("form >> input[placeholder='••••••••']").nth(1).fill("Password123!");
    await pageA.locator("button[type='submit']:has-text('Register')").click();

    await pageA.waitForURL(`${BASE_URL}/`);
    await pageA.waitForLoadState("networkidle");
    await delay(1500);

    // Verify empty state for User A
    const noBlobsA = await pageA.locator("text=No blobs yet").isVisible();
    recordResult("User A Empty State", noBlobsA, "User A sees 'No blobs yet' upon registration");

    // Create User A private blob
    console.log("Creating private blob for User A...");
    const titleInputA = pageA.locator("input[placeholder='Untitled Blob']");
    await titleInputA.click();
    await pageA.keyboard.press("Control+A");
    await pageA.keyboard.press("Backspace");
    await titleInputA.fill("User A Private Blob");

    await pageA.locator('.monaco-editor').first().click();
    await delay(200);
    await pageA.keyboard.press("Control+A");
    await pageA.keyboard.press("Backspace");
    await pageA.keyboard.type('{"owner": "User A", "secret": "AAA"}');
    await delay(200);

    await pageA.locator("header button:has-text('Save')").click();
    await pageA.waitForSelector("text=Blob created successfully");
    await delay(1000);
    recordResult("User A Blob Creation", true);

    // 3. Register User B (in clean contextB)
    console.log("Registering User B...");
    await pageB.goto(`${BASE_URL}/auth`);
    await pageB.waitForLoadState("networkidle");
    await pageB.locator("button:has-text('Sign Up')").click();
    await delay(500);

    const emailB = `userb_${Date.now()}@example.com`;
    await pageB.locator("input[placeholder='John Doe']").fill("User B");
    await pageB.locator("form >> input[placeholder='name@example.com']").nth(1).fill(emailB);
    await pageB.locator("form >> input[placeholder='••••••••']").nth(1).fill("Password123!");
    await pageB.locator("button[type='submit']:has-text('Register')").click();

    await pageB.waitForURL(`${BASE_URL}/`);
    await pageB.waitForLoadState("networkidle");
    await delay(1500);

    // Verify User B does NOT see User A's private blob
    const userABlobVisibleToB = await pageB.locator("button:has-text('User A Private Blob')").isVisible();
    recordResult("Data Isolation Check (User B cannot see User A data)", !userABlobVisibleToB, "User B's sidebar does not contain User A's private blob");

    // Verify empty state for User B
    const noBlobsB = await pageB.locator("text=No blobs yet").isVisible();
    recordResult("User B Empty State", noBlobsB, "User B sees 'No blobs yet'");

    // Create User B private blob
    console.log("Creating private blob for User B...");
    const titleInputB = pageB.locator("input[placeholder='Untitled Blob']");
    await titleInputB.click();
    await pageB.keyboard.press("Control+A");
    await pageB.keyboard.press("Backspace");
    await titleInputB.fill("User B Private Blob");

    await pageB.locator('.monaco-editor').first().click();
    await delay(200);
    await pageB.keyboard.press("Control+A");
    await pageB.keyboard.press("Backspace");
    await pageB.keyboard.type('{"owner": "User B", "secret": "BBB"}');
    await delay(200);

    await pageB.locator("header button:has-text('Save')").click();
    await pageB.waitForSelector("text=Blob created successfully");
    await delay(1000);
    recordResult("User B Blob Creation", true);

    // 4. Verify User A cannot see User B's blob (refreshed pageA)
    console.log("Refreshing User A dashboard...");
    await pageA.reload();
    await pageA.waitForLoadState("networkidle");
    await delay(1500);

    const userBBlobVisibleToA = await pageA.locator("button:has-text('User B Private Blob')").isVisible();
    const userABlobVisibleToA = await pageA.locator("button:has-text('User A Private Blob')").isVisible();
    recordResult("Data Isolation Check (User A cannot see User B data)", !userBBlobVisibleToA, "User A does not see User B's blob");
    recordResult("User A private blob visibility", userABlobVisibleToA, "User A sees their own blob");

  } catch (err) {
    console.error("❌ E2E EXCEPTION:", err);
    recordResult("Isolation E2E Execution", false, err.message);
  } finally {
    await browser.close();
    console.log("\n=========================================");
    console.log("MULTI-TENANT ISOLATION E2E TEST COMPLETE");
    console.log("=========================================");
  }
}

run();
