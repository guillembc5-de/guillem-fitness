CREATE TABLE `activity_day` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`local_date` text NOT NULL,
	`active_kcal` real,
	`exercise_min` integer,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_day_date_idx` ON `activity_day` (`local_date`);--> statement-breakpoint
CREATE TABLE `external_workout` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`external_id` text NOT NULL,
	`local_date` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`activity_type` integer NOT NULL,
	`duration_s` integer NOT NULL,
	`kcal` real,
	`distance_m` real,
	`source_name` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_workout_ext_idx` ON `external_workout` (`external_id`);--> statement-breakpoint
CREATE INDEX `external_workout_date_idx` ON `external_workout` (`local_date`);