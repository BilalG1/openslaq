CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('public', 'private', 'dm');--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DATA TYPE workspace_role USING role::workspace_role;--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "type" SET DATA TYPE channel_type USING type::channel_type;--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "type" SET DEFAULT 'public';