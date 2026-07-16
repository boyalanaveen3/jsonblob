import { drizzle } from "drizzle-orm/d1";
import { getRequestContext } from "@cloudflare/next-on-pages";
import * as schema from "./schema";

let cachedDb: any = null;

export async function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  let d1: any = null;

  try {
    // Cloudflare binding retrieval in Next.js on Pages
    const context = getRequestContext() as any;
    d1 = context?.env?.DB;
  } catch (error) {
    // Fallback for environments where request context is not set up
  }

  // Fallback to process.env or global context (useful in local dev / mocks)
  if (!d1) {
    d1 = (process.env as any).DB || (globalThis as any).DB;
  }

  // Dynamic Wrangler Platform Proxy fallback for local development (Server Actions sandbox)
  // We check process.env.NEXT_RUNTIME !== "edge" to prevent executing this Node-specific import in Edge sandboxes.
  if (
    !d1 &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_RUNTIME !== "edge" &&
    typeof process !== "undefined" &&
    process.versions?.node
  ) {
    try {
      const wranglerModule = await import(/* webpackIgnore: true */ "wrangler");
      if (wranglerModule && typeof wranglerModule.getPlatformProxy === "function") {
        const { env } = await wranglerModule.getPlatformProxy();
        d1 = env.DB;
      }
    } catch (err) {
      console.error("Failed to load local Wrangler proxy in getDb:", err);
    }
  }

  if (!d1) {
    // To allow next build to succeed without mock bindings, we return a mock object
    // if we detect we are in build/pre-rendering mode.
    if (process.env.NODE_ENV === "production" && !process.env.CF_PAGES) {
      console.warn("D1 Database binding 'DB' not found. Returning mock client for build safety.");
      return drizzle({
        prepare: () => ({ execute: async () => [] }),
        batch: async () => [],
        exec: async () => ({}),
      } as any, { schema });
    }
    
    throw new Error(
      "D1 Database binding 'DB' is not available. Please run with Wrangler or configure the DB binding."
    );
  }

  cachedDb = drizzle(d1, { schema });
  return cachedDb;
}
