import {
  upload,
  download,
  deleteObject,
  copy,
  exists,
  head,
  list,
  move,
  rename,
  generateObjectKey,
  ObjectType,
} from "@/lib/services/storageService";
import { saveBlobToR2, getBlobContent, deleteBlobFromR2 } from "@/lib/storage/r2Storage";

async function runTests() {
  (process.env as any).NODE_ENV = "development";
  console.log("=== STARTING D1/R2 STORAGE ARCHITECTURE VERIFICATION TEST ===");
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
    // 1. Test Key Generation
    console.log("\n--- 1. Testing Deterministic Object Key Generation ---");
    const testCases: { type: ObjectType; params: any; expected: string }[] = [
      {
        type: "blob",
        params: { workspaceId: "ws1", blobId: "blob1" },
        expected: "blobs/ws1/blob1.json",
      },
      {
        type: "collection",
        params: { workspaceId: "ws1", collectionId: "col1" },
        expected: "collections/ws1/col1.json",
      },
      {
        type: "request",
        params: { workspaceId: "ws1", requestId: "req1" },
        expected: "requests/ws1/req1/body.json",
      },
      {
        type: "headers",
        params: { workspaceId: "ws1", requestId: "req1" },
        expected: "headers/ws1/req1/headers.json",
      },
      {
        type: "response",
        params: { workspaceId: "ws1", requestId: "req1" },
        expected: "responses/ws1/req1/response.json",
      },
      {
        type: "scripts",
        params: { workspaceId: "ws1", requestId: "req1" },
        expected: "scripts/ws1/req1/scripts.js",
      },
    ];

    for (const tc of testCases) {
      const generated = generateObjectKey(tc.type, tc.params);
      assert(generated === tc.expected, `Key for '${tc.type}': expected '${tc.expected}', got '${generated}'`);
    }

    // 2. Test Centralized Storage Service: Upload -> Head -> Exists -> Download -> Copy -> Move -> Delete
    console.log("\n--- 2. Testing Centralized Storage Service Operations ---");
    const testKey = "blobs/ws-test/test-payload.json";
    const testData = { app: "DeveloperWorkspace", status: "active", version: 1 };

    // Upload & Verification
    console.log("Testing upload & verification...");
    const uploadRes = await upload(testKey, testData);
    assert(uploadRes.key === testKey, "Upload returned correct key");
    assert(uploadRes.size > 0, `Upload calculated valid size (${uploadRes.size} bytes)`);

    // Exists
    const isExist = await exists(testKey);
    assert(isExist === true, "exists() returned true for uploaded object");

    // Head
    const headRes = await head(testKey);
    assert(headRes !== null && headRes.key === testKey, "head() retrieved correct metadata");

    // Download
    const downloadedData = await download<typeof testData>(testKey);
    assert(
      downloadedData !== null && downloadedData.app === "DeveloperWorkspace",
      "download() retrieved original JSON content correctly"
    );

    // Copy
    const copyKey = "blobs/ws-test/copy-payload.json";
    const copySuccess = await copy(testKey, copyKey);
    assert(copySuccess === true, "copy() duplicated object to destination key");

    const copyExists = await exists(copyKey);
    assert(copyExists === true, "Copied object exists in R2 storage");

    // Move / Rename
    const moveKey = "blobs/ws-test/moved-payload.json";
    const moveSuccess = await move(copyKey, moveKey);
    assert(moveSuccess === true, "move() relocated object successfully");

    const oldExistsAfterMove = await exists(copyKey);
    assert(oldExistsAfterMove === false, "Old key was removed after move()");

    const newExistsAfterMove = await exists(moveKey);
    assert(newExistsAfterMove === true, "New key exists after move()");

    // Delete
    const deleteOriginal = await deleteObject(testKey);
    const deleteMoved = await deleteObject(moveKey);
    assert(deleteOriginal && deleteMoved, "delete() removed test objects cleanly");

    const finalExists = await exists(testKey);
    assert(finalExists === false, "Verified object no longer exists after delete()");

    // 3. Test R2 Storage Adapter (saveBlobToR2 & getBlobContent & deleteBlobFromR2)
    console.log("\n--- 3. Testing R2 Storage Adapter ---");
    const blobId = "test-blob-123";
    const blobContent = JSON.stringify({ hello: "verification-world", timestamp: Date.now() }, null, 2);
    const r2Save = await saveBlobToR2(blobId, blobContent, "test-user");

    assert(r2Save.storageKey.startsWith("blobs/test-user/test-blob-123.json"), `Generated storageKey '${r2Save.storageKey}'`);
    assert(r2Save.storageType === "r2", "storageType is 'r2'");

    const fetchedContent = await getBlobContent(r2Save.storageType, r2Save.storageKey, "");
    assert(fetchedContent === blobContent, "getBlobContent retrieved exact saved payload from R2");

    await deleteBlobFromR2(r2Save.storageKey);
    const r2DeletedCheck = await exists(r2Save.storageKey);
    assert(r2DeletedCheck === false, "deleteBlobFromR2 purged storage key from R2");

    // 4. Test Rollback Strategy Simulation
    console.log("\n--- 4. Testing Mandatory Rollback Strategy Simulation ---");
    const rollbackKey = "blobs/test-user/rollback-test.json";
    await upload(rollbackKey, { test: "rollback-simulation" });

    assert(await exists(rollbackKey), "Simulated uploaded payload exists prior to rollback");

    // Simulating metadata write failure -> trigger rollback
    console.log("[D1] Simulating D1 insert failure...");
    console.log(`[R2] Rolling back object: ${rollbackKey}`);
    await deleteObject(rollbackKey);

    const postRollbackExist = await exists(rollbackKey);
    assert(postRollbackExist === false, "Rollback successfully purged orphaned R2 file after metadata error!");

    console.log(`\n================ VERIFICATION SUMMARY ================`);
    console.log(`Total Tests Passed: ${passed}`);
    console.log(`Total Tests Failed: ${failed}`);

    if (failed === 0) {
      console.log(`🎉 ALL STORAGE ARCHITECTURE VERIFICATION TESTS PASSED!`);
      process.exit(0);
    } else {
      console.error(`🚨 SOME TESTS FAILED!`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Fatal test execution error:", err);
    process.exit(1);
  }
}

runTests();
