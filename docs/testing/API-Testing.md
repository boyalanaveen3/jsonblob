# API Testing Specification & Test Suite

## Overview

The API test suite is located at `tests/api/api-endpoints.test.ts`. It executes HTTP verification tests against edge API routes.

---

## Tested API Endpoints

| Endpoint | Method | Test Description | Expected Result |
| :--- | :--- | :--- | :--- |
| `/api/blobs` | `POST` | Create new JSON Blob payload in R2 & D1 metadata | `201 Created`, valid `blob.id` |
| `/api/blobs/[id]` | `GET` | Fetch JSON payload by Blob ID | `200 OK`, matching payload |
| `/api/blobs/[id]` | `DELETE` | Purge Blob from R2 storage & D1 index | `200 OK`, `{ success: true }` |
| `/api/proxy` | `POST` | Execute outbound HTTP request via Edge Proxy | `200 OK`, target payload returned |
| `/api/snippets` | `POST` | Create playground code snippet | `201 Created`, valid `snippet.id` |
| `/api/snippets/[id]` | `GET` | Retrieve snippet details | `200 OK`, matching title |
| `/api/snippets/[id]` | `DELETE` | Remove snippet record | `200 OK`, `{ success: true }` |

---

## Execution Command

```bash
# Run API endpoint test suite against active server (http://localhost:3000)
npm run test:api
```
