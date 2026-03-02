CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'sent', 'cancelled');--> statement-breakpoint
CREATE TABLE "bot_slash_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_app_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"usage" text DEFAULT '' NOT NULL,
	"arguments" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" uuid NOT NULL,
	"text" text NOT NULL,
	"remind_at" timestamp NOT NULL,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_slash_commands" ADD CONSTRAINT "bot_slash_commands_bot_app_id_bot_apps_id_fk" FOREIGN KEY ("bot_app_id") REFERENCES "public"."bot_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bot_slash_commands_bot_app_id" ON "bot_slash_commands" USING btree ("bot_app_id");--> statement-breakpoint
CREATE INDEX "idx_bot_slash_commands_name" ON "bot_slash_commands" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_reminders_status_remind_at" ON "reminders" USING btree ("status","remind_at");--> statement-breakpoint
CREATE INDEX "idx_reminders_user_id" ON "reminders" USING btree ("user_id");