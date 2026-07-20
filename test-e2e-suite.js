const BASE_URL = "https://2e4f009d.jsonblob-app.pages.dev";

async function runTests() {
  console.log("=========================================");
  console.log("STARTING API END-TO-END INTEGRATION TESTS");
  console.log("Target URL:", BASE_URL);
  console.log("=========================================\n");

  let testBlobId = null;
  const testTitle = "E2E Automated Test Title";
  const testContent = JSON.stringify({ test: "runner", active: true, value: 42 });
  const updatedTitle = "E2E Automated Test Title (Updated)";
  const updatedContent = JSON.stringify({ test: "runner", active: true, value: 99, autosaved: true });

  const results = [];

  function recordResult(testName, passed, details = "") {
    results.push({ testName, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
  }

  // --- TEST 1: Create Blob with Valid JSON ---
  try {
    const res = await fetch(`${BASE_URL}/api/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: testTitle, content: testContent }),
    });
    
    if (res.status === 201) {
      const data = await res.json();
      if (data && data.id && data.title === testTitle && data.content === testContent) {
        testBlobId = data.id;
        recordResult("Create Blob (Valid JSON)", true, `ID: ${testBlobId}`);
      } else {
        recordResult("Create Blob (Valid JSON)", false, "Response structure mismatch");
      }
    } else {
      recordResult("Create Blob (Valid JSON)", false, `HTTP Status: ${res.status}`);
    }
  } catch (err) {
    recordResult("Create Blob (Valid JSON)", false, err.message);
  }

  // --- TEST 2: Create Blob with Invalid JSON ---
  try {
    const res = await fetch(`${BASE_URL}/api/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Bad JSON", content: "{ invalid json" }),
    });
    if (res.status === 400) {
      const data = await res.json();
      recordResult("Create Blob Validation (Invalid JSON)", true, `Status 400. Message: "${data.error}"`);
    } else {
      recordResult("Create Blob Validation (Invalid JSON)", false, `Expected 400, got ${res.status}`);
    }
  } catch (err) {
    recordResult("Create Blob Validation (Invalid JSON)", false, err.message);
  }

  // --- TEST 3: Create Blob with Missing Fields ---
  try {
    const res = await fetch(`${BASE_URL}/api/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", content: "{}" }),
    });
    if (res.status === 400) {
      const data = await res.json();
      recordResult("Create Blob Validation (Empty Title)", true, `Status 400. Message: "${data.error}"`);
    } else {
      recordResult("Create Blob Validation (Empty Title)", false, `Expected 400, got ${res.status}`);
    }
  } catch (err) {
    recordResult("Create Blob Validation (Empty Title)", false, err.message);
  }

  // --- TEST 4: Fetch Created Blob by ID ---
  if (testBlobId) {
    try {
      const res = await fetch(`${BASE_URL}/api/blobs/${testBlobId}`);
      if (res.status === 200) {
        const data = await res.json();
        if (data && data.id === testBlobId && data.content === testContent) {
          recordResult("Fetch Single Blob", true);
        } else {
          recordResult("Fetch Single Blob", false, "Returned blob fields mismatch");
        }
      } else {
        recordResult("Fetch Single Blob", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Fetch Single Blob", false, err.message);
    }
  } else {
    recordResult("Fetch Single Blob", false, "Skipped: No test blob created");
  }

  // --- TEST 5: Fetch All Blobs & Verify Presence ---
  if (testBlobId) {
    try {
      const res = await fetch(`${BASE_URL}/api/blobs`);
      if (res.status === 200) {
        const data = await res.json();
        const found = data.some(b => b.id === testBlobId);
        if (found) {
          recordResult("Fetch Blobs List & Verify Presence", true, `Found in list of ${data.length} blobs`);
        } else {
          recordResult("Fetch Blobs List & Verify Presence", false, "Created blob ID missing in list");
        }
      } else {
        recordResult("Fetch Blobs List & Verify Presence", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Fetch Blobs List & Verify Presence", false, err.message);
    }
  } else {
    recordResult("Fetch Blobs List & Verify Presence", false, "Skipped: No test blob created");
  }

  // --- TEST 6: Update Blob with Valid Content (Autosave/Manual Save) ---
  if (testBlobId) {
    try {
      const res = await fetch(`${BASE_URL}/api/blobs/${testBlobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: updatedTitle, content: updatedContent }),
      });
      if (res.status === 200) {
        const data = await res.json();
        if (data && data.id === testBlobId && data.title === updatedTitle && data.content === updatedContent) {
          recordResult("Update Blob (Valid Update / Autosave)", true);
        } else {
          recordResult("Update Blob (Valid Update / Autosave)", false, "Response updated fields mismatch");
        }
      } else {
        recordResult("Update Blob (Valid Update / Autosave)", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Update Blob (Valid Update / Autosave)", false, err.message);
    }
  } else {
    recordResult("Update Blob (Valid Update / Autosave)", false, "Skipped: No test blob created");
  }

  // --- TEST 7: Update Blob with Invalid JSON ---
  if (testBlobId) {
    try {
      const res = await fetch(`${BASE_URL}/api/blobs/${testBlobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: updatedTitle, content: "{ invalid json" }),
      });
      if (res.status === 400) {
        const data = await res.json();
        recordResult("Update Blob Validation (Invalid JSON)", true, `Status 400. Message: "${data.error}"`);
      } else {
        recordResult("Update Blob Validation (Invalid JSON)", false, `Expected 400, got ${res.status}`);
      }
    } catch (err) {
      recordResult("Update Blob Validation (Invalid JSON)", false, err.message);
    }
  } else {
    recordResult("Update Blob Validation (Invalid JSON)", false, "Skipped: No test blob created");
  }

  // --- TEST 8: Delete Blob ---
  if (testBlobId) {
    try {
      const res = await fetch(`${BASE_URL}/api/blobs/${testBlobId}`, {
        method: "DELETE",
      });
      if (res.status === 200) {
        const data = await res.json();
        if (data && data.success === true) {
          recordResult("Delete Blob", true);
        } else {
          recordResult("Delete Blob", false, "Response field 'success' was not true");
        }
      } else {
        recordResult("Delete Blob", false, `HTTP Status: ${res.status}`);
      }
    } catch (err) {
      recordResult("Delete Blob", false, err.message);
    }
  } else {
    recordResult("Delete Blob", false, "Skipped: No test blob created");
  }

  // --- TEST 9: Verify Deletion (Fetch Deleted ID) ---
  if (testBlobId) {
    try {
      const res = await fetch(`${BASE_URL}/api/blobs/${testBlobId}`);
      if (res.status === 404) {
        recordResult("Verify Blob Deletion", true, "Fetching deleted ID correctly returned 404 Not Found");
      } else {
        recordResult("Verify Blob Deletion", false, `Expected 404, got ${res.status}`);
      }
    } catch (err) {
      recordResult("Verify Blob Deletion", false, err.message);
    }
  } else {
    recordResult("Verify Blob Deletion", false, "Skipped: No test blob created");
  }

  // --- PRINT SUMMARY REPORT ---
  console.log("\n=========================================");
  console.log("FINAL INTEGRATION TEST REPORT");
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
