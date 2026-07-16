ALTER TABLE `blobs` ADD COLUMN `user_id` text REFERENCES users(id);
