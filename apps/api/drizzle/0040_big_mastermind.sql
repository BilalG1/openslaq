CREATE TABLE "vercel_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"vercel_team_id" text NOT NULL,
	"vercel_team_slug" text NOT NULL,
	"vercel_configuration_id" text NOT NULL,
	"access_token" text NOT NULL,
	"connected_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vercel_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"vercel_connection_id" uuid,
	"project_name" text NOT NULL,
	"project_id" text NOT NULL,
	"enabled_events" text[] NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vercel_connections" ADD CONSTRAINT "vercel_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vercel_connections" ADD CONSTRAINT "vercel_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vercel_subscriptions" ADD CONSTRAINT "vercel_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vercel_subscriptions" ADD CONSTRAINT "vercel_subscriptions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vercel_subscriptions" ADD CONSTRAINT "vercel_subscriptions_vercel_connection_id_vercel_connections_id_fk" FOREIGN KEY ("vercel_connection_id") REFERENCES "public"."vercel_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vercel_subscriptions" ADD CONSTRAINT "vercel_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vercel_connections_workspace_id" ON "vercel_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_vercel_connections_team_id" ON "vercel_connections" USING btree ("vercel_team_id");--> statement-breakpoint
CREATE INDEX "idx_vercel_subscriptions_workspace_id" ON "vercel_subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_vercel_subscriptions_channel_id" ON "vercel_subscriptions" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_vercel_subscriptions_project_id" ON "vercel_subscriptions" USING btree ("project_id");