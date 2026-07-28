ALTER TABLE `blobs` ADD COLUMN `storage_key` text;--> statement-breakpoint
ALTER TABLE `blobs` ADD COLUMN `storage_type` text DEFAULT 'd1' NOT NULL;--> statement-breakpoint
ALTER TABLE `blobs` ADD COLUMN `size_bytes` text;
