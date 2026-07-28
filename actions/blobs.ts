"use server";

import { revalidatePath } from "next/cache";
import { and, eq, like, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blobs, users, type Blob } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { saveBlobToR2, getBlobContent, deleteBlobFromR2, duplicateBlobInR2 } from "@/lib/storage/r2Storage";
import { generateObjectKey, uploadJson, downloadJson, copyObject } from "@/lib/services/storageService";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("userId")?.value || "default-user";
  } catch {
    return "default-user";
  }
}

export async function getBlobsAction(search?: string): Promise<Blob[]> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return [];
    }
    const db = await getDb();
    let list: Blob[] = [];
    console.log("[D1] Fetching metadata for blobs");
    if (search) {
      list = await db
        .select()
        .from(blobs)
        .where(
          and(
            eq(blobs.userId, userId),
            like(blobs.title, `%${search}%`)
          )
        )
        .all();
    } else {
      list = await db
        .select()
        .from(blobs)
        .where(eq(blobs.userId, userId))
        .all();
    }
    // Sort descending by updatedAt
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  } catch (error) {
    console.error("Error in getBlobsAction:", error);
    return [];
  }
}

export async function getBlobAction(id: string): Promise<Blob | null> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return null;
    }
    console.log("[D1] Reading Metadata");
    const db = await getDb();
    const result = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    if (!result) {
      return null;
    }
    if (result.userId !== userId) {
      return null;
    }

    console.log("[R2] Download Started");
    const fullContent = await getBlobContent(result.storageType, result.storageKey, result.content);
    console.log("[API] Read Success");
    return { ...result, content: fullContent };
  } catch (error) {
    console.error("Error in getBlobAction:", error);
    return null;
  }
}

export async function createBlobAction(title: string, content: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  let r2Key: string | null = null;
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate JSON content
    try {
      JSON.parse(content);
    } catch {
      return { success: false, error: "Content must be valid JSON" };
    }

    if (!title.trim()) {
      return { success: false, error: "Title is required" };
    }

    const db = await getDb();
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    const userList = await db.select().from(users).where(eq(users.id, userId)).all();
    if (userList.length === 0) {
      await db
        .insert(users)
        .values({
          id: userId,
          email: `${userId}@workspace.local`,
          name: "Developer Workspace User",
          password: "hashed_default_password",
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    const r2Res = await saveBlobToR2(newId, content, userId);
    r2Key = r2Res.storageKey;

    const newBlob: Blob = {
      id: newId,
      title: title.trim(),
      content: "", // D1 stores metadata ONLY
      userId,
      storageKey: r2Res.storageKey,
      storageType: r2Res.storageType,
      sizeBytes: r2Res.sizeBytes,
      createdAt: now,
      updatedAt: now,
    };

    console.log("[D1] Insert Metadata");
    try {
      await db.insert(blobs).values(newBlob).run();
      console.log("[D1] Metadata Saved");
      console.log("[API] Save Success");
    } catch (d1Err: any) {
      console.error("[D1] Insert Metadata failed. Triggering R2 rollback...", d1Err);
      if (r2Key) {
        await deleteBlobFromR2(r2Key);
        console.log(`[R2] Rolled back object key: ${r2Key}`);
      }
      throw d1Err;
    }

    safeRevalidatePath("/");
    safeRevalidatePath(`/${newId}`);
    return { success: true, blob: { ...newBlob, content } };
  } catch (error: any) {
    console.error("Error in createBlobAction:", error);
    return { success: false, error: error.message || "Failed to create blob" };
  }
}

export async function updateBlobAction(
  id: string,
  title: string,
  content: string
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate JSON content
    try {
      JSON.parse(content);
    } catch {
      return { success: false, error: "Content must be valid JSON" };
    }

    if (!title.trim()) {
      return { success: false, error: "Title is required" };
    }

    const db = await getDb();
    
    // Check ownership first
    const existing = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    if (!existing) {
      return { success: false, error: "Blob not found" };
    }
    if (existing.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date().toISOString();
    const r2Res = await saveBlobToR2(id, content, userId);

    console.log("[D1] Update Metadata");
    await db
      .update(blobs)
      .set({
        title: title.trim(),
        content: "", // D1 stores metadata ONLY
        storageKey: r2Res.storageKey,
        storageType: r2Res.storageType,
        sizeBytes: r2Res.sizeBytes,
        updatedAt: now,
      })
      .where(eq(blobs.id, id))
      .run();
    console.log("[D1] Metadata Saved");
    console.log("[API] Update Success");

    const updated = await getBlobAction(id);
    if (!updated) {
      return { success: false, error: "Blob not found after update" };
    }

    safeRevalidatePath("/");
    safeRevalidatePath(`/${id}`);
    return { success: true, blob: updated };
  } catch (error: any) {
    console.error("Error in updateBlobAction:", error);
    return { success: false, error: error.message || "Failed to update blob" };
  }
}

export async function deleteBlobAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const db = await getDb();

    // Check ownership first
    const existing = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    if (!existing) {
      return { success: false, error: "Blob not found" };
    }
    if (existing.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (existing.storageKey) {
      await deleteBlobFromR2(existing.storageKey);
    }

    console.log("[D1] Delete Metadata");
    await db.delete(blobs).where(eq(blobs.id, id)).run();
    console.log("[API] Delete Success");
    safeRevalidatePath("/");
    safeRevalidatePath(`/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteBlobAction:", error);
    return { success: false, error: error.message || "Failed to delete blob" };
  }
}

export async function duplicateBlobAction(id: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const db = await getDb();
    const existing = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    if (!existing) {
      return { success: false, error: "Blob not found" };
    }
    if (existing.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const content = await getBlobContent(existing.storageType, existing.storageKey, existing.content);
    const dupTitle = `${existing.title} (Copy)`;
    
    return await createBlobAction(dupTitle, content);
  } catch (error: any) {
    console.error("Error in duplicateBlobAction:", error);
    return { success: false, error: error.message || "Failed to duplicate blob" };
  }
}

/**
 * Saves a version snapshot to versions/{blobId}/v{version}.json in Cloudflare R2
 */
export async function createBlobVersionAction(
  blobId: string,
  versionNumber: number
): Promise<{ success: boolean; versionKey?: string; error?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const blob = await getBlobAction(blobId);
    if (!blob) return { success: false, error: "Blob not found" };

    const versionKey = generateObjectKey("version", { blobId, version: versionNumber });
    const res = await uploadJson(versionKey, blob.content, {
      blobId,
      version: versionNumber.toString(),
      savedAt: new Date().toISOString(),
    });

    return { success: true, versionKey: res.key };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save blob version" };
  }
}

/**
 * Migration Utility (Step 15): Reads inline D1 blob payloads, uploads to Cloudflare R2, and updates D1 storage keys.
 */
export async function migrateD1BlobsToR2Action(): Promise<{ success: boolean; migratedCount: number; error?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, migratedCount: 0, error: "Unauthorized" };

    const db = await getDb();
    const d1Blobs = await db
      .select()
      .from(blobs)
      .where(and(eq(blobs.userId, userId), eq(blobs.storageType, "d1")))
      .all();

    let count = 0;
    for (const blob of d1Blobs) {
      if (blob.content) {
        const r2Res = await saveBlobToR2(blob.id, blob.content, userId);
        if (r2Res.storageType === "r2") {
          await db
            .update(blobs)
            .set({
              storageKey: r2Res.storageKey,
              storageType: "r2",
              sizeBytes: r2Res.sizeBytes,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(blobs.id, blob.id))
            .run();
          count++;
        }
      }
    }

    safeRevalidatePath("/");
    return { success: true, migratedCount: count };
  } catch (error: any) {
    console.error("Error in migrateD1BlobsToR2Action:", error);
    return { success: false, migratedCount: 0, error: error.message };
  }
}
