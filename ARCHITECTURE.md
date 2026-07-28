# Developer Workspace - Architecture Documentation

## Executive Architecture Summary

**Developer Workspace** is an edge-optimized SaaS developer platform built on Next.js App Router and Cloudflare infrastructure. The architecture follows a strict **Decoupled Hybrid Storage Architecture**:

1. **Relational Index Layer (Cloudflare D1)**: Stores database records, entity IDs, metadata, execution timestamps, and references to R2 keys.
2. **Binary Content Layer (Cloudflare R2)**: Stores actual JSON payloads, API request bodies, headers, pre-request scripts, unit test scripts, and historical response bodies.

---

## 1. High-Level System Architecture

```
                                  +-----------------------+
                                  |   User Browser Client |
                                  +-----------+-----------+
                                              |
                                     (HTTPS / Edge Fetch)
                                              |
                                              v
                                  +-----------------------+
                                  | Cloudflare Pages Edge |
                                  | Next.js App Router    |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
        +-------------------------+                       +-------------------------+
        |   Cloudflare D1 (SQL)   |                       |   Cloudflare R2 (S3)    |
        |     Relational Meta     |                       |     Object Bucket       |
        +-------------------------+                       +-------------------------+
        | - blobs metadata        |                       | - blobs/<id>.json       |
        | - workspaces metadata   |                       | - collections/.../body  |
        | - collections metadata  |                       | - history/.../res.json  |
        | - api_requests meta     |                       +-------------------------+
        | - api_request_history   |
        +-------------------------+
```

---

## 2. Hybrid Storage Verification & Transaction Flow

To avoid orphaned objects or inconsistent state between D1 and R2, all mutation operations follow the **Atomic Verification Pattern**:

```
Client Action
     │
     ▼
[Step 1: Upload Payload to Cloudflare R2]
     │
     ├─► Failure: Throw Error (Abort operation)
     │
     ▼
[Step 2: HEAD / GET Verification in R2]
     │
     ├─► Failure: Retry 3x or cleanup & fail
     │
     ▼
[Step 3: Save Metadata Row in Cloudflare D1]
     │
     ├─► Failure: Delete R2 Payload (Rollback) & Throw Error
     │
     ▼
[Step 4: Return Verified Success Response]
```

---

## 3. Module Breakdown

### A. API Studio Module
- **Collections & Folders**: Hierarchical API structure managed in D1.
- **Request Payloads**: Request body, headers, tests, and scripts stored separately in R2 (`collections/{workspace_id}/{collection_id}/{req_id}/body.json`).
- **Edge Proxy Service (`/api/proxy`)**: Serverless Edge Function executing HTTP calls to eliminate CORS blocks during API testing.

### B. JSON Blob SaaS Module
- **Monaco Editor Integration**: Real-time syntax checking, schema validation with Ajv.
- **Shortlink Routing (`/[id]`)**: Resolves blob metadata from D1, fetches payload from R2, streams response to user.

### C. Client Sandbox & AI Module
- **SQLite In-Browser**: Web Worker powered client sandbox for zero-latency query execution.
- **AI Integration**: Edge route forwarding query prompts to Gemini AI engine with contextual schema injection.

---

*For full deep-dive visual architecture diagrams, refer to [docs/architecture/FULL_ARCHITECTURE.md](docs/architecture/FULL_ARCHITECTURE.md).*
