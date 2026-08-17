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

export const testProjects = sqliteTable("test_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectType: text("project_type").notNull(), // 'web' | 'mobile' | 'web_mobile'
  sourceType: text("source_type").default("zip").notNull(), // 'zip' | 'github'
  sourceR2Key: text("source_r2_key"),
  baseUrl: text("base_url"),
  environment: text("environment").default("development"),
  framework: text("framework"),
  status: text("status").default("active").notNull(),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const testSuites = sqliteTable("test_suites", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => testProjects.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  platform: text("platform").notNull(), // 'web' | 'mobile'
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const testCases = sqliteTable("test_cases", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => testProjects.id)
    .notNull(),
  suiteId: text("suite_id").references(() => testSuites.id),
  name: text("name").notNull(),
  description: text("description"),
  platform: text("platform").notNull(), // 'web' | 'mobile'
  priority: text("priority").default("medium").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  testType: text("test_type").default("ui").notNull(), // 'ui' | 'api' | 'e2e' | 'negative'
  fileR2Key: text("file_r2_key"),
  code: text("code"),
  status: text("status").default("active").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const testRuns = sqliteTable("test_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => testProjects.id)
    .notNull(),
  environmentId: text("environment_id"),
  status: text("status").default("queued").notNull(), // 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'
  platform: text("platform").notNull(), // 'web' | 'mobile' | 'web_mobile'
  totalTests: text("total_tests").default("0").notNull(),
  passed: text("passed").default("0").notNull(),
  failed: text("failed").default("0").notNull(),
  skipped: text("skipped").default("0").notNull(),
  durationMs: text("duration_ms").default("0").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  errorMessage: text("error_message"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const testResults = sqliteTable("test_results", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .references(() => testRuns.id)
    .notNull(),
  testCaseId: text("test_case_id").references(() => testCases.id),
  name: text("name").notNull(),
  status: text("status").notNull(), // 'passed' | 'failed' | 'skipped'
  durationMs: text("duration_ms").default("0").notNull(),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  retryCount: text("retry_count").default("0").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const testArtifacts = sqliteTable("test_artifacts", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .references(() => testRuns.id)
    .notNull(),
  testResultId: text("test_result_id").references(() => testResults.id),
  artifactType: text("artifact_type").notNull(), // 'report' | 'screenshot' | 'video' | 'trace' | 'log'
  r2Key: text("r2_key").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const testGenerations = sqliteTable("test_generations", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => testProjects.id)
    .notNull(),
  prompt: text("prompt").notNull(),
  model: text("model").default("gemini-3.6-flash").notNull(),
  testPlan: text("test_plan"),
  generatedCount: text("generated_count").default("0").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const testEnvironments = sqliteTable("test_environments", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => testProjects.id)
    .notNull(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiUrl: text("api_url"),
  variablesJson: text("variables_json"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type TestProject = typeof testProjects.$inferSelect;
export type NewTestProject = typeof testProjects.$inferInsert;
export type TestSuite = typeof testSuites.$inferSelect;
export type NewTestSuite = typeof testSuites.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;
export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;
export type TestArtifact = typeof testArtifacts.$inferSelect;
export type NewTestArtifact = typeof testArtifacts.$inferInsert;
export type TestGeneration = typeof testGenerations.$inferSelect;
export type NewTestGeneration = typeof testGenerations.$inferInsert;
export type TestEnvironment = typeof testEnvironments.$inferSelect;
export type NewTestEnvironment = typeof testEnvironments.$inferInsert;

