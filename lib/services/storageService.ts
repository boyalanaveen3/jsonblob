export type ObjectType =
  | "blob"
  | "collection"
  | "collection_body"
  | "collection_headers"
  | "collection_tests"
  | "collection_scripts"
  | "collection_response"
  | "request"
  | "request_body"
  | "response"
  | "response_body"
  | "headers"
  | "scripts"
  | "import"
  | "imports"
  | "export"
  | "exports"
  | "backup"
  | "backups"
  | "version"
  | "versions"
  | "image"
  | "images"
  | "attachment"
  | "attachments"
  | "trash"
  | "future"
  | "test_project_source"
  | "test_case_file"
  | "test_run_artifact";

export interface KeyParams {
  userId?: string;
  blobId?: string;
  workspaceId?: string;
  collectionId?: string;
  requestId?: string;
  importId?: string;
  exportId?: string;
  backupId?: string;
  trashId?: string;
  version?: number | string;
  imageId?: string;
  attachmentId?: string;
  projectId?: string;
  testCaseId?: string;
  runId?: string;
  platform?: "web" | "mobile";
  artifactType?: string;
  fileName?: string;
  customPath?: string;
}

export interface UploadResult {
  key: string;
  size: number;
  contentType: string;
  storageType: "r2" | "d1";
}

export interface R2ItemMetadata {
  key: string;
  size: number;
  contentType: string;
  uploaded: string;
  customMetadata?: Record<string, string>;
}

export async function getStorageBucket(): Promise<any | null> {
  let bucket: any = null;

  try {
    const nextOnPages = await import("@cloudflare/next-on-pages");
    if (nextOnPages && typeof nextOnPages.getRequestContext === "function") {
      const context = nextOnPages.getRequestContext() as any;
      bucket = context?.env?.STORAGE || context?.env?.JSON_BLOB_BUCKET;
    }
  } catch (error) {
    // Context unavailable (e.g. static build or Node environment)
  }

  if (!bucket) {
    bucket =
      (process.env as any).STORAGE ||
      (process.env as any).JSON_BLOB_BUCKET ||
      (globalThis as any).STORAGE ||
      (globalThis as any).JSON_BLOB_BUCKET;
  }

  // Dynamic Wrangler proxy for local node dev environment
  if (
    !bucket &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_RUNTIME !== "edge" &&
    typeof process !== "undefined" &&
    process.versions?.node
  ) {
    try {
      const wranglerModule = await import(/* webpackIgnore: true */ "wrangler");
      if (wranglerModule && typeof wranglerModule.getPlatformProxy === "function") {
        const { env } = await wranglerModule.getPlatformProxy();
        bucket = env.STORAGE || env.JSON_BLOB_BUCKET;
      }
    } catch (err) {
      console.warn("Could not retrieve local Wrangler platform proxy for R2 bucket STORAGE:", err);
    }
  }

  // Fallback in-memory R2 bucket mock for local dev/testing if no binding exists
  if (!bucket && typeof globalThis !== "undefined") {
    if (!(globalThis as any).__r2_mock_bucket) {
      const storageMap = new Map<string, { content: string; contentType: string; metadata: any; uploaded: Date }>();
      (globalThis as any).__r2_mock_bucket = {
        async put(key: string, content: any, options?: any) {
          const contentStr = typeof content === "string" ? content : JSON.stringify(content);
          const meta = {
            content: contentStr,
            contentType: options?.httpMetadata?.contentType || "application/json",
            metadata: options?.customMetadata || {},
            uploaded: new Date(),
          };
          storageMap.set(key, meta);
          return meta;
        },
        async get(key: string) {
          const item = storageMap.get(key);
          if (!item) return null;
          return {
            key,
            size: new TextEncoder().encode(item.content).byteLength,
            httpMetadata: { contentType: item.contentType },
            customMetadata: item.metadata,
            uploaded: item.uploaded,
            async text() { return item.content; },
            async json() { return JSON.parse(item.content); }
          };
        },
        async delete(key: string) {
          return storageMap.delete(key);
        },
        async head(key: string) {
          const item = storageMap.get(key);
          if (!item) return null;
          return {
            key,
            size: new TextEncoder().encode(item.content).byteLength,
            httpMetadata: { contentType: item.contentType },
            customMetadata: item.metadata,
            uploaded: item.uploaded,
          };
        },
        async list(options?: { prefix?: string }) {
          const prefix = options?.prefix || "";
          const objects: any[] = [];
          for (const [k, item] of storageMap.entries()) {
            if (k.startsWith(prefix)) {
              objects.push({
                key: k,
                size: new TextEncoder().encode(item.content).byteLength,
                httpMetadata: { contentType: item.contentType },
                customMetadata: item.metadata,
                uploaded: item.uploaded,
              });
            }
          }
          return { objects };
        }
      };
    }
    bucket = (globalThis as any).__r2_mock_bucket;
  }

  return bucket || null;
}

/**
 * Generates structured object keys automatically based on entity type and parameters.
 * Deterministic keys follow standard R2 Folder Structure:
 * blobs/{workspaceId}/{blobId}.json
 * requests/{workspaceId}/{requestId}/body.json
 * responses/{workspaceId}/{requestId}/response.json
 * headers/{workspaceId}/{requestId}/headers.json
 * collections/{workspaceId}/{collectionId}.json
 * scripts/{workspaceId}/{requestId}/scripts.js
 */
export function generateObjectKey(type: ObjectType, params: KeyParams): string {
  const user = params.userId || "default-user";
  const workspace = params.workspaceId || params.userId || "default-workspace";
  const blob = params.blobId || crypto.randomUUID();

  switch (type) {
    case "blob":
      return `blobs/${workspace}/${blob}.json`;
    case "collection":
      return `collections/${workspace}/${params.collectionId || "default"}.json`;
    case "collection_body":
    case "request":
    case "request_body":
      return `requests/${workspace}/${params.requestId || "req"}/body.json`;
    case "collection_headers":
    case "headers":
      return `headers/${workspace}/${params.requestId || "req"}/headers.json`;
    case "collection_tests":
      return `requests/${workspace}/${params.requestId || "req"}/tests.js`;
    case "collection_scripts":
    case "scripts":
      return `scripts/${workspace}/${params.requestId || "req"}/scripts.js`;
    case "collection_response":
    case "response":
    case "response_body":
      return `responses/${workspace}/${params.requestId || "req"}/response.json`;
    case "import":
    case "imports":
      return `imports/${workspace}/${params.importId || crypto.randomUUID()}.json`;
    case "export":
    case "exports":
      return `exports/${workspace}/${params.exportId || crypto.randomUUID()}.json`;
    case "backup":
    case "backups":
      return `backups/${user}/${params.backupId || crypto.randomUUID()}.json`;
    case "version":
    case "versions":
      return `versions/${blob}/v${params.version || 1}.json`;
    case "image":
    case "images":
      return `images/${workspace}/${params.imageId || crypto.randomUUID()}`;
    case "attachment":
    case "attachments":
      return `attachments/${workspace}/${params.attachmentId || crypto.randomUUID()}`;
    case "trash":
      return `trash/${workspace}/${params.trashId || crypto.randomUUID()}.json`;
    case "test_project_source":
      return `projects/${params.projectId || crypto.randomUUID()}/source/project.zip`;
    case "test_case_file":
      return `projects/${params.projectId || "default"}/tests/${params.platform || "web"}/${params.testCaseId || crypto.randomUUID()}.${params.platform === "mobile" ? "yaml" : "spec.ts"}`;
    case "test_run_artifact":
      return `runs/${params.runId || "default"}/${params.artifactType || "artifacts"}/${params.fileName || crypto.randomUUID()}`;
    case "future":
      return `future/${params.customPath || crypto.randomUUID()}`;
    default:
      return `blobs/${workspace}/${blob}.json`;
  }
}

/**
 * Uploads JSON or string object to Cloudflare R2 bucket with full verification and detailed logging.
 */
export async function upload(
  key: string,
  data: any,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  console.log("[R2] Upload Started");
  console.log("[R2] Bucket Name: STORAGE");
  console.log(`[R2] Object Key: ${key}`);

  const contentStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const size = new TextEncoder().encode(contentStr).byteLength;
  const contentType = "application/json";

  const bucket = await getStorageBucket();
  if (!bucket || typeof bucket.put !== "function") {
    console.error("[R2] Upload failed: R2 bucket is unavailable");
    throw new Error("Cloudflare R2 bucket is unavailable");
  }

  try {
    await bucket.put(key, contentStr, {
      httpMetadata: { contentType },
      customMetadata: metadata || { uploadedAt: new Date().toISOString() },
    });
    console.log("[R2] Upload Success");
  } catch (err: any) {
    console.error(`[R2] Upload failed: ${err?.message || err}`);
    throw new Error(`R2 upload failed: ${err?.message || err}`);
  }

  // Verification step: call bucket.head(key) or bucket.get(key)
  console.log("[R2] Verification Started");
  try {
    let verifiedObj: any = null;
    if (typeof bucket.head === "function") {
      verifiedObj = await bucket.head(key);
    }
    if (!verifiedObj && typeof bucket.get === "function") {
      verifiedObj = await bucket.get(key);
    }

    if (!verifiedObj) {
      console.error(`[R2] Verification failed: Object not found at key ${key}`);
      throw new Error(`R2 verification failed: Object at key '${key}' not found after upload`);
    }

    console.log("[R2] Verification Success");
    const verifiedSize = verifiedObj.size !== undefined ? verifiedObj.size : size;
    console.log(`[R2] Object Size: ${verifiedSize} bytes`);
    console.log(`[R2] Object Key: ${key}`);
    console.log("[R2] Upload Completed");

    return { key, size: verifiedSize, contentType, storageType: "r2" };
  } catch (err: any) {
    console.error(`[R2] Verification failed: ${err?.message || err}`);
    throw new Error(`R2 verification failed: ${err?.message || err}`);
  }
}

export const uploadJson = upload;

/**
 * Downloads and parses JSON or text object from R2 storage key.
 */
export async function download<T = any>(key: string): Promise<T | null> {
  if (!key) return null;
  console.log("[R2] Download Started");
  console.log(`[R2] Object Key: ${key}`);

  try {
    const bucket = await getStorageBucket();
    if (bucket && typeof bucket.get === "function") {
      const obj = await bucket.get(key);
      if (obj) {
        console.log("[R2] Download Success");
        const text = await obj.text();
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      } else {
        console.warn(`[R2] Download warning: Object not found at key (${key})`);
      }
    }
  } catch (err: any) {
    console.error(`[R2] Download error for key (${key}):`, err);
  }

  return null;
}

export const downloadJson = download;

/**
 * Updates existing object in R2.
 */
export async function updateJson(
  key: string,
  data: any,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  return upload(key, data, metadata);
}

/**
 * Deletes object from R2 storage.
 */
export async function deleteObject(key: string): Promise<boolean> {
  if (!key) return false;
  console.log("[R2] Delete Started");
  console.log(`[R2] Object Key: ${key}`);

  try {
    const bucket = await getStorageBucket();
    if (bucket && typeof bucket.delete === "function") {
      await bucket.delete(key);
      console.log("[R2] Delete Success");
      return true;
    }
  } catch (err: any) {
    console.error(`[R2] Delete error for key (${key}):`, err);
  }

  return false;
}

export const remove = deleteObject;

/**
 * Copies object inside R2 from source key to destination key.
 */
export async function copy(sourceKey: string, destinationKey: string): Promise<boolean> {
  if (!sourceKey || !destinationKey) return false;
  console.log("[R2] Copy Started");
  console.log(`[R2] Source Key: ${sourceKey}`);
  console.log(`[R2] Destination Key: ${destinationKey}`);

  try {
    const content = await download(sourceKey);
    if (content !== null) {
      const res = await upload(destinationKey, content);
      console.log("[R2] Copy Success");
      return res.storageType === "r2";
    }
  } catch (err: any) {
    console.error(`[R2] Copy error from ${sourceKey} to ${destinationKey}:`, err);
  }

  return false;
}

export const copyObject = copy;

/**
 * Checks if object exists in R2.
 */
export async function exists(key: string): Promise<boolean> {
  if (!key) return false;
  console.log("[R2] Head Check Started");
  console.log(`[R2] Object Key: ${key}`);

  try {
    const bucket = await getStorageBucket();
    if (bucket && typeof bucket.head === "function") {
      const head = await bucket.head(key);
      const isExist = !!head;
      console.log(`[R2] Head check finished. Exists: ${isExist}`);
      return isExist;
    } else if (bucket && typeof bucket.get === "function") {
      const obj = await bucket.get(key);
      const isExist = !!obj;
      console.log(`[R2] Get check finished. Exists: ${isExist}`);
      return isExist;
    }
  } catch (err: any) {
    console.error(`[R2] Head check error for key (${key}):`, err);
  }

  return false;
}

/**
 * Retrieves metadata for an object in R2 (head).
 */
export async function head(key: string): Promise<R2ItemMetadata | null> {
  if (!key) return null;
  console.log("[R2] Head Started");
  console.log(`[R2] Object Key: ${key}`);

  try {
    const bucket = await getStorageBucket();
    if (bucket && typeof bucket.head === "function") {
      const headRes = await bucket.head(key);
      if (headRes) {
        console.log("[R2] Head Success");
        return {
          key: headRes.key,
          size: headRes.size,
          contentType: headRes.httpMetadata?.contentType || "application/json",
          uploaded: headRes.uploaded ? new Date(headRes.uploaded).toISOString() : new Date().toISOString(),
          customMetadata: headRes.customMetadata,
        };
      }
    }
  } catch (err: any) {
    console.error(`[R2] Head error for key (${key}):`, err);
  }

  return null;
}

export const getMetadata = head;

/**
 * Lists objects matching prefix in R2.
 */
export async function list(prefix: string): Promise<R2ItemMetadata[]> {
  console.log("[R2] List Started");
  console.log(`[R2] Prefix: ${prefix}`);

  try {
    const bucket = await getStorageBucket();
    if (bucket && typeof bucket.list === "function") {
      const res = await bucket.list({ prefix });
      const items = (res.objects || []).map((o: any) => ({
        key: o.key,
        size: o.size,
        contentType: o.httpMetadata?.contentType || "application/json",
        uploaded: o.uploaded ? new Date(o.uploaded).toISOString() : new Date().toISOString(),
        customMetadata: o.customMetadata,
      }));
      console.log(`[R2] List Success: ${items.length} objects found`);
      return items;
    }
  } catch (err: any) {
    console.error(`[R2] List error for prefix (${prefix}):`, err);
  }

  return [];
}

export const listObjects = list;

/**
 * Moves object from sourceKey to destinationKey in R2 with verification and cleanup.
 */
export async function move(sourceKey: string, destinationKey: string): Promise<boolean> {
  console.log("[R2] Move Started");
  const copied = await copy(sourceKey, destinationKey);
  if (copied) {
    const deleted = await deleteObject(sourceKey);
    console.log("[R2] Move Success");
    return deleted;
  }
  return false;
}

/**
 * Renames object in R2.
 */
export async function rename(sourceKey: string, destinationKey: string): Promise<boolean> {
  return move(sourceKey, destinationKey);
}


