# Enterprise Architecture Overview & Visual Specifications

This document details the 15 architectural flows of Developer Workspace.

---

## 1. Overall System Architecture

```
                                  +-----------------------+
                                  |     Browser Client    |
                                  | (React 19 / Monaco)   |
                                  +-----------+-----------+
                                              |
                                    HTTPS / WSS / REST
                                              |
                                              v
                                  +-----------------------+
                                  | Cloudflare Pages Edge |
                                  | (Next.js App Router)  |
                                  +-----------+-----------+
                                              |
             +--------------------------------+--------------------------------+
             |                                |                                |
             v                                v                                v
+-------------------------+      +-------------------------+      +-------------------------+
|   Cloudflare D1 (SQL)   |      |   Cloudflare R2 (S3)    |      |    External Services    |
|      Metadata Index     |      |     Object Storage      |      |   (Cloudflare OAuth,    |
+-------------------------+      +-------------------------+      |      Gemini AI)         |
| - blobs                 |      | - JSON Blobs            |      +-------------------------+
| - workspaces            |      | - API Request Bodies    |
| - collections           |      | - Headers & Test Scripts|
| - api_requests          |      | - Response Histories    |
| - api_request_history   |      +-------------------------+
+-------------------------+
```

---

## 2. Frontend Architecture

```
+-----------------------------------------------------------------------------------+
|                                 App Router Layer                                  |
|   / (Dashboard)      /[id] (Blob Viewer)      /playground (Code Studio)          |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                               State Management Layer                              |
|   Zustand (Global Workspace State, Active Blob, Active API Request, History)     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                 Component Modules                                 |
|  - Monaco JSON Editor      - ApiStudioView        - StorageStatusPanel            |
|  - SqlEditor               - Tree / Graph View    - HistorySidebar                |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              Web Worker Sandbox Runtimes                          |
|  - SQLite Client Engine    - JS Worker            - Pyodide / Java Runtime Worker |
+-----------------------------------------------------------------------------------+
```

---

## 3. Backend Architecture

```
+-----------------------------------------------------------------------------------+
|                             Next.js Edge Server Actions                           |
|  - actions/blobs.ts        - actions/apiStudio.ts       - actions/sqlQuery.ts     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                Storage Service Layer                              |
|  - lib/services/storageService.ts (Deterministic Key Gen & Rollback Logic)         |
|  - lib/storage/r2ApiStudioStorage.ts (Payload Put/Get/Delete)                      |
+-----------------------------------------+-----------------------------------------+
                                          |
                 +------------------------+------------------------+
                 v                                                 v
+----------------------------------+             +----------------------------------+
|      Drizzle ORM D1 Driver       |             |   Cloudflare R2 Storage Binding  |
|     (db.select() / db.insert())  |             |     (env.STORAGE.put / get)      |
+----------------------------------+             +----------------------------------+
```

---

## 4. Authentication Flow

```
User Click Login
  │
  ▼
Redirect to Cloudflare OAuth (`/api/auth/cloudflare`)
  │
  ▼
Authenticate on Cloudflare Identity Portal (`dash.cloudflare.com`)
  │
  ▼
OAuth Callback with Auth Code (`/api/auth/cloudflare/callback`)
  │
  ▼
Exchange Token Server-Side -> Set Session Cookie (`cf_session`)
  │
  ▼
Redirect User to `/dashboard` with Active Session
```

---

## 5. Cloudflare OAuth Flow

```
+--------+            +------------------+         +------------------+         +------------------+
| Client |            | App Edge Server  |         | Cloudflare OAuth |         | Cloudflare API   |
+---+----+            +--------+---------+         +--------+---------+         +--------+---------+
    |                          |                            |                            |
    |--- 1. GET /api/auth ---->|                            |                            |
    |                          |--- 2. Redirect to Auth --->|                            |
    |                          |                            |-- 3. User Authenticates -->|
    |<-- 4. Auth Code Callback +----------------------------|                            |
    |                          |                                                         |
    |                          |--- 5. Exchange Code for Access Token ------------------>|
    |                          |<-- 6. Access Token & User Profile ----------------------|
    |<-- 7. Set HTTP-only Cookie|                                                         |
```

---

## 6. D1 Database Architecture

```
+-------------------+           +-------------------+           +-------------------+
|    workspaces     |           |    collections    |           |    api_requests   |
+-------------------+           +-------------------+           +-------------------+
| PK id             |<----+     | PK id             |<----+     | PK id             |
| name              |     |     | FK workspace_id   |----+|     | FK collection_id  |----+
| color             |     +-----| name              |     ||    | name              |    |
| created_at        |           +-------------------+     ||    | method, endpoint  |    |
+-------------------+                                     ||    | body_object_key   |    |
                                                          ||    | headers_object_key|    |
                                                          ||    +-------------------+    |
                                                          ||                             |
+-------------------+           +-------------------+     ||    +--------------------+   |
|       blobs       |           |      folders      |     ||    | api_request_history|   |
+-------------------+           +-------------------+     ||    +--------------------+   |
| PK id             |           | PK id             |     ||    | PK id              |   |
| storage_key       |           | FK collection_id  |-----+|    | FK request_id      |---+
| title             |           | name              |      |    | status, time       |
| size              |           +-------------------+      |    | response_obj_key   |
+-------------------+                                      +----+--------------------+
```

---

## 7. R2 Storage Architecture

```
devworkspace (Cloudflare R2 Bucket)
│
├── blobs/
│   └── {user_id}/{blob_id}.json                     <-- Main JSON Blob payloads
│
└── collections/
    └── {workspace_id}/{collection_id}/
        ├── {request_id}/
        │   ├── body.json                            <-- Request body content
        │   ├── headers.json                         <-- Custom request headers
        │   ├── tests.js                             <-- Postman-style test scripts
        │   ├── scripts.js                           <-- Pre-request scripts
        │   └── response.json                        <-- Saved response example
        └── history/
            └── {history_id}_response.json           <-- Historical execution body
```

---

## 8. API Collection Architecture

```
Collection Folder ("Payment API Integration")
│
├── Pre-request Scripts & Environment Variables
│
├── Folders ("Authentication", "Webhooks")
│   │
│   └── API Requests ("POST /v1/charge")
│       ├── Method: POST
│       ├── Endpoint: https://api.stripe.com/v1/charges
│       ├── Body (R2): {"amount": 2000, "currency": "usd"}
│       └── Execution History (D1 + R2)
```

---

## 9. SQL Editor Architecture

```
User Query Input
  │
  ▼
Local Client Sandbox Check
  ├── Web Worker (SQLite Wasm) -> In-Memory Execution -> Return Results
  └── Remote D1 Execution -> POST /api/sql/query -> Execute Remote Query -> Return Results
```

---

## 10. AI Service Architecture

```
User Prompt ("Generate synthetic user data schema")
  │
  ▼
POST /api/ai
  │
  ▼
Extract System Context (Current SQL Tables & Schema)
  │
  ▼
Call Gemini AI API Engine (with structured JSON prompt)
  │
  ▼
Return Validated SQL/TypeScript Code Block to Editor
```

---

## 11. Blob Save Flow

```
Client Clicks Save Blob
  │
  ▼
Upload Payload to R2 (`blobs/{userId}/{blobId}.json`)
  │
  ▼
Verify Upload via R2 HEAD Check
  │
  ▼
Save Metadata Row in D1 (`blobs` table)
  │
  ├─► If D1 error: Delete R2 object (Rollback) & Fail
  │
  ▼
Return Success Response & Update UI
```

---

## 12. Blob Read Flow

```
User Navigates to `/[blobId]`
  │
  ▼
Query Metadata from D1 (`SELECT * FROM blobs WHERE id = blobId`)
  │
  ▼
Fetch Payload Content from R2 using `storage_key`
  │
  ▼
Parse JSON Content & Render in Monaco Editor
```

---

## 13. Collection CRUD Flow

```
User Creates / Updates / Deletes Collection
  │
  ▼
Client Calls Server Action (`createCollectionAction` / `deleteCollectionAction`)
  │
  ▼
If Delete: Cascade purge associated R2 request body objects
  │
  ▼
Update D1 metadata tables (`collections`, `api_requests`, `folders`)
  │
  ▼
Revalidate Page Cache (`revalidatePath('/api')`)
```

---

## 14. Request History Flow

```
User Clicks Send Request
  │
  ▼
Execute Request via Edge Proxy (`/api/proxy`)
  │
  ▼
Upload Response Payload to R2 (`collections/.../history/{id}_response.json`)
  │
  ▼
Auto-Ensure Request Row exists in D1 (`api_requests`)
  │
  ▼
Save Execution Metadata to D1 (`api_request_history`)
  │
  ▼
Update History List in UI
```

---

## 15. Deployment Architecture

```
Git Push to Repository
  │
  ▼
Cloudflare Pages Build Trigger (`@cloudflare/next-on-pages`)
  │
  ▼
Compile Edge Worker Bundle (`.vercel/output/static`)
  │
  ▼
Deploy Global Worker to 300+ Cloudflare Edge Locations
  │
  ▼
Live Endpoint Active (`https://uat.jsonblob-app.pages.dev`)
```
