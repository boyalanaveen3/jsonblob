import {
  getStorageBucket as getR2Bucket,
  uploadJson,
  downloadJson,
  deleteObject,
} from "@/lib/services/storageService";

export interface ApiRequestR2Keys {
  bodyObjectKey: string;
  headersObjectKey: string;
  testsObjectKey: string;
  scriptsObjectKey: string;
  responseExampleKey: string;
}

export interface ApiRequestR2Payloads {
  body: string;
  headers: any[];
  tests: string;
  scripts: string;
  responseExample: string;
}

/**
 * Saves all large request data into Cloudflare R2 object storage following structure:
 * collections/{workspaceId}/{collectionId}/{requestId}/
 */
export async function saveApiRequestR2Payloads(
  workspaceId: string = "default-workspace",
  collectionId: string,
  requestId: string,
  payload: {
    body?: string;
    headers?: any[];
    tests?: string;
    scripts?: string;
    responseExample?: string;
  }
): Promise<ApiRequestR2Keys> {
  const basePrefix = `collections/${workspaceId}/${collectionId}/${requestId}`;
  const keys: ApiRequestR2Keys = {
    bodyObjectKey: `${basePrefix}/body.json`,
    headersObjectKey: `${basePrefix}/headers.json`,
    testsObjectKey: `${basePrefix}/tests.js`,
    scriptsObjectKey: `${basePrefix}/scripts.js`,
    responseExampleKey: `${basePrefix}/response.json`,
  };

  try {
    const bodyContent = payload.body || "{\n  \n}";
    const headersContent = payload.headers || [];
    const testsContent = payload.tests || "// Unit tests\n";
    const scriptsContent = payload.scripts || "// Pre-request scripts\n";
    const responseContent = payload.responseExample || "";

    await Promise.all([
      uploadJson(keys.bodyObjectKey, bodyContent),
      uploadJson(keys.headersObjectKey, headersContent),
      uploadJson(keys.testsObjectKey, testsContent),
      uploadJson(keys.scriptsObjectKey, scriptsContent),
      uploadJson(keys.responseExampleKey, responseContent),
    ]);
  } catch (err) {
    console.warn(`Failed to upload API request payload files to Cloudflare R2 (${basePrefix}):`, err);
  }

  return keys;
}

/**
 * Reads all request payload files from Cloudflare R2 using object keys.
 */
export async function readApiRequestR2Payloads(keys: {
  bodyObjectKey?: string | null;
  headersObjectKey?: string | null;
  testsObjectKey?: string | null;
  scriptsObjectKey?: string | null;
  responseExampleKey?: string | null;
}): Promise<ApiRequestR2Payloads> {
  const result: ApiRequestR2Payloads = {
    body: "{\n  \n}",
    headers: [],
    tests: "",
    scripts: "",
    responseExample: "",
  };

  try {
    const [body, headers, tests, scripts, responseExample] = await Promise.all([
      keys.bodyObjectKey ? downloadJson<string>(keys.bodyObjectKey) : Promise.resolve(null),
      keys.headersObjectKey ? downloadJson<any[]>(keys.headersObjectKey) : Promise.resolve(null),
      keys.testsObjectKey ? downloadJson<string>(keys.testsObjectKey) : Promise.resolve(null),
      keys.scriptsObjectKey ? downloadJson<string>(keys.scriptsObjectKey) : Promise.resolve(null),
      keys.responseExampleKey ? downloadJson<string>(keys.responseExampleKey) : Promise.resolve(null),
    ]);

    if (body) result.body = typeof body === "string" ? body : JSON.stringify(body, null, 2);
    if (headers && Array.isArray(headers)) result.headers = headers;
    if (tests) result.tests = typeof tests === "string" ? tests : String(tests);
    if (scripts) result.scripts = typeof scripts === "string" ? scripts : String(scripts);
    if (responseExample) result.responseExample = typeof responseExample === "string" ? responseExample : JSON.stringify(responseExample, null, 2);
  } catch (err) {
    console.error("Error reading API request payload files from Cloudflare R2:", err);
  }

  return result;
}

/**
 * Deletes all R2 objects associated with an API request.
 */
export async function deleteApiRequestR2Payloads(keys: {
  bodyObjectKey?: string | null;
  headersObjectKey?: string | null;
  testsObjectKey?: string | null;
  scriptsObjectKey?: string | null;
  responseExampleKey?: string | null;
}): Promise<void> {
  const objectKeys = [
    keys.bodyObjectKey,
    keys.headersObjectKey,
    keys.testsObjectKey,
    keys.scriptsObjectKey,
    keys.responseExampleKey,
  ].filter(Boolean) as string[];

  try {
    await Promise.all(objectKeys.map((k) => deleteObject(k)));
  } catch (err) {
    console.error("Error deleting API request payloads from Cloudflare R2:", err);
  }
}

/**
 * Duplicates R2 payload files from source request to target request.
 */
export async function duplicateApiRequestR2Payloads(
  srcKeys: ApiRequestR2Keys,
  targetWorkspaceId: string = "default-workspace",
  targetCollectionId: string,
  targetRequestId: string
): Promise<ApiRequestR2Keys> {
  const srcPayloads = await readApiRequestR2Payloads(srcKeys);
  return await saveApiRequestR2Payloads(
    targetWorkspaceId,
    targetCollectionId,
    targetRequestId,
    srcPayloads
  );
}

/**
 * Saves execution history response payload to Cloudflare R2.
 */
export async function saveHistoryResponseR2(
  workspaceId: string = "default-workspace",
  collectionId: string,
  requestId: string,
  historyId: string,
  responseBody: string
): Promise<string> {
  const key = `collections/${workspaceId}/${collectionId}/${requestId}/history/${historyId}_response.json`;
  try {
    await uploadJson(key, responseBody);
  } catch (err) {
    console.warn(`Failed to store history response in R2 (${key}):`, err);
  }
  return key;
}

/**
 * Reads execution history response payload from Cloudflare R2.
 */
export async function readHistoryResponseR2(responseObjectKey: string | null): Promise<string> {
  if (!responseObjectKey) return "";
  try {
    const res = await downloadJson<string>(responseObjectKey);
    return res ? (typeof res === "string" ? res : JSON.stringify(res, null, 2)) : "";
  } catch (err) {
    console.error(`Error reading history response from R2 (${responseObjectKey}):`, err);
    return "";
  }
}
