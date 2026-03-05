CREATE INDEX "idx_workspace_members_user_id" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_invites_workspace_id" ON "workspace_invites" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_channels_workspace_type_archived" ON "channels" USING btree ("workspace_id","type","is_archived");--> statement-breakpoint
CREATE INDEX "attachments_created_at_desc_idx" ON "attachments" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_push_tokens_user_id" ON "push_tokens" USING btree ("user_id");