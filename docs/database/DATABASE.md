# Cloudflare D1 Database Specification

## Overview

Developer Workspace uses **Cloudflare D1** (SQLite edge database) strictly for relational index tracking and metadata.

---

## Schema Tables

### 1. `blobs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Unique Blob UUID |
| `user_id` | TEXT (FK) | Reference to `users.id` |
| `storage_key` | TEXT | R2 Object Key (`blobs/{user_id}/{id}.json`) |
| `title` | TEXT | Human readable title |
| `size` | INTEGER | Payload size in bytes |
| `is_public` | TEXT | Public access toggle (`true`/`false`) |
| `created_at` | TEXT | Timestamp |

### 2. `workspaces`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Workspace UUID |
| `name` | TEXT | Workspace name |
| `description` | TEXT | Detailed description |

### 3. `collections`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Collection UUID |
| `workspace_id` | TEXT (FK) | Reference to `workspaces.id` |
| `name` | TEXT | Collection folder name |

### 4. `api_requests`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Request UUID |
| `collection_id` | TEXT (FK) | Reference to `collections.id` |
| `name` | TEXT | Request title |
| `method` | TEXT | HTTP Method |
| `endpoint` | TEXT | Target URL |
| `body_object_key` | TEXT | R2 key for request body |
| `headers_object_key` | TEXT | R2 key for headers |
| `tests_object_key` | TEXT | R2 key for test scripts |

### 5. `api_request_history`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | History Item UUID |
| `request_id` | TEXT (FK) | Reference to `api_requests.id` |
| `status` | TEXT | HTTP response status code |
| `response_time` | TEXT | Duration string (e.g. `312ms`) |
| `executed_at` | TEXT | Timestamp |
| `response_object_key` | TEXT | R2 key for response body payload |

---

## Indexes & Constraints
- Foreign key constraints on `collection_id`, `request_id`, and `workspace_id`.
- Foreign key cascading deletion handling programmatically in server actions to ensure R2 objects are cleaned up before metadata rows are deleted.
