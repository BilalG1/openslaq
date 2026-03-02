CREATE TYPE "public"."channel_notify_level" AS ENUM('all', 'mentions', 'muted');--> statement-breakpoint
CREATE TABLE "channel_notification_prefs" (
	"user_id" text NOT NULL,
	"channel_id" uuid NOT NULL,
	"level" "channel_notify_level" NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_notification_prefs_user_id_channel_id_pk" PRIMARY KEY("user_id","channel_id")
);
--> statement-breakpoint
ALTER TABLE "channel_notification_prefs" ADD CONSTRAINT "channel_notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_notification_prefs" ADD CONSTRAINT "channel_notification_prefs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;