CREATE TABLE "bot_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"avatar_url" text,
	"webhook_url" text NOT NULL,
	"api_token" text NOT NULL,
	"api_token_prefix" text NOT NULL,
	"scopes" text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_apps_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "bot_event_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_app_id" uuid NOT NULL,
	"event_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"bot_app_id" uuid NOT NULL,
	"actions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_app_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status_code" text,
	"attempts" text DEFAULT '0' NOT NULL,
	"last_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_apps" ADD CONSTRAINT "bot_apps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_apps" ADD CONSTRAINT "bot_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_apps" ADD CONSTRAINT "bot_apps_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_event_subscriptions" ADD CONSTRAINT "bot_event_subscriptions_bot_app_id_bot_apps_id_fk" FOREIGN KEY ("bot_app_id") REFERENCES "public"."bot_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_actions" ADD CONSTRAINT "message_actions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_actions" ADD CONSTRAINT "message_actions_bot_app_id_bot_apps_id_fk" FOREIGN KEY ("bot_app_id") REFERENCES "public"."bot_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_bot_app_id_bot_apps_id_fk" FOREIGN KEY ("bot_app_id") REFERENCES "public"."bot_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bot_apps_workspace_id" ON "bot_apps" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_bot_apps_api_token" ON "bot_apps" USING btree ("api_token");--> statement-breakpoint
CREATE INDEX "idx_bot_apps_user_id" ON "bot_apps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bot_event_subscriptions_bot_app_id" ON "bot_event_subscriptions" USING btree ("bot_app_id");--> statement-breakpoint
CREATE INDEX "idx_bot_event_subscriptions_event_type" ON "bot_event_subscriptions" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_message_actions_message_id" ON "message_actions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_bot_app_id" ON "webhook_deliveries" USING btree ("bot_app_id");