import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface Env {
    DB: D1Database;
    STORAGE: R2Bucket;
    JSON_BLOB_BUCKET?: R2Bucket;
    CLOUDFLARE_CLIENT_ID?: string;
    CLOUDFLARE_CLIENT_SECRET?: string;
    CLOUDFLARE_REDIRECT_URI?: string;
    NEXT_PUBLIC_APP_URL?: string;
  }
}

export {};
