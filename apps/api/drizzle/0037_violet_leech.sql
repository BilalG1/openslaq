CREATE TABLE "rate_limit_entries" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "active_huddles" (
	"channel_id" uuid PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"livekit_room" text NOT NULL,
	"message_id" uuid,
	"screen_share_user_id" text,
	"participant_history" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "huddle_participants" (
	"channel_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_camera_on" boolean DEFAULT false NOT NULL,
	"is_screen_sharing" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	CONSTRAINT "huddle_participants_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "presence_connections" (
	"user_id" text NOT NULL,
	"socket_id" text NOT NULL,
	"last_heartbeat" timestamp with time zone NOT NULL,
	CONSTRAINT "presence_connections_user_id_socket_id_pk" PRIMARY KEY("user_id","socket_id")
);
--> statement-breakpoint
ALTER TABLE "active_huddles" ADD CONSTRAINT "active_huddles_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "huddle_participants" ADD CONSTRAINT "huddle_participants_channel_id_active_huddles_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."active_huddles"("channel_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "huddle_participants" ADD CONSTRAINT "huddle_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_presence_user_id" ON "presence_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_channels_workspace_id" ON "channels" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_messages_user_id" ON "messages" USING btree ("user_id");