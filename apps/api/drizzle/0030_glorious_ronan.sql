ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_invites" DROP CONSTRAINT "workspace_invites_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_mentions" DROP CONSTRAINT "message_mentions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_uploaded_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pinned_messages" DROP CONSTRAINT "pinned_messages_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "pinned_messages" DROP CONSTRAINT "pinned_messages_pinned_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "uploaded_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_pinned_by_users_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;