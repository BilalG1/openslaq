CREATE TABLE "github_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"github_installation_id" text NOT NULL,
	"github_account_login" text NOT NULL,
	"github_account_type" text NOT NULL,
	"installed_by" text NOT NULL,
	"access_token" text,
	"access_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"github_installation_id" uuid,
	"repo_full_name" text NOT NULL,
	"enabled_events" text[] NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_subscriptions" ADD CONSTRAINT "github_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_subscriptions" ADD CONSTRAINT "github_subscriptions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_subscriptions" ADD CONSTRAINT "github_subscriptions_github_installation_id_github_installations_id_fk" FOREIGN KEY ("github_installation_id") REFERENCES "public"."github_installations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_subscriptions" ADD CONSTRAINT "github_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_github_installations_workspace_id" ON "github_installations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_github_installations_github_id" ON "github_installations" USING btree ("github_installation_id");--> statement-breakpoint
CREATE INDEX "idx_github_subscriptions_workspace_id" ON "github_subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_github_subscriptions_channel_id" ON "github_subscriptions" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_github_subscriptions_repo" ON "github_subscriptions" USING btree ("repo_full_name");