CREATE TABLE "marketplace_auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"listing_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"authorized_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_auth_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"long_description" text,
	"avatar_url" text,
	"category" text,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"webhook_url" text NOT NULL,
	"requested_scopes" text[] NOT NULL,
	"requested_events" text[] NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_listings_slug_unique" UNIQUE("slug"),
	CONSTRAINT "marketplace_listings_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "bot_apps" ADD COLUMN "marketplace_listing_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace_auth_codes" ADD CONSTRAINT "marketplace_auth_codes_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_auth_codes" ADD CONSTRAINT "marketplace_auth_codes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_auth_codes" ADD CONSTRAINT "marketplace_auth_codes_authorized_by_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_marketplace_auth_codes_code" ON "marketplace_auth_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_marketplace_auth_codes_listing_id" ON "marketplace_auth_codes" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_listings_slug" ON "marketplace_listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_marketplace_listings_client_id" ON "marketplace_listings" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "bot_apps" ADD CONSTRAINT "bot_apps_marketplace_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("marketplace_listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE set null ON UPDATE no action;