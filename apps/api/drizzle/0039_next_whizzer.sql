CREATE TABLE "sentry_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"sentry_organization_slug" text NOT NULL,
	"sentry_installation_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"connected_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentry_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"sentry_connection_id" uuid,
	"project_slug" text NOT NULL,
	"project_id" text NOT NULL,
	"enabled_events" text[] NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentry_connections" ADD CONSTRAINT "sentry_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentry_connections" ADD CONSTRAINT "sentry_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentry_subscriptions" ADD CONSTRAINT "sentry_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentry_subscriptions" ADD CONSTRAINT "sentry_subscriptions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentry_subscriptions" ADD CONSTRAINT "sentry_subscriptions_sentry_connection_id_sentry_connections_id_fk" FOREIGN KEY ("sentry_connection_id") REFERENCES "public"."sentry_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentry_subscriptions" ADD CONSTRAINT "sentry_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sentry_connections_workspace_id" ON "sentry_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_sentry_connections_org_slug" ON "sentry_connections" USING btree ("sentry_organization_slug");--> statement-breakpoint
CREATE INDEX "idx_sentry_subscriptions_workspace_id" ON "sentry_subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_sentry_subscriptions_channel_id" ON "sentry_subscriptions" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_sentry_subscriptions_project_id" ON "sentry_subscriptions" USING btree ("project_id");