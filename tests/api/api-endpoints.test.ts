import { createBlobAction, getBlobAction, deleteBlobAction } from "@/actions/blobs";
import {
  createCollectionAction,
  getCollectionsAction,
  deleteCollectionAction,
  saveApiRequestHistoryAction,
  getApiRequestHistoryAction,
} from "@/actions/apiStudio";

async function runApiTests() {
  (process.env as any).NODE_ENV = "development";
  console.log("=========================================");
  console.log("STARTING API ENDPOINTS & ACTIONS VERIFICATION TEST");
  console.log("=========================================\n");

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

  // ----------------------------------------------------
  // 1. JSON Blob Actions Lifecycle (Create, Read, Delete)
  // ----------------------------------------------------
  console.log("--- 1. Testing JSON Blob Lifecycle Actions ---");
  try {
    const title = "API Test JSON Blob";
    const content = JSON.stringify({ name: "API Studio Test", timestamp: Date.now() }, null, 2);

    const createRes = await createBlobAction(title, content);
    assert(createRes.success === true && !!createRes.blob?.id, "createBlobAction created blob successfully");

    if (createRes.blob?.id) {
      const blobId = createRes.blob.id;

      // Read Blob
      const readBlob = await getBlobAction(blobId);
      assert(readBlob !== null && readBlob.id === blobId, "getBlobAction retrieved created blob metadata");
      assert(Boolean(readBlob?.content.includes("API Studio Test")), "getBlobAction retrieved payload content from Cloudflare R2");

      // Delete Blob
      const delRes = await deleteBlobAction(blobId);
      assert(delRes.success === true, "deleteBlobAction purged blob from R2 and D1");

      // Verify Deletion
      const postDelBlob = await getBlobAction(blobId);
      assert(postDelBlob === null, "Verified blob no longer exists after deletion");
    }
  } catch (err: any) {
    console.error("Error testing JSON Blob actions:", err.message);
    assert(false, `JSON Blob action test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // 2. API Studio Actions Lifecycle (Collection & History)
  // ----------------------------------------------------
  console.log("\n--- 2. Testing API Studio Actions Lifecycle ---");
  try {
    const colRes = await createCollectionAction("API Test Collection", "Integration verification collection", "#3b82f6", "Folder", "default-workspace");
    assert(colRes.success === true && !!colRes.collection?.id, "createCollectionAction created API collection in D1");

    if (colRes.collection?.id) {
      const collectionId = colRes.collection.id;

      // List Collections
      const cols = await getCollectionsAction("default-workspace");
      assert(cols.some(c => c.id === collectionId), "getCollectionsAction retrieved created collection from D1");

      // Request History Persistence (D1 Metadata + R2 Body)
      const requestId = crypto.randomUUID();
      const responseBody = JSON.stringify({ status: "success", data: [1, 2, 3] });
      const histRes = await saveApiRequestHistoryAction(requestId, "200", "120ms", responseBody, collectionId, "default-workspace", "API History Request", "POST", "https://api.example.com/test");
      assert(histRes.success === true && !!histRes.historyItem?.id, "saveApiRequestHistoryAction persisted history metadata (D1) and response (R2)");

      if (histRes.historyItem?.id) {
        const historyList = await getApiRequestHistoryAction(requestId);
        assert(historyList.length > 0, "getApiRequestHistoryAction retrieved history log from D1");
        assert(Boolean(historyList[0]?.responseBody?.includes("success")), "History response body retrieved from Cloudflare R2");
      }

      // Delete Collection
      const delColRes = await deleteCollectionAction(collectionId);
      assert(delColRes.success === true, "deleteCollectionAction purged collection from D1");
    }
  } catch (err: any) {
    console.error("Error testing API Studio actions:", err.message);
    assert(false, `API Studio action test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // SUMMARY REPORT
  // ----------------------------------------------------
  console.log("\n=========================================");
  console.log("API ENDPOINTS & ACTIONS TEST REPORT");
  console.log("=========================================");
  console.log(`Total Tests Run: ${passed + failed}`);
  console.log(`Passed:         ${passed}`);
  console.log(`Failed:         ${failed}`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runApiTests();
