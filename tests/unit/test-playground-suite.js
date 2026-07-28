const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runTests() {
  console.log("=========================================");
  console.log("STARTING PLAYGROUND API END-TO-END TESTS");
  console.log("Target URL:", BASE_URL);
  console.log("=========================================\n");

  let testSnippetId = null;
  const testTitle = "Playground E2E Test Code";
  const testContent = "console.log('Hello E2E Test');";
  const updatedTitle = "Playground E2E Test Code (Updated)";
  const updatedContent = "console.log('Hello E2E Test updated');";

  const results = [];

  function recordResult(testName, passed, details = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  // --- TEST 1: Create Snippet ---
  try {
    const res = await fetch(`${BASE_URL}/api/snippets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: testTitle, language: "javascript", content: testContent }),
    });
    
    if (res.status === 201) {
      const data = await res.json();
      if (data && data.id && data.title === testTitle && data.content === testContent) {
        testSnippetId = data.id;
        recordResult("Create Snippet (JavaScript)", true, `ID: ${testSnippetId}`);
      } else {
        recordResult("Create Snippet (JavaScript)", false, "Response structure mismatch");
      }
    } else {
      recordResult("Create Snippet (JavaScript)", false, `HTTP Status: ${res.status}`);
    }
  } catch (err) {
    recordResult("Create Snippet (JavaScript)", false, err.message);
  }

  // --- TEST 2: Validation Checks ---
  try {
    const res = await fetch(`${BASE_URL}/api/snippets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", language: "javascript", content: "" }),
    });
    if (res.status === 400) {
      const data = await res.json();
      recordResult("Create Snippet Validation (Empty Title)", true, `Status 400. Message: "${data.error}"`);
    } else {
      recordResult("Create Snippet Validation (Empty Title)", false, `Expected 400, got ${res.status}`);
    }
  } catch (err) {
    recordResult("Create Snippet Validation (Empty Title)", false, err.message);
  }

  // --- TEST 3: Fetch Snippet by ID ---
  if (testSnippetId) {
    try {
      const res = await fetch(`${BASE_URL}/api/snippets/${testSnippetId}`);
      if (res.status === 200) {
        const data = await res.json();
        if (data && data.id === testSnippetId && data.content === testContent) {
          recordResult("Fetch Single Snippet", true);
        } else {
          recordResult("Fetch Single Snippet", false, "Returned snippet fields mismatch");
        }
      } else {
        recordResult("Fetch Single Snippet", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Fetch Single Snippet", false, err.message);
    }
  } else {
    recordResult("Fetch Single Snippet", false, "Skipped: No test snippet created");
  }

  // --- TEST 4: Fetch All Snippets ---
  if (testSnippetId) {
    try {
      const res = await fetch(`${BASE_URL}/api/snippets`);
      if (res.status === 200) {
        const data = await res.json();
        const found = data.some(s => s.id === testSnippetId);
        if (found) {
          recordResult("Fetch Snippets List & Verify Presence", true, `Found in list of ${data.length} snippets`);
        } else {
          recordResult("Fetch Snippets List & Verify Presence", false, "Created snippet ID missing in list");
        }
      } else {
        recordResult("Fetch Snippets List & Verify Presence", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Fetch Snippets List & Verify Presence", false, err.message);
    }
  } else {
    recordResult("Fetch Snippets List & Verify Presence", false, "Skipped: No test snippet created");
  }

  // --- TEST 5: Update Snippet ---
  if (testSnippetId) {
    try {
      const res = await fetch(`${BASE_URL}/api/snippets/${testSnippetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: updatedTitle, language: "javascript", content: updatedContent }),
      });
      if (res.status === 200) {
        const data = await res.json();
        if (data && data.id === testSnippetId && data.title === updatedTitle && data.content === updatedContent) {
          recordResult("Update Snippet Details", true);
        } else {
          recordResult("Update Snippet Details", false, "Response updated fields mismatch");
        }
      } else {
        recordResult("Update Snippet Details", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Update Snippet Details", false, err.message);
    }
  } else {
    recordResult("Update Snippet Details", false, "Skipped: No test snippet created");
  }

  // --- TEST 6: Delete Snippet ---
  if (testSnippetId) {
    try {
      const res = await fetch(`${BASE_URL}/api/snippets/${testSnippetId}`, {
        method: "DELETE",
      });
      if (res.status === 200) {
        const data = await res.json();
        if (data && data.success === true) {
          recordResult("Delete Snippet Record", true);
        } else {
          recordResult("Delete Snippet Record", false, "Response field 'success' was not true");
        }
      } else {
        recordResult("Delete Snippet Record", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Delete Snippet Record", false, err.message);
    }
  } else {
    recordResult("Delete Snippet Record", false, "Skipped: No test snippet created");
  }

  // --- TEST 7: Verify Deletion ---
  if (testSnippetId) {
    try {
      const res = await fetch(`${BASE_URL}/api/snippets/${testSnippetId}`);
      if (res.status === 404) {
        recordResult("Verify Snippet Deletion status", true);
      } else {
        recordResult("Verify Snippet Deletion status", false, `Expected 404, got ${res.status}`);
      }
    } catch (err) {
      recordResult("Verify Snippet Deletion status", false, err.message);
    }
  } else {
    recordResult("Verify Snippet Deletion status", false, "Skipped: No test snippet created");
  }

  // --- PRINT SUMMARY REPORT ---
  console.log("\n=========================================");
  console.log("PLAYGROUND API TEST REPORT COMPLETE");
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

runTests();
