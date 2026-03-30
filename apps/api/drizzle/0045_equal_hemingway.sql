CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_workspace_key_idx" ON "feature_flags" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "feature_flags_workspace_id_idx" ON "feature_flags" USING btree ("workspace_id");--> statement-breakpoint
INSERT INTO "feature_flags" ("workspace_id", "key", "value")
  SELECT "id", 'integrationGithub', 'true' FROM "workspaces" WHERE "integration_github" = true;--> statement-breakpoint
INSERT INTO "feature_flags" ("workspace_id", "key", "value")
  SELECT "id", 'integrationLinear', 'true' FROM "workspaces" WHERE "integration_linear" = true;--> statement-breakpoint
INSERT INTO "feature_flags" ("workspace_id", "key", "value")
  SELECT "id", 'integrationSentry', 'true' FROM "workspaces" WHERE "integration_sentry" = true;--> statement-breakpoint
INSERT INTO "feature_flags" ("workspace_id", "key", "value")
  SELECT "id", 'integrationVercel', 'true' FROM "workspaces" WHERE "integration_vercel" = true;--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "integration_github";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "integration_linear";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "integration_sentry";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "integration_vercel";