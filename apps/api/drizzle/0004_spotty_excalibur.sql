ALTER TABLE "messages" ADD COLUMN "parent_message_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_messages_parent_message_id" ON "messages" USING btree ("parent_message_id");