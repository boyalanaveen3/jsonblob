import {
  getStorageBucket,
  generateObjectKey,
  uploadJson,
  downloadJson,
  deleteObject,
  copyObject,
} from "@/lib/services/storageService";

export interface R2SaveResult {
  storageKey: string;
  storageType: "r2" | "d1";
  sizeBytes: string;
}

export { getStorageBucket as getR2Bucket };

/**
 * Saves JSON blob content to Cloudflare R2 object storage (devworkspace bucket)
 * using key structure: blobs/{userId}/{blobId}.json
 */
export async function saveBlobToR2(id: string, content: string, userId: string = "default-user"): Promise<R2SaveResult> {
  const key = generateObjectKey("blob", { userId, blobId: id });
  const uploadRes = await uploadJson(key, content, {
    blobId: id,
    userId,
    savedAt: new Date().toISOString(),
  });

  return {
    storageKey: uploadRes.key,
    storageType: uploadRes.storageType,
    sizeBytes: uploadRes.size.toString(),
  };
}

/**
 * Retrieves blob payload content. If stored in R2, fetches directly from Cloudflare R2 bucket.
 * Otherwise falls back to inline content stored in D1.
 */
export async function getBlobContent(
  storageType: string | null | undefined,
  storageKey: string | null | undefined,
  fallbackContent: string
): Promise<string> {
  if (storageType === "r2" && storageKey) {
    const data = await downloadJson(storageKey);
    if (data !== null) {
      return typeof data === "string" ? data : JSON.stringify(data, null, 2);
    }
  }

  return fallbackContent;
}

/**
 * Deletes blob object payload from Cloudflare R2 storage if stored in R2.
 */
export async function deleteBlobFromR2(storageKey: string | null | undefined): Promise<void> {
  if (storageKey) {
    await deleteObject(storageKey);
  }
}

/**
 * Duplicates a blob object inside R2 storage.
 */
export async function duplicateBlobInR2(
  srcKey: string | null | undefined,
  newId: string,
  userId: string = "default-user"
): Promise<R2SaveResult> {
  const newKey = generateObjectKey("blob", { userId, blobId: newId });

  if (srcKey) {
    const success = await copyObject(srcKey, newKey);
    if (success) {
      return {
        storageKey: newKey,
        storageType: "r2",
        sizeBytes: "0",
      };
    }
  }

  return {
    storageKey: newKey,
    storageType: "d1",
    sizeBytes: "0",
  };
}

/**
 * Saves project source ZIP file to R2: projects/{projectId}/source/project.zip
 */
export async function saveProjectSourceToR2(projectId: string, zipData: ArrayBuffer | Uint8Array | Buffer): Promise<R2SaveResult> {
  const key = generateObjectKey("test_project_source", { projectId });
  const uploadRes = await uploadJson(key, zipData as any, {
    projectId,
    type: "source_zip",
    savedAt: new Date().toISOString(),
  });
  return {
    storageKey: uploadRes.key,
    storageType: uploadRes.storageType,
    sizeBytes: uploadRes.size.toString(),
  };
}

/**
 * Saves test case code to R2: projects/{projectId}/tests/{platform}/{testCaseId}.(spec.ts|yaml)
 */
export async function saveTestCaseFileToR2(
  projectId: string,
  testCaseId: string,
  platform: "web" | "mobile",
  code: string
): Promise<R2SaveResult> {
  const key = generateObjectKey("test_case_file", { projectId, testCaseId, platform });
  const uploadRes = await uploadJson(key, code, {
    projectId,
    testCaseId,
    platform,
    savedAt: new Date().toISOString(),
  });
  return {
    storageKey: uploadRes.key,
    storageType: uploadRes.storageType,
    sizeBytes: uploadRes.size.toString(),
  };
}

/**
 * Saves a test run artifact (report, screenshot, video, trace, log) to R2.
 */
export async function saveRunArtifactToR2(
  runId: string,
  artifactType: string,
  fileName: string,
  content: string | ArrayBuffer | Uint8Array,
  contentType: string = "application/json"
): Promise<R2SaveResult> {
  const key = generateObjectKey("test_run_artifact", { runId, artifactType, fileName });
  const uploadRes = await uploadJson(key, content as any, {
    runId,
    artifactType,
    fileName,
    contentType,
    savedAt: new Date().toISOString(),
  });
  return {
    storageKey: uploadRes.key,
    storageType: uploadRes.storageType,
    sizeBytes: uploadRes.size.toString(),
  };
}

/**
 * Fetches test case code from R2 or fallback.
 */
export async function getTestCaseFileFromR2(storageKey: string | null | undefined, fallbackCode: string = ""): Promise<string> {
  if (storageKey) {
    const data = await downloadJson(storageKey);
    if (data !== null) {
      return typeof data === "string" ? data : JSON.stringify(data, null, 2);
    }
  }
  return fallbackCode;
}

