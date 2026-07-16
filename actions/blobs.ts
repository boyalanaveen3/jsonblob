"use server";

import { revalidatePath } from "next/cache";
import { eq, like, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blobs, type Blob } from "@/lib/db/schema";

export async function getBlobsAction(search?: string): Promise<Blob[]> {
  try {
    const db = await getDb();
    if (search) {
      return await db
        .select()
        .from(blobs)
        .where(
          or(
            like(blobs.title, `%${search}%`),
            like(blobs.content, `%${search}%`)
          )
        )
        .orderBy(blobs.updatedAt); // SQL order by updated_at desc is safer, let's do sort in code or query
    }
    return await db.select().from(blobs).all();
  } catch (error) {
    console.error("Error in getBlobsAction:", error);
    return [];
  }
}

export async function getBlobAction(id: string): Promise<Blob | null> {
  try {
    const db = await getDb();
    const result = (await db.select().from(blobs).where(eq(blobs.id, id)).all())[0];
    return result || null;
  } catch (error) {
    console.error("Error in getBlobAction:", error);
    return null;
  }
}

export async function createBlobAction(title: string, content: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
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
    const db = await getDb();
    await db.delete(blobs).where(eq(blobs.id, id)).run();
    revalidatePath("/");
    revalidatePath(`/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteBlobAction:", error);
    return { success: false, error: error.message || "Failed to delete blob" };
  }
}
