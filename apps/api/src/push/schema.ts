import { boolean, pgTable, text, timestamp, uuid, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "../users/schema";
import { channels } from "../channels/schema";

export const pushPlatformEnum = pgEnum("push_platform", ["ios"]);

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: pushPlatformEnum("platform").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_push_tokens_user_id").on(t.userId)],
);

export const pushQueue = pgTable(
  "push_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    workspaceSlug: text("workspace_slug").notNull(),
    deliverAfter: timestamp("deliver_after").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_push_queue_deliver_after").on(t.deliverAfter),
    index("idx_push_queue_user_channel").on(t.userId, t.channelId),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pushEnabled: boolean("push_enabled").default(true).notNull(),
  soundEnabled: boolean("sound_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
