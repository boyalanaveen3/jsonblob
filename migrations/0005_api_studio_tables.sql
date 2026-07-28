CREATE TABLE IF NOT EXISTS `workspaces` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `color` text,
  `icon` text,
  `user_id` text REFERENCES users(id),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `collections` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text DEFAULT 'default-workspace' NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `color` text,
  `icon` text,
  `is_favorite` text DEFAULT 'false' NOT NULL,
  `created_by` text REFERENCES users(id),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `request_count` text DEFAULT '0' NOT NULL,
  `folder_count` text DEFAULT '0' NOT NULL
);

CREATE TABLE IF NOT EXISTS `folders` (
  `id` text PRIMARY KEY NOT NULL,
  `collection_id` text NOT NULL REFERENCES collections(id),
  `parent_id` text,
  `name` text NOT NULL,
  `sort_order` text DEFAULT '0' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `api_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `collection_id` text NOT NULL REFERENCES collections(id),
  `folder_id` text,
  `name` text NOT NULL,
  `method` text NOT NULL,
  `endpoint` text NOT NULL,
  `description` text,
  `is_favorite` text DEFAULT 'false' NOT NULL,
  `body_object_key` text,
  `headers_object_key` text,
  `tests_object_key` text,
  `scripts_object_key` text,
  `response_example_key` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `api_request_history` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL REFERENCES api_requests(id),
  `user_id` text REFERENCES users(id),
  `status` text NOT NULL,
  `response_time` text NOT NULL,
  `executed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `response_object_key` text
);

CREATE TABLE IF NOT EXISTS `environments` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text DEFAULT 'default-workspace' NOT NULL,
  `name` text NOT NULL,
  `variables_json` text NOT NULL,
  `is_global` text DEFAULT 'false' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
