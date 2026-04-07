import { pgTable, text, timestamp, uuid, boolean, primaryKey } from "drizzle-orm/pg-core";
import { channels } from "../channels/schema";
import { users } from "../users/schema";

export const activeHuddles = pgTable("active_huddles", {
  channelId: uuid("channel_id")
    .primaryKey()
    .references(() => channels.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  livekitRoom: text("livekit_room").notNull(),
  messageId: uuid("message_id"),
  screenShareUserId: text("screen_share_user_id"),
  callUuid: text("call_uuid"),
  participantHistory: text("participant_history").array().notNull().default([]),
});

export const huddleParticipants = pgTable(
  "huddle_participants",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => activeHuddles.channelId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isMuted: boolean("is_muted").notNull().default(false),
    isCameraOn: boolean("is_camera_on").notNull().default(false),
    isScreenSharing: boolean("is_screen_sharing").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.userId] })],
);
