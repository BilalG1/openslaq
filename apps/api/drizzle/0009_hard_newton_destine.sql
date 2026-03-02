DROP INDEX "idx_messages_parent_message_id";--> statement-breakpoint
CREATE INDEX "idx_channel_members_user_channel" ON "channel_members" USING btree ("user_id","channel_id");--> statement-breakpoint
CREATE INDEX "idx_messages_channel_toplevel_created_at" ON "messages" USING btree ("channel_id","created_at" DESC) WHERE "messages"."parent_message_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_messages_parent_created_at" ON "messages" USING btree ("parent_message_id","created_at");