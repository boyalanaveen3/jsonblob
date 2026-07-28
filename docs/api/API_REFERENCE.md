# Developer Workspace - API Reference

## Authentication

All edge endpoints support optional session cookie authentication (`cf_session`) or user identifier headers (`x-user-id`). Unauthenticated requests fall back to default workspace parameters.

---

## 1. Blobs SaaS APIs

### `POST /api/blobs`
Creates a new JSON blob in Cloudflare R2 and indexes metadata in Cloudflare D1.

**Request Body**:
```json
{
  "title": "My Config Blob",
  "content": "{\"key\": \"value\"}",
  "isPublic": true,
  "cors": "*"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "blob": {
    "id": "20e39f47-b44d-4faf-947b-4837e734ce3b",
    "title": "My Config Blob",
    "storageKey": "blobs/default-user/20e39f47-b44d-4faf-947b-4837e734ce3b.json",
    "size": 16,
    "createdAt": "2026-07-28T12:00:00.000Z"
  }
}
```

---

### `GET /api/blobs/[id]`
Retrieves blob metadata and JSON payload.

**Response (200 OK)**:
```json
{
  "id": "20e39f47-b44d-4faf-947b-4837e734ce3b",
  "title": "My Config Blob",
  "content": "{\"key\": \"value\"}",
  "size": 16
}
```

---

### `DELETE /api/blobs/[id]`
Purges blob payload from R2 and removes metadata row from D1.

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Blob purged successfully"
}
```

---

## 2. API Studio Edge Proxy API

### `POST /api/proxy`
Executes HTTP requests from the edge server to bypass browser CORS restrictions.

**Request Body**:
```json
{
  "url": "https://postman-echo.com/post",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"hello\": \"world\"}"
}
```

**Response (200 OK)**:
```json
{
  "status": 200,
  "statusText": "OK",
  "durationMs": 312,
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\n  \"hello\": \"world\"\n}"
}
```

---

## 3. SQL Engine API

### `POST /api/sql/query`
Executes SQL queries against Cloudflare D1 database.

**Request Body**:
```json
{
  "sql": "SELECT * FROM api_requests WHERE collection_id = ?",
  "params": ["default-collection"]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "rows": [],
  "durationMs": 8
}
```

---

## 4. AI Assistant API

### `POST /api/ai`
Generates or optimizes SQL/TypeScript code using Gemini AI.

**Request Body**:
```json
{
  "prompt": "Generate a user authentication table migration",
  "action": "generate_sql"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "code": "CREATE TABLE users (\n  id TEXT PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE\n);"
}
```
