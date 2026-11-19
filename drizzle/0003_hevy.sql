ALTER TABLE `exercise` ADD `cardio_kind` text;--> statement-breakpoint
ALTER TABLE `routine_set` ADD `target_distance_m` real;--> statement-breakpoint
ALTER TABLE `workout` ADD `external_id` text;--> statement-breakpoint
ALTER TABLE `workout` ADD `external_signature` text;--> statement-breakpoint
CREATE INDEX `workout_external_idx` ON `workout` (`external_id`);--> statement-breakpoint
ALTER TABLE `workout_set` ADD `distance_m` real;