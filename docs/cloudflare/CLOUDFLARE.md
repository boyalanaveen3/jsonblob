# Cloudflare Integration Guide

## Overview

Developer Workspace is built for Cloudflare's edge platform.

---

## 1. Cloudflare Bindings (`wrangler.toml`)

```toml
name = "jsonblob-app"
main = ".vercel/output/static/_worker.js"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "jsonblob-db"
database_id = "1ad3573e-3f03-4906-8599-0b66d06cdc0f"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "devworkspace"
```

---

## 2. D1 CLI Commands

```bash
# Execute query on remote D1
npx wrangler d1 execute jsonblob-db --remote --command="SELECT COUNT(*) FROM api_requests;"

# Run migrations on remote D1
npx wrangler d1 execute jsonblob-db --remote --file=./drizzle/0000_initial.sql
```

---

## 3. R2 Bucket Lifecycle Rules

Objects in `collections/.../history/` can be configured with a 30-day lifecycle expiration policy in the Cloudflare R2 dashboard to automatically maintain object storage efficiency.
