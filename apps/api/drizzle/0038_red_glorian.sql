CREATE TABLE "linear_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"linear_organization_id" text NOT NULL,
	"linear_organization_name" text NOT NULL,
	"access_token" text NOT NULL,
	"connected_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linear_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"linear_connection_id" uuid,
	"team_key" text NOT NULL,
	"team_id" text NOT NULL,
	"enabled_events" text[] NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "linear_connections" ADD CONSTRAINT "linear_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linear_connections" ADD CONSTRAINT "linear_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linear_subscriptions" ADD CONSTRAINT "linear_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linear_subscriptions" ADD CONSTRAINT "linear_subscriptions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linear_subscriptions" ADD CONSTRAINT "linear_subscriptions_linear_connection_id_linear_connections_id_fk" FOREIGN KEY ("linear_connection_id") REFERENCES "public"."linear_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linear_subscriptions" ADD CONSTRAINT "linear_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_linear_connections_workspace_id" ON "linear_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_linear_connections_org_id" ON "linear_connections" USING btree ("linear_organization_id");--> statement-breakpoint
CREATE INDEX "idx_linear_subscriptions_workspace_id" ON "linear_subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_linear_subscriptions_channel_id" ON "linear_subscriptions" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_linear_subscriptions_team_id" ON "linear_subscriptions" USING btree ("team_id");