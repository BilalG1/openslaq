CREATE TYPE "public"."scheduled_message_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"attachment_ids" jsonb DEFAULT '[]'::jsonb,
	"scheduled_for" timestamp NOT NULL,
	"status" "scheduled_message_status" DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"sent_message_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_status_scheduled_for" ON "scheduled_messages" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_user_status" ON "scheduled_messages" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_messages_channel_user_status" ON "scheduled_messages" USING btree ("channel_id","user_id","status");