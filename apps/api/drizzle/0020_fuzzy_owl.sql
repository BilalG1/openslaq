ALTER TABLE "channel_read_positions" DROP CONSTRAINT "channel_read_positions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "channel_read_positions" DROP CONSTRAINT "channel_read_positions_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "starred_channels" DROP CONSTRAINT "starred_channels_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "starred_channels" DROP CONSTRAINT "starred_channels_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "channel_notification_prefs" DROP CONSTRAINT "channel_notification_prefs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "channel_notification_prefs" DROP CONSTRAINT "channel_notification_prefs_channel_id_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "channel_read_positions" ADD CONSTRAINT "channel_read_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_read_positions" ADD CONSTRAINT "channel_read_positions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_channels" ADD CONSTRAINT "starred_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_channels" ADD CONSTRAINT "starred_channels_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_notification_prefs" ADD CONSTRAINT "channel_notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_notification_prefs" ADD CONSTRAINT "channel_notification_prefs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;