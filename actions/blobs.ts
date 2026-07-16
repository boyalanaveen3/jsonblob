"use server";

import { revalidatePath } from "next/cache";
import { and, eq, like, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blobs, type Blob } from "@/lib/db/schema";
import { cookies } from "next/headers";

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("userId")?.value || null;
}

export async function getBlobsAction(search?: string): Promise<Blob[]> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return [];
    }
    const db = await getDb();
    let list: Blob[] = [];
    if (search) {
      list = await db
        .select()
        .from(blobs)
        .where(
          and(
            eq(blobs.userId, userId),
            or(
              like(blobs.title, `%${search}%`),
              like(blobs.content, `%${search}%`)
            )
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
    const db = await getDb();
    const result = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    if (!result) {
      return null;
    }
    if (result.userId !== userId) {
      return null;
    }
    return result;
  } catch (error) {
    console.error("Error in getBlobAction:", error);
    return null;
  }
}

export async function createBlobAction(title: string, content: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
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

    const newBlob = {
      id: newId,
      title: title.trim(),
      content,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(blobs).values(newBlob).run();
    revalidatePath("/");
    revalidatePath(`/${newId}`);
    return { success: true, blob: newBlob };
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

    await db
      .update(blobs)
      .set({
        title: title.trim(),
        content,
        updatedAt: now,
      })
      .where(eq(blobs.id, id))
      .run();

    const updated = await getBlobAction(id);
    if (!updated) {
      return { success: false, error: "Blob not found after update" };
    }

    revalidatePath("/");
    revalidatePath(`/${id}`);
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

    await db.delete(blobs).where(eq(blobs.id, id)).run();
    revalidatePath("/");
    revalidatePath(`/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteBlobAction:", error);
    return { success: false, error: error.message || "Failed to delete blob" };
  }
}
