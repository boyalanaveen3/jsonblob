import { signUpAction, signInAction } from "./actions/auth";

async function testAuth() {
  console.log("=========================================");
  console.log("STARTING AUTH SERVER ACTIONS INTEGRATION TESTS");
  console.log("=========================================\n");

  const email = `test_auth_${Date.now()}@example.com`;
  const password = "Password123!";
  const name = "Jane Doe";

  // Set NODE_ENV to development so the local Wrangler proxy is used
  (process.env as any).NODE_ENV = "development";

  const results: any[] = [];
  function recordResult(testName: string, passed: boolean, details: string = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  // --- TEST 1: Register User ---
  try {
    const signupRes = await signUpAction(name, email, password);
    if (signupRes.success && signupRes.user && signupRes.user.name === name) {
      recordResult("Sign Up Action (New User)", true, `Registered email: ${signupRes.user.email}`);
    } else {
      recordResult("Sign Up Action (New User)", false, signupRes.error || "Failed to register");
    }
  } catch (err: any) {
    recordResult("Sign Up Action (New User)", false, err.message);
  }

  // --- TEST 2: Register Existing User (Email Duplication) ---
  try {
    const signupRes = await signUpAction(name, email, password);
    if (!signupRes.success && signupRes.error === "Email is already registered") {
      recordResult("Sign Up Action (Duplicate Email Validation)", true, signupRes.error);
    } else {
      recordResult("Sign Up Action (Duplicate Email Validation)", false, "Expected error message");
    }
  } catch (err: any) {
    recordResult("Sign Up Action (Duplicate Email Validation)", false, err.message);
  }

  // --- TEST 3: Login with Correct Password ---
  try {
    const loginRes = await signInAction(email, password);
    if (loginRes.success && loginRes.user && loginRes.user.email === email) {
      recordResult("Sign In Action (Correct Credentials)", true, `Logged in: ${loginRes.user.name}`);
    } else {
      recordResult("Sign In Action (Correct Credentials)", false, loginRes.error || "Failed to log in");
    }
  } catch (err: any) {
    recordResult("Sign In Action (Correct Credentials)", false, err.message);
  }

  // --- TEST 4: Login with Incorrect Password ---
  try {
    const loginRes = await signInAction(email, "WrongPassword!");
    if (!loginRes.success && loginRes.error === "Invalid email or password") {
      recordResult("Sign In Action (Incorrect Password Validation)", true, loginRes.error);
    } else {
      recordResult("Sign In Action (Incorrect Password Validation)", false, "Expected validation failure");
    }
  } catch (err: any) {
    recordResult("Sign In Action (Incorrect Password Validation)", false, err.message);
  }

  console.log("\n=========================================");
  console.log("FINAL AUTH TEST REPORT");
  console.log("=========================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed:         ${passed}`);
  console.log(`Failed:         ${failed}`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

testAuth();
