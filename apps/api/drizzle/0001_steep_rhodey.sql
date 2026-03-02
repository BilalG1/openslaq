ALTER TABLE "channels" DROP CONSTRAINT "channels_workspace_id_name_unique";--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "type" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspace_id_name_type_unique" UNIQUE("workspace_id","name","type");