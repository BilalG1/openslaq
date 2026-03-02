CREATE TABLE "link_previews" (
	"url" text PRIMARY KEY NOT NULL,
	"title" text,
	"description" text,
	"image_url" text,
	"site_name" text,
	"favicon_url" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"fetch_error" text
);
--> statement-breakpoint
CREATE TABLE "message_link_previews" (
	"message_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "message_link_previews_message_id_url_pk" PRIMARY KEY("message_id","url")
);
--> statement-breakpoint
ALTER TABLE "message_link_previews" ADD CONSTRAINT "message_link_previews_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_link_previews" ADD CONSTRAINT "message_link_previews_url_link_previews_url_fk" FOREIGN KEY ("url") REFERENCES "public"."link_previews"("url") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_message_link_previews_message_id" ON "message_link_previews" USING btree ("message_id");