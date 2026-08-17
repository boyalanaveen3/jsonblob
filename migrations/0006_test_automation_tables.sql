CREATE TABLE IF NOT EXISTS `test_projects` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `project_type` text NOT NULL,
  `source_type` text DEFAULT 'zip' NOT NULL,
  `source_r2_key` text,
  `base_url` text,
  `environment` text DEFAULT 'development',
  `framework` text,
  `status` text DEFAULT 'active' NOT NULL,
  `user_id` text REFERENCES users(id),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `test_suites` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES test_projects(id),
  `name` text NOT NULL,
  `description` text,
  `platform` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `test_cases` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES test_projects(id),
  `suite_id` text REFERENCES test_suites(id),
  `name` text NOT NULL,
  `description` text,
  `platform` text NOT NULL,
  `priority` text DEFAULT 'medium' NOT NULL,
  `test_type` text DEFAULT 'ui' NOT NULL,
  `file_r2_key` text,
  `code` text,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `test_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES test_projects(id),
  `environment_id` text,
  `status` text DEFAULT 'queued' NOT NULL,
  `platform` text NOT NULL,
  `total_tests` text DEFAULT '0' NOT NULL,
  `passed` text DEFAULT '0' NOT NULL,
  `failed` text DEFAULT '0' NOT NULL,
  `skipped` text DEFAULT '0' NOT NULL,
  `duration_ms` text DEFAULT '0' NOT NULL,
  `started_at` text,
  `completed_at` text,
  `error_message` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `test_results` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL REFERENCES test_runs(id),
  `test_case_id` text REFERENCES test_cases(id),
  `name` text NOT NULL,
  `status` text NOT NULL,
  `duration_ms` text DEFAULT '0' NOT NULL,
  `error_message` text,
  `stack_trace` text,
  `retry_count` text DEFAULT '0' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `test_artifacts` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL REFERENCES test_runs(id),
  `test_result_id` text REFERENCES test_results(id),
  `artifact_type` text NOT NULL,
  `r2_key` text NOT NULL,
  `file_name` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `test_generations` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES test_projects(id),
  `prompt` text NOT NULL,
  `model` text DEFAULT 'gemini-3.6-flash' NOT NULL,
  `test_plan` text,
  `generated_count` text DEFAULT '0' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `test_environments` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES test_projects(id),
  `name` text NOT NULL,
  `base_url` text NOT NULL,
  `api_url` text,
  `variables_json` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_test_cases_project_id` ON `test_cases` (`project_id`);
CREATE INDEX IF NOT EXISTS `idx_test_cases_suite_id` ON `test_cases` (`suite_id`);
CREATE INDEX IF NOT EXISTS `idx_test_runs_project_id` ON `test_runs` (`project_id`);
CREATE INDEX IF NOT EXISTS `idx_test_runs_status` ON `test_runs` (`status`);
CREATE INDEX IF NOT EXISTS `idx_test_results_run_id` ON `test_results` (`run_id`);
