CREATE TABLE "push_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" uuid NOT NULL,
	"workspace_slug" text NOT NULL,
	"deliver_after" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_queue" ADD CONSTRAINT "push_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_queue" ADD CONSTRAINT "push_queue_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_push_queue_deliver_after" ON "push_queue" USING btree ("deliver_after");--> statement-breakpoint
CREATE INDEX "idx_push_queue_user_channel" ON "push_queue" USING btree ("user_id","channel_id");