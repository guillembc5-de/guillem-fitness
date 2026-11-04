CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`search_name` text NOT NULL,
	`muscle_group` text NOT NULL,
	`secondary_muscles` text DEFAULT '[]' NOT NULL,
	`equipment` text NOT NULL,
	`tracking_type` text NOT NULL,
	`default_rest_seconds` integer,
	`is_custom` integer DEFAULT false NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `exercise_search_idx` ON `exercise` (`search_name`);--> statement-breakpoint
CREATE INDEX `exercise_muscle_idx` ON `exercise` (`muscle_group`);--> statement-breakpoint
CREATE TABLE `food_item` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`meal_id` text NOT NULL,
	`name` text NOT NULL,
	`grams` real NOT NULL,
	`kcal_per_100g` real NOT NULL,
	`protein_per_100g` real NOT NULL,
	`carbs_per_100g` real NOT NULL,
	`fat_per_100g` real NOT NULL,
	`ai_estimated` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meal`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `food_item_meal_idx` ON `food_item` (`meal_id`);--> statement-breakpoint
CREATE TABLE `meal` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`is_demo` integer DEFAULT false NOT NULL,
	`local_date` text NOT NULL,
	`meal_type` text NOT NULL,
	`eaten_at` integer NOT NULL,
	`source` text NOT NULL,
	`photo_uri` text,
	`ai_provider` text
);
--> statement-breakpoint
CREATE INDEX `meal_date_idx` ON `meal` (`local_date`);--> statement-breakpoint
CREATE TABLE `pending_photo` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`photo_uri` text NOT NULL,
	`meal_type` text NOT NULL,
	`local_date` text NOT NULL,
	`captured_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sex` text NOT NULL,
	`birth_year` integer NOT NULL,
	`height_cm` real NOT NULL,
	`weight_kg` real NOT NULL,
	`activity_level` text NOT NULL,
	`goal` text NOT NULL,
	`goal_rate_kg_week` real NOT NULL,
	`step_goal` integer NOT NULL,
	`weight_unit` text NOT NULL,
	`default_rest_seconds` integer NOT NULL,
	`ai_provider` text NOT NULL,
	`gemini_model` text NOT NULL,
	`claude_model` text NOT NULL,
	`onboarding_completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `routine` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `routine_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`rest_seconds` integer,
	`notes` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routine_exercise_routine_idx` ON `routine_exercise` (`routine_id`);--> statement-breakpoint
CREATE TABLE `routine_set` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`routine_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`target_weight_kg` real,
	`target_reps` integer,
	`target_duration_s` integer,
	FOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_set_re_idx` ON `routine_set` (`routine_exercise_id`);--> statement-breakpoint
CREATE TABLE `step_day` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`is_demo` integer DEFAULT false NOT NULL,
	`local_date` text NOT NULL,
	`steps` integer NOT NULL,
	`distance_m` real NOT NULL,
	`kcal` real NOT NULL,
	`source` text NOT NULL,
	`goal_snapshot` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `step_day_date_idx` ON `step_day` (`local_date`);--> statement-breakpoint
CREATE TABLE `workout` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`is_demo` integer DEFAULT false NOT NULL,
	`routine_id` text,
	`name` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`local_date` text NOT NULL,
	`rest_ends_at` integer,
	`rest_notification_id` text,
	`notes` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_started_idx` ON `workout` (`started_at`);--> statement-breakpoint
CREATE INDEX `workout_ended_idx` ON `workout` (`ended_at`);--> statement-breakpoint
CREATE TABLE `workout_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_name_snapshot` text NOT NULL,
	`position` integer NOT NULL,
	`rest_seconds` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_exercise_workout_idx` ON `workout_exercise` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_exercise_exercise_idx` ON `workout_exercise` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_set` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`workout_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`duration_s` integer,
	`completed_at` integer,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_set_we_idx` ON `workout_set` (`workout_exercise_id`);