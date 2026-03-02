ALTER TYPE "public"."channel_type" ADD VALUE 'group_dm';--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "display_name" text;