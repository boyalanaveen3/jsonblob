import {
  createCollectionAction,
  getCollectionsAction,
  createFolderAction,
  saveApiRequestAction,
  getApiRequestFullAction,
  deleteCollectionAction,
} from "@/actions/apiStudio";
import { exists, download } from "@/lib/services/storageService";

async function testApiStudio() {
  (process.env as any).NODE_ENV = "development";
  console.log("=== STARTING API STUDIO STORAGE ARCHITECTURE VERIFICATION TEST ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const wsId = "default-workspace";

    // 1. Create Collection
    console.log("\n--- 1. Testing Collection Creation in D1 ---");
    const colRes = await createCollectionAction("Test API Collection", "Verification test collection", "#3b82f6", "Folder", wsId);
    assert(colRes.success && !!colRes.collection, "Collection created successfully");
    const collectionId = colRes.collection!.id;

    // 2. Create Folder
    console.log("\n--- 2. Testing Folder Creation in D1 ---");
    const folderRes = await createFolderAction(collectionId, "Auth Endpoints");
    assert(folderRes.success && !!folderRes.folder, "Folder created successfully");

    // 3. Create/Save API Request with Payloads (Body, Headers, Scripts) in R2
    console.log("\n--- 3. Testing API Request Persistence (D1 Metadata + R2 Payloads) ---");
    const reqPayload = {
      collectionId,
      folderId: folderRes.folder!.id,
      name: "User Login Request",
      method: "POST",
      endpoint: "https://api.example.com/v1/auth/login",
      description: "Performs user authentication",
      headers: [
        { key: "Content-Type", value: "application/json", enabled: true },
        { key: "Authorization", value: "Bearer token-123", enabled: true },
      ],
      params: [{ key: "source", value: "web", enabled: true }],
      authType: "bearer",
      authConfig: { token: "secret-bearer-token" },
      bodyType: "json",
      body: JSON.stringify({ email: "user@example.com", password: "securepassword" }, null, 2),
      scripts: "// Pre-request script\nconsole.log('Sending auth request...');",
      tests: "// Test script\npm.test('Status code is 200', function() { pm.response.to.have.status(200); });",
    };

    const saveReqRes = await saveApiRequestAction(reqPayload);
    assert(saveReqRes.success && !!saveReqRes.request, "API Request created & metadata saved in D1");
    const requestId = saveReqRes.request!.id;

    // 4. Verify R2 Objects Exist for Request Body, Headers, Scripts, Tests
    console.log("\n--- 4. Testing R2 Payload Files Existence & Verification ---");
    const reqFull = await getApiRequestFullAction(requestId);
    assert(reqFull.request !== null, "getApiRequestFullAction retrieved request metadata from D1");
    assert(reqFull.payloads.body.includes("user@example.com"), "Retrieved body payload from Cloudflare R2");
    assert(reqFull.payloads.headers.length === 2, "Retrieved headers payload array from Cloudflare R2");
    assert(reqFull.payloads.scripts.includes("Sending auth request"), "Retrieved pre-request scripts payload from Cloudflare R2");
    assert(reqFull.payloads.tests.includes("Status code is 200"), "Retrieved test scripts payload from Cloudflare R2");

    // Check individual R2 object keys directly via storage service
    const bodyKey = reqFull.request!.bodyObjectKey!;
    const bodyExists = await exists(bodyKey);
    assert(bodyExists === true, `R2 Body object exists at key '${bodyKey}'`);

    const downloadedBody = await download<any>(bodyKey);
    assert(downloadedBody !== null && JSON.stringify(downloadedBody).includes("user@example.com"), "Direct R2 download verified object integrity");

    // 5. Cleanup Collection & Verify R2 Deletion
    console.log("\n--- 5. Testing Cascade Deletion & R2 Payload Cleanup ---");
    const delRes = await deleteCollectionAction(collectionId);
    assert(delRes.success === true, "Collection and associated requests deleted");

    const postDelBodyExists = await exists(bodyKey);
    assert(postDelBodyExists === false, "Cascade delete cleanly purged associated R2 objects!");

    console.log(`\n================ API STUDIO VERIFICATION SUMMARY ================`);
    console.log(`Total Tests Passed: ${passed}`);
    console.log(`Total Tests Failed: ${failed}`);

    if (failed === 0) {
      console.log(`🎉 ALL API STUDIO STORAGE TESTS PASSED!`);
      process.exit(0);
    } else {
      console.error(`🚨 SOME API STUDIO TESTS FAILED!`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Fatal API Studio test execution error:", err);
    process.exit(1);
  }
}

testApiStudio();
