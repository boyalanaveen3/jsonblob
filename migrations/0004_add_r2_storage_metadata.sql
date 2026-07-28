ALTER TABLE `blobs` ADD COLUMN `storage_key` text;
ALTER TABLE `blobs` ADD COLUMN `storage_type` text DEFAULT 'd1' NOT NULL;
ALTER TABLE `blobs` ADD COLUMN `size_bytes` text;
