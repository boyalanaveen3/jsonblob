import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const blobs = sqliteTable("blobs", {
  id: text("id").primaryKey(), // We will use UUIDs
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: text("user_id").references(() => users.id),
  storageKey: text("storage_key"),
  storageType: text("storage_type").default("d1").notNull(),
  sizeBytes: text("size_bytes"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // We will use UUIDs
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Blob = typeof blobs.$inferSelect;
export type NewBlob = typeof blobs.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const snippets = sqliteTable("snippets", {
  id: text("id").primaryKey(), // We will use UUIDs
  title: text("title").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  icon: text("icon"),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").default("default-workspace").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  icon: text("icon"),
  isFavorite: text("is_favorite").default("false").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  requestCount: text("request_count").default("0").notNull(),
  folderCount: text("folder_count").default("0").notNull(),
});

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").references(() => collections.id).notNull(),
  parentId: text("parent_id"), // null for root level folder
  name: text("name").notNull(),
  sortOrder: text("sort_order").default("0").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const apiRequests = sqliteTable("api_requests", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").references(() => collections.id).notNull(),
  folderId: text("folder_id"),
  name: text("name").notNull(),
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  description: text("description"),
  isFavorite: text("is_favorite").default("false").notNull(),
  bodyObjectKey: text("body_object_key"),
  headersObjectKey: text("headers_object_key"),
  testsObjectKey: text("tests_object_key"),
  scriptsObjectKey: text("scripts_object_key"),
  responseExampleKey: text("response_example_key"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const apiRequestHistory = sqliteTable("api_request_history", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => apiRequests.id).notNull(),
  userId: text("user_id").references(() => users.id),
  status: text("status").notNull(),
  responseTime: text("response_time").notNull(),
  executedAt: text("executed_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  responseObjectKey: text("response_object_key"),
});

export const environments = sqliteTable("environments", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").default("default-workspace").notNull(),
  name: text("name").notNull(),
  variablesJson: text("variables_json").notNull(),
  isGlobal: text("is_global").default("false").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type ApiRequest = typeof apiRequests.$inferSelect;
export type NewApiRequest = typeof apiRequests.$inferInsert;
export type ApiRequestHistoryItem = typeof apiRequestHistory.$inferSelect;
export type NewApiRequestHistoryItem = typeof apiRequestHistory.$inferInsert;
export type Environment = typeof environments.$inferSelect;
export type NewEnvironment = typeof environments.$inferInsert;
