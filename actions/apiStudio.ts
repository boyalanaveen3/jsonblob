"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  workspaces,
  collections,
  folders,
  apiRequests,
  apiRequestHistory,
  environments,
  users,
  type Workspace,
  type Collection,
  type Folder,
  type ApiRequest,
  type ApiRequestHistoryItem,
  type Environment,
} from "@/lib/db/schema";
import {
  saveApiRequestR2Payloads,
  readApiRequestR2Payloads,
  deleteApiRequestR2Payloads,
  duplicateApiRequestR2Payloads,
  saveHistoryResponseR2,
  readHistoryResponseR2,
} from "@/lib/storage/r2ApiStudioStorage";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("userId")?.value || null;
  } catch {
    return null;
  }
}

async function ensureDefaultWorkspaceAndCollection(db: any) {
  try {
    const now = new Date().toISOString();
    const existingWs = (await db.select().from(workspaces).where(eq(workspaces.id, "default-workspace")).all())[0];
    if (!existingWs) {
      console.log("[D1] Creating default workspace metadata");
      await db.insert(workspaces).values({
        id: "default-workspace",
        name: "My Workspace",
        description: "Default API Studio Workspace",
        color: "#7c3aed",
        icon: "Layout",
        userId: null,
        createdAt: now,
        updatedAt: now,
      }).run();
      console.log("[D1] Default workspace metadata saved");
    }

    const existingCol = (await db.select().from(collections).where(eq(collections.workspaceId, "default-workspace")).all())[0];
    if (!existingCol) {
      console.log("[D1] Creating default collection metadata");
      await db.insert(collections).values({
        id: "default-collection",
        workspaceId: "default-workspace",
        name: "My Collection",
        description: "Default Collection for API Requests",
        color: "#3b82f6",
        icon: "Folder",
        isFavorite: "false",
        createdBy: null,
        createdAt: now,
        updatedAt: now,
        requestCount: "0",
        folderCount: "0",
      }).run();
      console.log("[D1] Default collection metadata saved");
    }
  } catch (err) {
    console.error("Error in ensureDefaultWorkspaceAndCollection:", err);
  }
}

// ==========================================
// WORKSPACES CRUD
// ==========================================

export async function getWorkspacesAction(): Promise<Workspace[]> {
  try {
    const db = await getDb();
    await ensureDefaultWorkspaceAndCollection(db);
    const list = await db.select().from(workspaces).all();
    return list;
  } catch (error) {
    console.error("Error in getWorkspacesAction:", error);
    return [];
  }
}

export async function createWorkspaceAction(
  name: string,
  description?: string,
  color?: string,
  icon?: string
): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
  try {
    const userId = await getUserId();
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newWorkspace: Workspace = {
      id,
      name: name.trim(),
      description: description || null,
      color: color || "#7c3aed",
      icon: icon || "Layout",
      userId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(workspaces).values(newWorkspace).run();
    safeRevalidatePath("/api");
    return { success: true, workspace: newWorkspace };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create workspace" };
  }
}

export async function updateWorkspaceAction(
  id: string,
  name: string,
  description?: string,
  color?: string,
  icon?: string
): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db
      .update(workspaces)
      .set({
        name: name.trim(),
        description: description || null,
        color: color || undefined,
        icon: icon || undefined,
        updatedAt: now,
      })
      .where(eq(workspaces.id, id))
      .run();

    const updated = (await db.select().from(workspaces).where(eq(workspaces.id, id)).all())[0];
    safeRevalidatePath("/api");
    return { success: true, workspace: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update workspace" };
  }
}

export async function deleteWorkspaceAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    await db.delete(workspaces).where(eq(workspaces.id, id)).run();
    safeRevalidatePath("/api");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete workspace" };
  }
}

// ==========================================
// COLLECTIONS CRUD
// ==========================================

export async function getCollectionsAction(workspaceId: string = "default-workspace"): Promise<Collection[]> {
  try {
    const db = await getDb();
    await ensureDefaultWorkspaceAndCollection(db);
    const list = await db
      .select()
      .from(collections)
      .where(eq(collections.workspaceId, workspaceId))
      .all();

    return list;
  } catch (error) {
    console.error("Error in getCollectionsAction:", error);
    return [];
  }
}

export async function createCollectionAction(
  name: string,
  description?: string,
  color?: string,
  icon?: string,
  workspaceId: string = "default-workspace"
): Promise<{ success: boolean; collection?: Collection; error?: string }> {
  try {
    const userId = await getUserId();
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newCollection: Collection = {
      id,
      workspaceId,
      name: name.trim(),
      description: description || null,
      color: color || "#3b82f6",
      icon: icon || "Folder",
      isFavorite: "false",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      requestCount: "0",
      folderCount: "0",
    };

    await db.insert(collections).values(newCollection).run();
    safeRevalidatePath("/api");
    return { success: true, collection: newCollection };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create collection" };
  }
}

export async function updateCollectionAction(
  id: string,
  name: string,
  description?: string,
  color?: string,
  icon?: string,
  isFavorite?: boolean
): Promise<{ success: boolean; collection?: Collection; error?: string }> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db
      .update(collections)
      .set({
        name: name.trim(),
        description: description || null,
        color: color || undefined,
        icon: icon || undefined,
        isFavorite: isFavorite !== undefined ? (isFavorite ? "true" : "false") : undefined,
        updatedAt: now,
      })
      .where(eq(collections.id, id))
      .run();

    const updated = (await db.select().from(collections).where(eq(collections.id, id)).all())[0];
    safeRevalidatePath("/api");
    return { success: true, collection: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update collection" };
  }
}

export async function deleteCollectionAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();

    // Find all requests in collection and delete R2 files first
    const reqList = await db.select().from(apiRequests).where(eq(apiRequests.collectionId, id)).all();
    for (const req of reqList) {
      await deleteApiRequestR2Payloads({
        bodyObjectKey: req.bodyObjectKey,
        headersObjectKey: req.headersObjectKey,
        testsObjectKey: req.testsObjectKey,
        scriptsObjectKey: req.scriptsObjectKey,
        responseExampleKey: req.responseExampleKey,
      });
    }

    // Delete requests, folders, history, and collection from D1
    for (const req of reqList) {
      await db.delete(apiRequestHistory).where(eq(apiRequestHistory.requestId, req.id)).run();
    }
    await db.delete(apiRequests).where(eq(apiRequests.collectionId, id)).run();
    await db.delete(folders).where(eq(folders.collectionId, id)).run();
    await db.delete(collections).where(eq(collections.id, id)).run();

    safeRevalidatePath("/api");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete collection" };
  }
}

// ==========================================
// FOLDERS CRUD (Supports Nested Folders)
// ==========================================

export async function getFoldersAction(collectionId: string): Promise<Folder[]> {
  try {
    const db = await getDb();
    const list = await db.select().from(folders).where(eq(folders.collectionId, collectionId)).all();
    return list;
  } catch (error) {
    console.error("Error in getFoldersAction:", error);
    return [];
  }
}

export async function createFolderAction(
  collectionId: string,
  name: string,
  parentId?: string | null
): Promise<{ success: boolean; folder?: Folder; error?: string }> {
  try {
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newFolder: Folder = {
      id,
      collectionId,
      parentId: parentId || null,
      name: name.trim(),
      sortOrder: "0",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(folders).values(newFolder).run();

    // Increment folder count on collection
    const folderList = await db.select().from(folders).where(eq(folders.collectionId, collectionId)).all();
    await db
      .update(collections)
      .set({ folderCount: folderList.length.toString(), updatedAt: now })
      .where(eq(collections.id, collectionId))
      .run();

    safeRevalidatePath("/api");
    return { success: true, folder: newFolder };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create folder" };
  }
}

export async function updateFolderAction(
  id: string,
  name: string
): Promise<{ success: boolean; folder?: Folder; error?: string }> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db
      .update(folders)
      .set({ name: name.trim(), updatedAt: now })
      .where(eq(folders.id, id))
      .run();

    const updated = (await db.select().from(folders).where(eq(folders.id, id)).all())[0];
    safeRevalidatePath("/api");
    return { success: true, folder: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update folder" };
  }
}

export async function deleteFolderAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    const existing = (await db.select().from(folders).where(eq(folders.id, id)).all())[0];
    if (!existing) return { success: false, error: "Folder not found" };

    // Move sub-requests to root collection level
    await db
      .update(apiRequests)
      .set({ folderId: null })
      .where(eq(apiRequests.folderId, id))
      .run();

    // Update child folders parentId
    await db
      .update(folders)
      .set({ parentId: existing.parentId })
      .where(eq(folders.parentId, id))
      .run();

    await db.delete(folders).where(eq(folders.id, id)).run();

    const folderList = await db.select().from(folders).where(eq(folders.collectionId, existing.collectionId)).all();
    await db
      .update(collections)
      .set({ folderCount: folderList.length.toString() })
      .where(eq(collections.id, existing.collectionId))
      .run();

    safeRevalidatePath("/api");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete folder" };
  }
}

export async function moveFolderAction(
  id: string,
  targetParentId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db
      .update(folders)
      .set({ parentId: targetParentId || null, updatedAt: now })
      .where(eq(folders.id, id))
      .run();

    safeRevalidatePath("/api");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to move folder" };
  }
}

// ==========================================
// API REQUESTS CRUD (D1 Metadata + R2 Payloads)
// ==========================================

export async function getApiRequestsAction(collectionId?: string): Promise<ApiRequest[]> {
  try {
    const db = await getDb();
    if (collectionId) {
      return await db.select().from(apiRequests).where(eq(apiRequests.collectionId, collectionId)).all();
    }
    return await db.select().from(apiRequests).all();
  } catch (error) {
    console.error("Error in getApiRequestsAction:", error);
    return [];
  }
}

/**
 * Reads single API request: Metadata from D1, Payloads (body, headers, tests, scripts, response) from Cloudflare R2!
 */
export async function getApiRequestFullAction(id: string): Promise<{
  request: ApiRequest | null;
  payloads: {
    body: string;
    headers: any[];
    tests: string;
    scripts: string;
    responseExample: string;
  };
}> {
  try {
    const db = await getDb();
    await ensureDefaultWorkspaceAndCollection(db);
    const request = (await db.select().from(apiRequests).where(eq(apiRequests.id, id)).all())[0] || null;

    if (!request) {
      return {
        request: null,
        payloads: { body: "{\n  \n}", headers: [], tests: "", scripts: "", responseExample: "" },
      };
    }

    const payloads = await readApiRequestR2Payloads({
      bodyObjectKey: request.bodyObjectKey,
      headersObjectKey: request.headersObjectKey,
      testsObjectKey: request.testsObjectKey,
      scriptsObjectKey: request.scriptsObjectKey,
      responseExampleKey: request.responseExampleKey,
    });

    return { request, payloads };
  } catch (error) {
    console.error("Error in getApiRequestFullAction:", error);
    return {
      request: null,
      payloads: { body: "{\n  \n}", headers: [], tests: "", scripts: "", responseExample: "" },
    };
  }
}

/**
 * Saves/Updates API Request: Uploads body, headers, tests, scripts to Cloudflare R2, then saves object keys metadata in D1!
 */
export async function saveApiRequestAction(params: {
  id?: string;
  collectionId: string;
  folderId?: string | null;
  name: string;
  method: string;
  endpoint: string;
  description?: string;
  body?: string;
  headers?: any[];
  tests?: string;
  scripts?: string;
  responseExample?: string;
  workspaceId?: string;
}): Promise<{ success: boolean; request?: ApiRequest; error?: string }> {
  try {
    const db = await getDb();
    await ensureDefaultWorkspaceAndCollection(db);
    const reqId = params.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const wsId = params.workspaceId || "default-workspace";

    // 1. Upload large payload JSON/script objects into Cloudflare R2
    const r2Keys = await saveApiRequestR2Payloads(wsId, params.collectionId, reqId, {
      body: params.body,
      headers: params.headers,
      tests: params.tests,
      scripts: params.scripts,
      responseExample: params.responseExample,
    });

    // 2. Save metadata row into Cloudflare D1
    const newOrUpdatedRequest: ApiRequest = {
      id: reqId,
      collectionId: params.collectionId,
      folderId: params.folderId || null,
      name: params.name.trim(),
      method: params.method.toUpperCase(),
      endpoint: params.endpoint.trim(),
      description: params.description || null,
      isFavorite: "false",
      bodyObjectKey: r2Keys.bodyObjectKey,
      headersObjectKey: r2Keys.headersObjectKey,
      testsObjectKey: r2Keys.testsObjectKey,
      scriptsObjectKey: r2Keys.scriptsObjectKey,
      responseExampleKey: r2Keys.responseExampleKey,
      createdAt: now,
      updatedAt: now,
    };

    const existing = (await db.select().from(apiRequests).where(eq(apiRequests.id, reqId)).all())[0];
    if (existing) {
      await db
        .update(apiRequests)
        .set({
          name: newOrUpdatedRequest.name,
          method: newOrUpdatedRequest.method,
          endpoint: newOrUpdatedRequest.endpoint,
          folderId: newOrUpdatedRequest.folderId,
          description: newOrUpdatedRequest.description,
          bodyObjectKey: r2Keys.bodyObjectKey,
          headersObjectKey: r2Keys.headersObjectKey,
          testsObjectKey: r2Keys.testsObjectKey,
          scriptsObjectKey: r2Keys.scriptsObjectKey,
          responseExampleKey: r2Keys.responseExampleKey,
          updatedAt: now,
        })
        .where(eq(apiRequests.id, reqId))
        .run();
      console.log("[D1] Metadata saved");
    } else {
      await db.insert(apiRequests).values(newOrUpdatedRequest).run();
      console.log("[D1] Metadata saved");

      // Update collection request count
      const reqList = await db.select().from(apiRequests).where(eq(apiRequests.collectionId, params.collectionId)).all();
      await db
        .update(collections)
        .set({ requestCount: reqList.length.toString(), updatedAt: now })
        .where(eq(collections.id, params.collectionId))
        .run();
    }

    safeRevalidatePath("/api");
    return { success: true, request: newOrUpdatedRequest };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save API request" };
  }
}

export async function deleteApiRequestAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    const existing = (await db.select().from(apiRequests).where(eq(apiRequests.id, id)).all())[0];
    if (!existing) return { success: false, error: "Request not found" };

    // Delete payloads from R2
    await deleteApiRequestR2Payloads({
      bodyObjectKey: existing.bodyObjectKey,
      headersObjectKey: existing.headersObjectKey,
      testsObjectKey: existing.testsObjectKey,
      scriptsObjectKey: existing.scriptsObjectKey,
      responseExampleKey: existing.responseExampleKey,
    });

    // Delete metadata from D1
    await db.delete(apiRequests).where(eq(apiRequests.id, id)).run();

    // Update collection count
    const reqList = await db.select().from(apiRequests).where(eq(apiRequests.collectionId, existing.collectionId)).all();
    await db
      .update(collections)
      .set({ requestCount: reqList.length.toString() })
      .where(eq(collections.id, existing.collectionId))
      .run();

    safeRevalidatePath("/api");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete API request" };
  }
}

export async function duplicateApiRequestAction(id: string): Promise<{ success: boolean; request?: ApiRequest; error?: string }> {
  try {
    const db = await getDb();
    const existing = (await db.select().from(apiRequests).where(eq(apiRequests.id, id)).all())[0];
    if (!existing) return { success: false, error: "Request not found" };

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    const srcKeys = {
      bodyObjectKey: existing.bodyObjectKey || "",
      headersObjectKey: existing.headersObjectKey || "",
      testsObjectKey: existing.testsObjectKey || "",
      scriptsObjectKey: existing.scriptsObjectKey || "",
      responseExampleKey: existing.responseExampleKey || "",
    };

    // Copy R2 files
    const newR2Keys = await duplicateApiRequestR2Payloads(srcKeys, "default-workspace", existing.collectionId, newId);

    const dupRequest: ApiRequest = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      bodyObjectKey: newR2Keys.bodyObjectKey,
      headersObjectKey: newR2Keys.headersObjectKey,
      testsObjectKey: newR2Keys.testsObjectKey,
      scriptsObjectKey: newR2Keys.scriptsObjectKey,
      responseExampleKey: newR2Keys.responseExampleKey,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(apiRequests).values(dupRequest).run();

    safeRevalidatePath("/api");
    return { success: true, request: dupRequest };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to duplicate request" };
  }
}

// ==========================================
// REQUEST EXECUTION HISTORY
// ==========================================

export async function getApiRequestHistoryAction(requestId: string): Promise<Array<ApiRequestHistoryItem & { responseBody?: string }>> {
  try {
    const db = await getDb();
    const list = await db
      .select()
      .from(apiRequestHistory)
      .where(eq(apiRequestHistory.requestId, requestId))
      .all();

    list.sort((a: ApiRequestHistoryItem, b: ApiRequestHistoryItem) => b.executedAt.localeCompare(a.executedAt));

    const withPayloads = await Promise.all(
      list.map(async (item: ApiRequestHistoryItem) => {
        const responseBody = await readHistoryResponseR2(item.responseObjectKey);
        return { ...item, responseBody };
      })
    );

    return withPayloads;
  } catch (error) {
    console.error("Error in getApiRequestHistoryAction:", error);
    return [];
  }
}

export async function saveApiRequestHistoryAction(
  requestId: string,
  status: string,
  responseTime: string,
  responseBody: string,
  collectionId: string = "default-collection",
  workspaceId: string = "default-workspace",
  requestName?: string,
  method?: string,
  endpoint?: string
): Promise<{ success: boolean; historyItem?: ApiRequestHistoryItem; error?: string }> {
  try {
    const rawUserId = await getUserId();
    const db = await getDb();
    const historyId = crypto.randomUUID();
    const now = new Date().toISOString();

    await ensureDefaultWorkspaceAndCollection(db);

    // Check if user exists in D1, otherwise set userId to null to satisfy foreign keys
    let validUserId: string | null = null;
    if (rawUserId) {
      try {
        const u = (await db.select().from(users).where(eq(users.id, rawUserId)).all())[0];
        if (u) validUserId = rawUserId;
      } catch {}
    }

    // Ensure target request row exists in D1 for foreign key constraint
    let reqRow = (await db.select().from(apiRequests).where(eq(apiRequests.id, requestId)).all())[0];
    if (!reqRow) {
      console.log(`[D1] Auto-creating api_requests metadata row for request '${requestId}'`);
      reqRow = {
        id: requestId,
        collectionId: collectionId || "default-collection",
        folderId: null,
        name: requestName || "Executed Request",
        method: method || "POST",
        endpoint: endpoint || "https://api.example.com",
        description: "Auto-saved execution request",
        isFavorite: "false",
        bodyObjectKey: null,
        headersObjectKey: null,
        testsObjectKey: null,
        scriptsObjectKey: null,
        responseExampleKey: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(apiRequests).values(reqRow).run();
      console.log(`[D1] api_requests metadata row created for request '${requestId}'`);
    }

    // 1. Upload response payload into Cloudflare R2
    const responseObjectKey = await saveHistoryResponseR2(workspaceId, collectionId, requestId, historyId, responseBody);

    // 2. Save metadata row into Cloudflare D1 api_request_history table
    const newItem: ApiRequestHistoryItem = {
      id: historyId,
      requestId: reqRow.id,
      userId: validUserId,
      status,
      responseTime,
      executedAt: now,
      responseObjectKey,
    };

    await db.insert(apiRequestHistory).values(newItem).run();
    console.log(`[D1] History record saved into api_request_history (${historyId})`);
    return { success: true, historyItem: newItem };
  } catch (error: any) {
    console.error("Error in saveApiRequestHistoryAction:", error);
    return { success: false, error: error.message || "Failed to save history" };
  }
}

// ==========================================
// ENVIRONMENTS CRUD
// ==========================================

export async function getEnvironmentsAction(workspaceId: string = "default-workspace"): Promise<Environment[]> {
  try {
    const db = await getDb();
    const list = await db.select().from(environments).all();
    return list;
  } catch (error) {
    console.error("Error in getEnvironmentsAction:", error);
    return [];
  }
}

export async function saveEnvironmentAction(
  name: string,
  variablesJson: string,
  isGlobal: boolean = false,
  id?: string,
  workspaceId: string = "default-workspace"
): Promise<{ success: boolean; environment?: Environment; error?: string }> {
  try {
    const db = await getDb();
    const envId = id || crypto.randomUUID();
    const now = new Date().toISOString();

    const envItem: Environment = {
      id: envId,
      workspaceId,
      name: name.trim(),
      variablesJson,
      isGlobal: isGlobal ? "true" : "false",
      createdAt: now,
      updatedAt: now,
    };

    const existing = (await db.select().from(environments).where(eq(environments.id, envId)).all())[0];
    if (existing) {
      await db
        .update(environments)
        .set({
          name: envItem.name,
          variablesJson: envItem.variablesJson,
          isGlobal: envItem.isGlobal,
          updatedAt: now,
        })
        .where(eq(environments.id, envId))
        .run();
    } else {
      await db.insert(environments).values(envItem).run();
    }

    return { success: true, environment: envItem };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save environment" };
  }
}

export async function deleteEnvironmentAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    await db.delete(environments).where(eq(environments.id, id)).run();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete environment" };
  }
}
