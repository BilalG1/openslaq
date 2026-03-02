CREATE TABLE "starred_channels" (
	"user_id" text NOT NULL,
	"channel_id" uuid NOT NULL,
	"starred_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "starred_channels_user_id_channel_id_pk" PRIMARY KEY("user_id","channel_id")
);
--> statement-breakpoint
ALTER TABLE "starred_channels" ADD CONSTRAINT "starred_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_channels" ADD CONSTRAINT "starred_channels_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;