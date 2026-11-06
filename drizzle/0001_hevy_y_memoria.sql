CREATE TABLE `food_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`search_name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`grams` real NOT NULL,
	`kcal_per_100g` real NOT NULL,
	`protein_per_100g` real NOT NULL,
	`carbs_per_100g` real NOT NULL,
	`fat_per_100g` real NOT NULL,
	`times_confirmed` integer NOT NULL,
	`ai_grams_total` real DEFAULT 0 NOT NULL,
	`final_grams_total` real DEFAULT 0 NOT NULL,
	`ai_samples` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `food_memory_search_idx` ON `food_memory` (`search_name`);--> statement-breakpoint
CREATE TABLE `routine_folder` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `routine` ADD `folder_id` text;--> statement-breakpoint
ALTER TABLE `routine_exercise` ADD `superset_id` text;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `superset_id` text;--> statement-breakpoint
ALTER TABLE `workout_set` ADD `rpe` real;