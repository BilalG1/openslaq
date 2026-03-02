CREATE TABLE "message_mentions" (
	"message_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "message_mentions_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_message_mentions_user_id" ON "message_mentions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_message_mentions_message_id" ON "message_mentions" USING btree ("message_id");